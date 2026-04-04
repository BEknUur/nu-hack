import { useLocation, useNavigate } from 'react-router-dom';
import type { Language } from '@/i18n';
import { useTranslation } from '@/i18n';
import { swapLangInPathname } from '@/i18n/langRoutes';
import { cn } from '@/lib/utils';

/** Cycle: EN → RU → KZ → EN … */
const ORDER: Language[] = ['en', 'ru', 'kk'];

/** ISO 3166-1 alpha-2 for https://flagcdn.com — avoids react-world-flags CJS default export issues in Vite prod builds. */
const FLAG_CODE: Record<Language, string> = {
  en: 'gb',
  ru: 'ru',
  kk: 'kz',
};

function nextLang(current: Language): Language {
  const i = ORDER.indexOf(current);
  return ORDER[(i + 1) % ORDER.length];
}

const LANG_LABEL: Record<Language, string> = {
  en: 'English',
  ru: 'Russian',
  kk: 'Kazakh',
};

export function NavbarFlagLanguages({ className }: { className?: string }) {
  const { language, setLanguage, messages } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  function handleClick() {
    const next = nextLang(language);
    setLanguage(next);
    navigate(swapLangInPathname(location.pathname, next), { replace: true });
  }

  const code = FLAG_CODE[language];
  const src = `https://flagcdn.com/w80/${code}.png`;

  return (
    <div className={cn('flex items-center pl-1.5 ml-1', className)}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full',
          'ring-1 ring-white/20 transition-[opacity,transform] hover:opacity-95 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--yellow)]',
        )}
        aria-label={`${messages.common.language}: ${LANG_LABEL[language]}. Click to switch.`}
      >
        <img
          src={src}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full rounded-full object-cover"
        />
      </button>
    </div>
  );
}
