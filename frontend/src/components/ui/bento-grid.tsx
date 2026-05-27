import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BentoItem {
  title: string;
  description: string;
  icon?: ReactNode;
  status?: string;
  tags?: string[];
  meta?: string;
  cta?: string;
  href?: string;
  colSpan?: 1 | 2 | 3;
  hasPersistentHover?: boolean;
}

interface BentoGridProps {
  items: BentoItem[];
  className?: string;
}

export function BentoGrid({ items, className }: BentoGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-3 items-stretch', className)}>
      {items.map((item, index) => {
        const card = (
          <div
            className={cn(
              'group relative h-full overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08] p-5 transition-all duration-200',
              'hover:bg-white/[0.045] hover:ring-white/[0.12]',
              item.hasPersistentHover && 'bg-white/[0.045] ring-white/[0.12]',
              item.colSpan === 2 && 'md:col-span-2',
              item.colSpan === 3 && 'md:col-span-3',
            )}
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#f0c24c]/10 blur-3xl" />
            </div>

            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[15px] font-semibold tracking-[-0.02em] text-white">
                      {item.title}
                    </div>
                    {item.status ? (
                      <span className="ui-mono rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/45 ring-1 ring-white/10">
                        {item.status}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-[12.5px] leading-[1.55] text-white/45">
                    {item.description}
                  </div>
                </div>

                {item.icon ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0c24c]/10 ring-1 ring-[#f0c24c]/20">
                    {item.icon}
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2">
                  {(item.tags && item.tags.length > 0) || item.meta ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {item.meta ? (
                        <span className="ui-mono text-[10px] text-white/35">
                          {item.meta}
                        </span>
                      ) : null}
                      {item.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="ui-mono rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/35 ring-1 ring-white/10"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {item.cta ? (
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[12px] font-medium text-white/60 ring-1 ring-white/10 transition-colors group-hover:bg-[#f0c24c]/12 group-hover:text-white">
                      {item.cta}
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                      </svg>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );

        if (!item.href) {
          return (
            <div key={`${item.title}-${index}`} className={cn('h-full', item.colSpan === 2 && 'md:col-span-2', item.colSpan === 3 && 'md:col-span-3')}>
              {card}
            </div>
          );
        }

        const isExternal = item.href.startsWith('http');
        return (
          <a
            key={`${item.title}-${index}`}
            href={item.href}
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className={cn(
              'block h-full',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f0c24c]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06080f]',
              item.colSpan === 2 && 'md:col-span-2',
              item.colSpan === 3 && 'md:col-span-3',
            )}
          >
            {card}
          </a>
        );
      })}
    </div>
  );
}
