/** URL segment for locale — same values as `Language` in `index.tsx`. */
export type LangSlug = 'en' | 'ru' | 'kk';

export const VALID_LANG_SLUGS: readonly LangSlug[] = ['en', 'ru', 'kk'];

export function isLangSlug(s: string): s is LangSlug {
  return (VALID_LANG_SLUGS as readonly string[]).includes(s);
}

/** `/en` + `/app/foo` → `/en/app/foo`; home → `/en` */
export function prefixWithLang(lang: LangSlug, path: string): string {
  const p = path === '' || path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `/${lang}${p}`;
}

export function getLanguageFromPathname(pathname: string): LangSlug | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  return isLangSlug(seg) ? seg : null;
}

/** Replace first path segment with `newLang` if it is a lang slug; otherwise prepend. */
export function swapLangInPathname(pathname: string, newLang: LangSlug): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && isLangSlug(parts[0])) {
    parts[0] = newLang;
  } else {
    parts.unshift(newLang);
  }
  return `/${parts.join('/')}`;
}
