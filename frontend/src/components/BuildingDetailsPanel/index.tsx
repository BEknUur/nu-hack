import { Suspense, lazy } from 'react';
import type { SelectedBuilding } from '@/types/building';

const Building3DViewer = lazy(() => import('@/components/Building3DViewer'));

interface BuildingDetailsPanelProps {
  building: SelectedBuilding;
  onClose: () => void;
}

function formatArea(area: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(area);
}

function formatHeight(height: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(height);
}

export default function BuildingDetailsPanel({
  building,
  onClose,
}: BuildingDetailsPanelProps) {
  return (
    <aside className="absolute right-4 top-[168px] z-[1000] flex w-[min(360px,calc(100vw-32px))] flex-col gap-4 rounded-[28px] border border-white/10 bg-[rgba(8,12,28,0.92)] p-4 text-[#e8eaf6] shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[1.1px] text-white/45">
            Selected Building
          </div>
          <h2 className="mt-1 truncate text-[18px] font-semibold text-white">
            {building.label}
          </h2>
          <div className="mt-1 text-[12px] text-white/50">
            {building.id}
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close building panel"
          className="h-9 w-9 shrink-0 rounded-full border border-white/10 bg-white/[0.05] text-lg text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          ×
        </button>
      </div>

      <div className="relative h-[230px] overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_top,#16314d,transparent_58%),linear-gradient(180deg,#09101b_0%,#050812_100%)]">
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-white/[0.04]" />}>
          <Building3DViewer
            polygons={building.polygons}
            center={building.center}
            height={building.height}
          />
        </Suspense>
        <div className="pointer-events-none absolute inset-x-4 bottom-3 flex items-center justify-between rounded-full border border-white/10 bg-[rgba(4,8,16,0.55)] px-3 py-1.5 text-[10px] uppercase tracking-[0.8px] text-white/55 backdrop-blur-sm">
          <span>3D footprint</span>
          <span>drag to orbit</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.9px] text-white/40">Height</div>
          <div className="mt-1 text-[18px] font-semibold text-white">{formatHeight(building.height)} m</div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.9px] text-white/40">Footprint</div>
          <div className="mt-1 text-[18px] font-semibold text-white">{formatArea(building.area)} m²</div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.9px] text-white/40">Levels</div>
          <div className="mt-1 text-[18px] font-semibold text-white">
            {building.levels ?? '—'}
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.9px] text-white/40">Type</div>
          <div className="mt-1 truncate text-[18px] font-semibold capitalize text-white">
            {building.kind ?? 'building'}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-[12px] text-white/65">
        <div className="uppercase tracking-[0.9px] text-[10px] text-white/40">Center</div>
        <div className="mt-1 tabular-nums">
          {building.center.lat.toFixed(5)}, {building.center.lng.toFixed(5)}
        </div>
      </div>
    </aside>
  );
}
