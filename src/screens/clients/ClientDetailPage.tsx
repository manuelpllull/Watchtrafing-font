import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/api/clients';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { TradeStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { PageError, getMessage } from '@/components/ui/ErrorBanner';
import { formatDate, formatMoney } from '@/lib/format';
import { useTranslation } from '@/i18n';

export default function ClientDetailPage() {
  const { t } = useTranslation();
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { notify } = useToast();
  const { confirm, dialog } = useConfirm();
  const client = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.getById(clientId!),
    enabled: !!clientId,
  });
  const remove = useMutation({ mutationFn: () => clientsApi.remove(clientId!) });

  const deleteClient = async () => {
    const ok = await confirm({
      title: 'Delete client?',
      message: 'The CRM record will be deleted, but recorded trades will keep the client name snapshot.',
      confirmLabel: 'Delete client',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync();
      await qc.invalidateQueries({ queryKey: ['clients'] });
      notify(t('clients.deleted'), 'success');
      navigate('/clients');
    } catch (err) {
      notify(getMessage(err), 'error');
    }
  };

  if (client.isLoading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  if (client.error) return <PageError message={getMessage(client.error)} />;
  if (!client.data) return null;

  const c = client.data;
  const contact = [c.address, [c.postalCode, c.city].filter(Boolean).join(' '), c.country].filter(Boolean).join(', ');
  const links = [
    ['Wallapop', c.wallapopProfileLink],
    ['Vinted', c.vintedProfileLink],
    ['Chrono24', c.chrono24ProfileLink],
  ] as const;

  return (
    <div className="space-y-5">
      <nav className="text-sm text-ink-soft">
        <Link to="/clients" className="hover:underline">{t('clients.title')}</Link> / <span className="text-ink">{c.name}</span>
      </nav>
      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{c.name}</h1>
            <p className="mt-1 text-sm text-ink-soft">Added {formatDate(c.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/clients/${c.id}/edit`} className="btn-secondary">{t('common.edit')}</Link>
            <button type="button" className="btn-ghost text-red-600 dark:text-red-400" onClick={deleteClient} disabled={remove.isPending}>{remove.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Info label={t('clients.phone')} value={c.phoneNumber} />
          <Info label={t('common.email')} value={c.email} />
          <Info label={t('clients.address')} value={contact || null} />
          <Info label={t('clients.linkedUser')} value={c.linkedUserName ? `@${c.linkedUserName}` : t('clients.noLinkedUser')} />
        </div>

        {links.some(([, url]) => !!url) && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-surface-line pt-4">
            {links.map(([label, url]) => url ? (
              <a key={label} className="btn-secondary" href={url} target="_blank" rel="noreferrer">{label} ↗</a>
            ) : null)}
          </div>
        )}
      </header>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('clients.recordedTrades')}</h2>
          <span className="text-sm text-ink-soft">{c.trades.length} total</span>
        </div>
        {c.trades.length === 0 ? (
          <EmptyState title={t('clients.noTrades')} hint={t('clients.recordedTradesHint')} />
        ) : (
          <ul className="card divide-y divide-surface-line">
            {c.trades.map((trade) => (
              <li key={trade.id}>
                <Link to={`/trades/${trade.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-ink/10">
                  <div>
                    <p className="text-sm font-medium">{trade.watchBrand} {trade.watchModel}</p>
                    <p className="text-xs text-ink-faint">{formatDate(trade.saleDate)} · created {formatDate(trade.createdAt)}</p>
                  </div>
                  <span className="flex items-center gap-3"><span className="text-sm font-semibold">{formatMoney(trade.salePrice)}</span><TradeStatusBadge status={trade.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {dialog}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value || '—'}</dd>
    </div>
  );
}
