import { cn } from '@/lib/utils';
import { LANGUAGE_LABELS, type Language, useTranslation } from '@/i18n';

const LANGUAGES: Language[] = ['ru', 'kk', 'en'];

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, setLanguage, messages } = useTranslation();

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-[color:var(--line)] bg-white/80 p-1',
        className,
      )}
      aria-label={messages.common.language}
    >
      {LANGUAGES.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLanguage(item)}
          className={cn(
            'min-w-10 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors',
            language === item
              ? 'bg-[var(--blue-strong)] text-white'
              : 'text-[var(--ink-soft)] hover:bg-[rgba(31,79,156,0.08)] hover:text-[var(--ink)]',
          )}
        >
          {LANGUAGE_LABELS[item]}
        </button>
      ))}
    </div>
  );
}
