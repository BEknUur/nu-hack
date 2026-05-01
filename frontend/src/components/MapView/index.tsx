import type React from 'react';

interface MapViewProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function MapView({ containerRef }: MapViewProps) {
  return <div ref={containerRef} className="w-full h-full" />;
}
