import { Flower2 } from 'lucide-react';
import type { SolarWizardCopy } from '@/components/SolarFlowersWizard/copy';
import {
  ACCENT_BG,
  ACCENT_BORDER,
  ORANGE,
} from '@/components/SolarFlowersWizard/styles';

interface SolarWizardHeaderProps {
  copy: SolarWizardCopy;
  stepIndex: number;
}

export function SolarWizardHeader({
  copy,
  stepIndex,
}: SolarWizardHeaderProps) {
  return (
    <div
      className="relative px-5 pt-5 pb-4"
      style={{ background: 'linear-gradient(135deg, rgba(251,146,60,0.07), transparent 60%)' }}
    >
      <div
        className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.18), transparent 70%)' }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] text-white/25 uppercase tracking-[0.12em]">
            {copy.tag}
          </span>
          <h2 className="font-display text-[1.25rem] font-bold text-white tracking-[-0.04em] mt-0.5 leading-none">
            {copy.title}
          </h2>
          <p className="text-[11px] text-white/35 mt-1.5 leading-snug">{copy.subtitle}</p>
        </div>
        <div
          className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}` }}
        >
          <Flower2 className="h-5 w-5" style={{ color: ORANGE }} />
        </div>
      </div>

      <div className="mt-4 flex gap-1.5 items-center">
        {copy.steps.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col gap-1">
            <div
              className="h-0.5 rounded-full transition-all duration-500"
              style={{ background: i <= stepIndex ? ORANGE : 'rgba(255,255,255,0.1)' }}
            />
            <span
              className="text-[10px] font-mono transition-colors duration-300"
              style={{ color: i <= stepIndex ? 'rgba(251,146,60,0.7)' : 'rgba(255,255,255,0.2)' }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
