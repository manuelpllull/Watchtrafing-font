import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-ink-faint">404</p>
      <p className="mt-2 text-lg font-semibold">{t('notFound.title')}</p>
      <p className="mt-1 text-sm text-ink-soft">{t('notFound.hint')}</p>
      <Link to="/" className="btn-primary mt-6">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
