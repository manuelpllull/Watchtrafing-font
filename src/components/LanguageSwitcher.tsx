import { useId } from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '@/lib/language';

/**
 * Language picker. Two layouts: the compact one shown in the header (icon +
 * dropdown) and a full-width row that fits inside the mobile nav drawer.
 */
export function LanguageSwitcher({ variant = 'compact' }: { variant?: 'compact' | 'full' }) {
  const { language, setLanguage, t } = useTranslation();
  const id = useId();

  if (variant === 'full') {
    return (
      <div className="px-3 py-2 font-display text-[15px] font-medium text-ink">
        <label htmlFor={id} className="mb-1 flex items-center gap-2 text-ink-soft">
          <Languages size={15} className="text-ink-faint" aria-hidden />
          {t('common.language')}
        </label>
        <select
          id={id}
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="block w-full rounded-lg border border-surface-line bg-surface-field px-3 py-2 text-[15px] text-ink outline-none focus:border-brand-400"
        >
          {LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_LABELS[code]}
            </option>
          ))}
        </select>
      </div>
    );
  }

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