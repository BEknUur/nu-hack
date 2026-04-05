import type { SolarWizardCopy } from '@/components/SolarFlowersWizard/copy';

interface SolarWizardHeaderProps {
  copy: SolarWizardCopy;
  stepIndex: number;
}

export function SolarWizardHeader({
  copy,
  stepIndex,
}: SolarWizardHeaderProps) {
  return (
    <div className="px-3 pt-3 pb-2">
      <div>
        <h2 className="text-base font-semibold text-[var(--ink)] tracking-[-0.02em]">
          {copy.title}
        </h2>
        <p className="text-[11px] text-[var(--ink-soft)] mt-0.5 leading-snug">{copy.subtitle}</p>
      </div>

      <div className="mt-3 flex gap-1.5 items-center">
        {copy.steps.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col gap-1">
            <div
              className="h-0.5 rounded-full transition-all duration-500"
              style={{ background: i <= stepIndex ? 'var(--yellow)' : 'var(--line)' }}
            />
            <span
              className="text-[10px] font-mono transition-colors duration-300"
              style={{ color: i <= stepIndex ? 'var(--yellow-strong)' : 'var(--ink-soft)' }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
