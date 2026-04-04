import { Link } from 'react-router-dom';
import { NavbarFlagLanguages } from '@/components/NavbarFlagLanguages';
import { useLangPath, useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

export type ScenarioNavCase = 'apartments' | 'trees' | 'workers';

interface ScenarioModeNavBarProps {
  active: ScenarioNavCase;
  className?: string;
}

export function ScenarioModeNavBar({ active, className }: ScenarioModeNavBarProps) {
  const langPath = useLangPath();
  const { messages } = useTranslation();
  const nav = messages.landingV2.nav;

  const links: { caseId: ScenarioNavCase; label: string }[] = [
    { caseId: 'apartments', label: nav.apartments },
    { caseId: 'trees', label: nav.trees },
    { caseId: 'workers', label: nav.workers },
  ];

  return (
    <nav className={cn('hidden md:flex items-center gap-2', className)}>
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
        <NavbarFlagLanguages />
      </div>
    </nav>
  );
}
