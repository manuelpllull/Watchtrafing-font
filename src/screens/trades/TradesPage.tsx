import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { watchesApi } from '@/api/watches';
import { tradesApi } from '@/api/trades';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageError, getMessage } from '@/components/ui/ErrorBanner';
import { TradeStatusBadge } from '@/components/ui/Badge';
import { formatDate, formatMoney } from '@/lib/format';
import { TradeStatus } from '@/api/types';
import { useTranslation } from '@/i18n';

type Tab = 'incoming' | 'mine' | 'all';

const TABS: { value: Tab; label: string }[] = [
  { value: 'incoming', label: 'Pending for me' },
  { value: 'mine', label: 'My recorded' },
  { value: 'all', label: 'All' },
];

export default function TradesPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('incoming');

  const watches = useQuery({
    queryKey: ['myWatches'],
    queryFn: () => watchesApi.listMine(),
  });

  const watchIds = watches.data?.watches.map((w) => w.id) ?? [];

  const allTrades = useQuery({
    queryKey: ['allMyTrades', watchIds],
    queryFn: async () => {
      const results = await Promise.all(
        watchIds.map((id) => tradesApi.getByWatch(id).catch(() => [] as never[])),
      );
      const all = results.flat() as Awaited<ReturnType<typeof tradesApi.getByWatch>>;
      const seen = new Set<string>();
      return all.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
    },
    enabled: watchIds.length > 0,
  });

  const trades = useMemo(() => {
    const list = allTrades.data ?? [];
    if (tab === 'incoming') {
      return list.filter((t) => t.status === TradeStatus.Pending && t.buyerUserId);
    }
    if (tab === 'mine') {
      return list.filter((t) => t.status !== TradeStatus.Cancelled);
    }
    return list;
  }, [allTrades.data, tab]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{t('trades.title')}</h1>
        <p className="text-sm text-ink-soft">
          Confirm incoming trades and track your recorded sales.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              tab === t.value
                ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                : 'border-surface-line bg-surface-field text-ink-soft hover:bg-ink/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {watches.isLoading || allTrades.isLoading ? (
        <div className="card flex items-center gap-2 p-6 text-ink-soft"><Spinner /> Loading trades…</div>
      ) : allTrades.error ? (
        <PageError message={getMessage(allTrades.error)} />
      ) : trades.length === 0 ? (
        <EmptyState
          title={t('trades.empty')}
          hint={t('trades.emptyHint')}
        />
      ) : (
        <ul className="stagger card divide-y divide-surface-line">
          {trades.map((t) => (
            <li key={t.id}>
              <Link to={`/trades/${t.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-ink/10">
                <div>
                  <p className="text-sm font-medium">
                    {t.buyerUserName || (t.buyerClientId ? `CRM client · ${t.buyerExternalName || 'client'}` : null) || t.buyerExternalName || 'External buyer'}
                  </p>
                  <p className="text-xs text-ink-faint">{formatDate(t.saleDate)} · {formatDate(t.createdAt)}</p>
                </div>
                <span className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{formatMoney(t.salePrice)}</span>
                  <TradeStatusBadge status={t.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
