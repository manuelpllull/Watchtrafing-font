import { Link } from 'react-router-dom';
import type { MyShareInvitation } from '@/api/types';
import { useShareInvitations } from '@/components/useShareInvitations';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageError, getMessage } from '@/components/ui/ErrorBanner';
import { Spinner } from '@/components/ui/Spinner';
import { ShareBadge } from '@/components/ui/Badge';
import { formatMoney, formatPercent, formatDate } from '@/lib/format';
import { useTranslation } from '@/i18n';

function InvitationTerms({ invitation }: { invitation: MyShareInvitation }) {
  const { t } = useTranslation();

  return (
    <p className="mt-1 text-xs text-ink-faint">
      {invitation.isConsignment
        ? t('invitations.consignmentTerms', {
            profit: formatPercent(invitation.profitPercentage),
          })
        : t('invitations.shareTerms', {
            ownership: formatPercent(invitation.ownershipPercentage),
            profit: formatPercent(invitation.profitPercentage),
            money: formatMoney(invitation.stake),
          })}
    </p>
  );
}

/**
 * The list of invitations. `showHistory` adds already-accepted/declined rows,
 * which the dashboard does not need.
 */
export function ShareInvitationsList({ showHistory = false }: { showHistory?: boolean }) {
  const { t, rt } = useTranslation();
  const { pending, resolved, resolve, isLoading, error } = useShareInvitations();

  if (isLoading) {
    return (
      <div className="card flex items-center gap-2 p-4 text-sm text-ink-soft">
        <Spinner /> Loading…
      </div>
    );
  }

  if (error) {
    return <PageError message={getMessage(error)} />;
  }

  return (
    <div className="space-y-6">
      {pending.length === 0 ? (
        <EmptyState title={t('invitations.pendingEmpty')} hint={t('invitations.pendingEmptyHint')} />
      ) : (
        <ul className="card divide-y divide-surface-line">
          {pending.map((invitation) => (
            <li key={invitation.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {rt('invitations.invitedYou', {
                      inviter: invitation.inviterUserName,
                      watch: (
                        <Link
                          key="watch"
                          to={`/watches/${invitation.watchId}`}
                          className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                        >
                          {invitation.watchLabel}
                        </Link>
                      ),
                    })}
                  </p>
                  <InvitationTerms invitation={invitation} />
                  <p className="mt-1 text-xs text-ink-faint">
                    {t('invitations.invitedOn', { date: formatDate(invitation.createdAt) })}
                    {invitation.referenceNumber
                      ? ` · ${t('invitations.ref', { ref: invitation.referenceNumber })}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => resolve.mutate({ id: invitation.id, accept: false })}
                    disabled={resolve.isPending}
                  >
                    {t('invitations.decline')}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => resolve.mutate({ id: invitation.id, accept: true })}
                    disabled={resolve.isPending}
                  >
                    {t('invitations.accept')}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showHistory && resolved.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t('invitations.resolved')}</h2>
          <ul className="card divide-y divide-surface-line">
            {resolved.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    <Link to={`/watches/${invitation.watchId}`} className="hover:underline">
                      {invitation.watchLabel}
                    </Link>
                    <span className="text-ink-faint"> · @{invitation.inviterUserName}</span>
                  </p>
                  <InvitationTerms invitation={invitation} />
                </div>
                <ShareBadge status={invitation.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}