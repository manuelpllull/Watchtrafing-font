import { Languages } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '@/lib/language';

/** Compact language picker shown in the top bar. */
export function LanguageSwitcher() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <label className="flex items-center gap-1.5 text-sm" title={t('common.language')}>
      <Languages size={17} className="text-ink-faint" aria-hidden />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        aria-label={t('common.language')}
        className="rounded-lg border border-surface-line bg-surface-header px-2 py-1 text-sm text-ink outline-none focus:border-brand-400"
      >
        {LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}