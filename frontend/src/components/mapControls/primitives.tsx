import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T> {
  label: string;
  value: T;
}

interface SegmentedOptionGroupProps<T> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  columnsClassName?: string;
  buttonClassName?: string;
  activeClassName?: string;
  disabled?: boolean;
}

export function SegmentedOptionGroup<T extends string | number | boolean>({
  value,
  onChange,
  options,
  columnsClassName = 'grid grid-cols-2 gap-2',
  buttonClassName,
  activeClassName = 'is-active',
  disabled = false,
}: SegmentedOptionGroupProps<T>) {
  return (
    <div className={columnsClassName}>
      {options.map((option) => (
        <button
          key={`${String(option.value)}-${option.label}`}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={cn(
            'map-segment rounded-md px-2.5 py-1.5 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-60',
            value === option.value && activeClassName,
            buttonClassName,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export interface PanelSectionProps {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
}

export function PanelSection({
  icon,
  title,
  children,
}: PanelSectionProps) {
  return (
    <section className="space-y-2 border-t border-[color:var(--line)] pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--ink)]">
        {icon != null && (
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[color:rgba(198,138,17,0.24)] bg-white/80 text-[var(--yellow-strong)]">
            {icon}
          </span>
        )}
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}
