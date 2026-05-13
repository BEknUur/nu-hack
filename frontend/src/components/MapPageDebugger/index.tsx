import { useState, type ReactNode } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';

export interface MapPageDebugItem {
  label: string;
  value: ReactNode;
}

export interface MapPageDebugSection {
  id: string;
  title: string;
  items: MapPageDebugItem[];
}

interface MapPageDebuggerProps {
  sections: MapPageDebugSection[];
}

function DebugValue({ value }: { value: ReactNode }) {
  if (typeof value === 'boolean') {
    return <span>{value ? 'true' : 'false'}</span>;
  }
  if (value == null || value === '') {
    return <span className="text-[var(--ink-soft)]">-</span>;
  }
  return <>{value}</>;
}

export default function MapPageDebugger({ sections }: MapPageDebuggerProps) {
  const [open, setOpen] = useState(false);
  const visibleSections = sections.filter((section) => section.items.length > 0);

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[1100] flex max-w-[calc(100vw-2rem)] flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.92)] px-3 py-2 text-xs font-medium text-[var(--ink)] shadow-[0_12px_30px_rgba(23,32,51,0.18)] backdrop-blur-md"
      >
        <Bug className="h-4 w-4 text-[var(--blue-strong)]" />
        Debug
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {open && (
        <div className="pointer-events-auto max-h-[70vh] w-[360px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-[color:var(--line)] bg-[rgba(251,248,241,0.96)] p-3 shadow-[0_20px_50px_rgba(23,32,51,0.22)] backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="ui-mono text-[10px] text-[var(--ink-soft)]">MapPage debugger</div>
              <div className="text-sm font-semibold tracking-[-0.03em] text-[var(--ink)]">Feature state breakdown</div>
            </div>
          </div>

          <div className="space-y-3">
            {visibleSections.map((section) => (
              <section
                key={section.id}
                className="rounded-xl border border-[color:var(--line)] bg-white/85 p-3"
              >
                <div className="ui-mono text-[10px] text-[var(--blue-strong)]">{section.title}</div>
                <div className="mt-2 grid gap-2">
                  {section.items.map((item) => (
                    <div key={`${section.id}-${item.label}`} className="grid grid-cols-[96px_1fr] gap-2 text-[11px]">
                      <div className="ui-mono text-[var(--ink-soft)]">{item.label}</div>
                      <div className="break-words font-medium text-[var(--ink)]">
                        <DebugValue value={item.value} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
