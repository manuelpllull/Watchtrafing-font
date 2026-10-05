import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en, type Catalog, type TranslationKey } from './en';
import { es } from './es';
import { ca } from './ca';
import {
  applyLanguage,
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  storeLanguage,
  type Language,
} from '@/lib/language';

const CATALOGS: Record<Language, Catalog> = { en, es, ca };

type InterpolationValues = Record<string, string | number>;
type RichValues = Record<string, string | number | ReactNode>;

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  /** Translates to a plain string. */
  t: (key: TranslationKey, values?: InterpolationValues) => string;
  /** Translates to nodes, so a placeholder can be a React element (e.g. a link). */
  rt: (key: TranslationKey, values?: RichValues) => ReactNode;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function lookup(key: TranslationKey, language: Language): string {
  return CATALOGS[language][key] ?? CATALOGS[DEFAULT_LANGUAGE][key] ?? key;
}

const PLACEHOLDER = /\{(\w+)\}/g;

function interpolate(template: string, values?: InterpolationValues): string {
  if (!values) return template;

  return template.replace(PLACEHOLDER, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** Same as t(), but keeps React nodes (links, bold) intact. */
function interpolateNodes(template: string, values?: RichValues): ReactNode {
  if (!values) return template;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match = PLACEHOLDER.exec(template);

  while (match) {
    if (match.index > lastIndex) parts.push(template.slice(lastIndex, match.index));

    const value = values[match[1]];
    parts.push(value === undefined ? match[0] : value);

    lastIndex = match.index + match[0].length;
    match = PLACEHOLDER.exec(template);
  }
  PLACEHOLDER.lastIndex = 0;

  if (lastIndex < template.length) parts.push(template.slice(lastIndex));

  return parts;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    storeLanguage(next);
    setLanguageState(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: InterpolationValues) =>
      interpolate(lookup(key, language), values),
    [language],
  );

  const rt = useCallback(
    (key: TranslationKey, values?: RichValues) => interpolateNodes(lookup(key, language), values),
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t, rt }),
    [language, setLanguage, t, rt],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useTranslation must be used inside <I18nProvider>.');
  }

  return context;
}