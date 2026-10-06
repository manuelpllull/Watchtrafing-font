import type { ActivityResponse } from '@/api/types';
import { useTranslation } from '@/i18n';

/**
 * Renders an activity entry in the current language. Entries written before
 * structured data existed have no key, so they fall back to the stored text.
 */
export function useActivityText() {
  const { t } = useTranslation();

  return (entry: ActivityResponse): string => {
    if (!entry.key) return entry.description;

    return t(`activity.${entry.key}` as never, entry.args);
  };
}
