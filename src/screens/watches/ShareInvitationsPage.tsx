import { ShareInvitationsList } from '@/components/ShareInvitations';
import { useTranslation } from '@/i18n';

export default function ShareInvitationsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{t('invitations.title')}</h1>
        <p className="text-sm text-ink-soft">{t('invitations.pageSubtitle')}</p>
      </header>

      <ShareInvitationsList showHistory />
    </div>
  );
}