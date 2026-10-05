export const LANGUAGES = ['en', 'es', 'ca'] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';

const STORAGE_KEY = 'wt-language';

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  ca: 'Català',
};

/** Native names, used in the switcher so each option is readable to its own speakers. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  ca: 'Català',
};

export function isLanguage(value: string | null | undefined): value is Language {
  return !!value && (LANGUAGES as readonly string[]).includes(value);
}

/** BCP-47 tags, sent as Accept-Language so the API can localize its responses. */
const HTTP_TAGS: Record<Language, string> = {
  en: 'en-GB',
  es: 'es-ES',
  ca: 'ca-ES',
};

export function httpLanguageTag(language: Language): string {
  return HTTP_TAGS[language];
}

/**
 * The stored choice, otherwise the browser's preference when it matches a
 * language we ship, otherwise English.
 */
export function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    /* private mode */
  }

  for (const candidate of navigator.languages ?? [navigator.language]) {
    const base = candidate?.slice(0, 2).toLowerCase();
    if (isLanguage(base)) return base;
  }

  return DEFAULT_LANGUAGE;
}

export function storeLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    /* private mode */
  }
  applyLanguage(language);
}

/** Keeps <html lang> accurate for screen readers, hyphenation and translation tools. */
export function applyLanguage(language: Language) {
  document.documentElement.lang = language;
}