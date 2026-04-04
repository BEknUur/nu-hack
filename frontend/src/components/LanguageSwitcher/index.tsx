import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LANGUAGE_LABELS, type Language, useTranslation } from '@/i18n';
import { swapLangInPathname } from '@/i18n/langRoutes';

const LANGUAGES: Language[] = ['ru', 'kk', 'en'];

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, setLanguage, messages } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  function switchLanguage(next: Language) {
    setLanguage(next);
    navigate(swapLangInPathname(location.pathname, next), { replace: true });
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-[color:var(--line)] bg-transparent p-0.5',
        className,
      )}
      aria-label={messages.common.language}
    >
      {LANGUAGES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => switchLanguage(item)}
          className={cn(
            'min-w-9 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
            language === item
              ? 'bg-[var(--yellow)] text-[#06080f]'
              : 'text-[var(--ink-soft)] hover:bg-[rgba(240,194,76,0.15)] hover:text-[var(--ink)]',
          )}
        >
          {LANGUAGE_LABELS[item]}
        </button>
      ))}
    </div>
  );
}
