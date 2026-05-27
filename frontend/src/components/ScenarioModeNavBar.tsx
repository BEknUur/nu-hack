import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Send } from 'lucide-react';
import { NavbarFlagLanguages } from '@/components/NavbarFlagLanguages';
import { useLangPath, useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

export type ScenarioNavCase = 'apartments' | 'trees' | 'workers' | 'solar-flowers';

interface ScenarioModeNavBarProps {
  active: ScenarioNavCase;
  className?: string;
}

export function ScenarioModeNavBar({ active, className }: ScenarioModeNavBarProps) {
  const langPath = useLangPath();
  const location = useLocation();
  const { messages } = useTranslation();
  const nav = messages.landingV2.nav;
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileWrapRef = useRef<HTMLDivElement>(null);

  const links: { caseId: ScenarioNavCase; label: string }[] = [
    { caseId: 'apartments', label: nav.apartments },
    { caseId: 'trees', label: nav.trees },
    { caseId: 'workers', label: nav.workers },
    { caseId: 'solar-flowers', label: nav.solar ?? 'Solar' },
  ];

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (mobileWrapRef.current && !mobileWrapRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  const mobileLinkBase =
    'block rounded-xl px-4 py-3 text-sm font-medium transition-colors';

  return (
    <>
      <nav className={cn('hidden items-center gap-2 md:flex', className)}>
        <div className="flex items-center gap-1 rounded-full bg-white/5 px-4 py-1 ring-1 ring-white/10 backdrop-blur-md">
          <Link
            to={langPath('/')}
            className="min-w-[5.75rem] px-3 py-2 text-center text-sm font-medium text-white/65 transition-colors hover:text-white"
          >
            {nav.home}
          </Link>
          {links.map(({ caseId, label }) => (
            <Link
              key={caseId}
              to={langPath(`/app/${caseId}`)}
              className={`min-w-[5.75rem] px-3 py-2 text-center text-sm font-medium transition-colors hover:text-white ${
                active === caseId ? 'text-white' : 'text-white/65'
              }`}
            >
              {label}
            </Link>
          ))}
          <a
            href="https://t.me/alem_aiI_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/45 hover:text-[#f0c24c] hover:bg-white/5 transition-colors"
            title="Sun Advisor — Telegram Bot"
          >
            <Send className="h-3.5 w-3.5" />
          </a>
          <NavbarFlagLanguages />
        </div>
      </nav>

      <div ref={mobileWrapRef} className={cn('relative md:hidden', className)}>
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/15 backdrop-blur-md text-white/80 hover:text-white transition-colors"
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? messages.common.close : 'Menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
        </button>

        {mobileOpen && (
          <div className="absolute right-0 top-12 z-[1100] w-[min(calc(100vw-2rem),280px)] rounded-2xl bg-[#0d1117]/95 ring-1 ring-white/10 backdrop-blur-xl p-2 shadow-xl">
            <Link
              to={langPath('/')}
              className={cn(mobileLinkBase, 'text-white/70 hover:bg-white/5 hover:text-white')}
              onClick={() => setMobileOpen(false)}
            >
              {nav.home}
            </Link>
            {links
              .filter(({ caseId }) => caseId !== 'trees' && caseId !== 'workers')
              .map(({ caseId, label }) => (
                <Link
                  key={caseId}
                  to={langPath(`/app/${caseId}`)}
                  className={cn(
                    mobileLinkBase,
                    active === caseId ? 'text-white bg-white/10' : 'text-white/70 hover:bg-white/5 hover:text-white',
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
            <div className="flex justify-center border-t border-white/5 px-2 py-3">
              <NavbarFlagLanguages className="pl-0 ml-0" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
