import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { BuildingPolygon } from '@/types/building';

interface Building3DViewerProps {
  polygons: BuildingPolygon[];
  center: {
    lat: number;
    lng: number;
  };
  height: number;
}

function toLocalPoint(
  point: [number, number],
  center: { lat: number; lng: number },
): THREE.Vector2 {
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = 111_320 * Math.cos((center.lat * Math.PI) / 180);

  return new THREE.Vector2(
    (point[0] - center.lng) * metersPerDegreeLng,
    (point[1] - center.lat) * metersPerDegreeLat,
  );
}

function createShape(
  polygon: BuildingPolygon,
  center: { lat: number; lng: number },
): THREE.Shape | null {
  if (polygon.outer.length < 4) return null;

  const outerPoints = polygon.outer.map((point) => toLocalPoint(point, center));
  const shape = new THREE.Shape(outerPoints);

  polygon.holes.forEach((hole) => {
    if (hole.length < 4) return;
    const path = new THREE.Path(hole.map((point) => toLocalPoint(point, center)));
    shape.holes.push(path);
  });

  return shape;
}

export default function Building3DViewer({
  polygons,
  center,
  height,
}: Building3DViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !polygons.length) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07111f');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 20;
    controls.maxDistance = 2000;
    controls.target.set(0, Math.max(height * 0.4, 8), 0);

    const ambient = new THREE.HemisphereLight('#dbeafe', '#0f172a', 1.6);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight('#fff7ed', 1.8);
    keyLight.position.set(180, 260, 120);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#60a5fa', 0.8);
    rimLight.position.set(-160, 120, -160);
    scene.add(rimLight);

    const buildingGroup = new THREE.Group();
    const fillMaterial = new THREE.MeshStandardMaterial({
      color: '#f59e0b',
      roughness: 0.38,
      metalness: 0.08,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: '#fde68a',
      transparent: true,
      opacity: 0.9,
    });

    polygons.forEach((polygon) => {
      const shape = createShape(polygon, center);
      if (!shape) return;

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: Math.max(height, 3),
        bevelEnabled: false,
      });
      geometry.rotateX(-Math.PI / 2);
      geometry.computeVertexNormals();

      const mesh = new THREE.Mesh(geometry, fillMaterial);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial);
      buildingGroup.add(mesh);
      buildingGroup.add(edges);
    });

    const initialBox = new THREE.Box3().setFromObject(buildingGroup);
    const initialCenter = initialBox.getCenter(new THREE.Vector3());
    buildingGroup.position.set(-initialCenter.x, -initialBox.min.y, -initialCenter.z);
    scene.add(buildingGroup);

    const fittedBox = new THREE.Box3().setFromObject(buildingGroup);
    const fittedSize = fittedBox.getSize(new THREE.Vector3());
    const span = Math.max(fittedSize.x, fittedSize.y, fittedSize.z, 24);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(span * 0.95, 64),
      new THREE.MeshStandardMaterial({
        color: '#0f1d35',
        roughness: 0.95,
        metalness: 0,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.4;
    scene.add(ground);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(span * 0.95, span, 64),
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.38;
    scene.add(ring);

    const resize = () => {
      const width = container.clientWidth || 1;
      const heightPx = container.clientHeight || 1;
      renderer.setSize(width, heightPx);
      camera.aspect = width / heightPx;
      camera.updateProjectionMatrix();
    };

    resize();

    camera.position.set(span * 1.55, Math.max(fittedSize.y * 1.1, 26), span * 1.45);
    controls.target.set(0, Math.max(fittedSize.y * 0.45, 8), 0);
    controls.update();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let frameId = 0;
    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      scene.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = Array.isArray(object.material) ? object.material : [object.material];
          material.forEach((item: THREE.Material) => item.dispose());
        }
        if (object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const material = Array.isArray(object.material) ? object.material : [object.material];
          material.forEach((item: THREE.Material) => item.dispose());
        }
      });
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [center, height, polygons]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden rounded-[20px]" />;
}
