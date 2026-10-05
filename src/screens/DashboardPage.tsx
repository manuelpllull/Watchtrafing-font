import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, Coins, Plus, TrendingUp, Watch } from 'lucide-react';
import { watchesApi } from '@/api/watches';
import { tradesApi } from '@/api/trades';
import { activityApi } from '@/api/activity';
import { useAuth } from '@/auth/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageError, getMessage } from '@/components/ui/ErrorBanner';
import { formatMoney, formatDate } from '@/lib/format';
import { WatchStatusBadge } from '@/components/ui/Badge';
import { TradeStatus, WatchStatus } from '@/api/types';

export default function DashboardPage() {
  const { session } = useAuth();

  const watches = useQuery({
    queryKey: ['myWatches'],
    queryFn: () => watchesApi.listMine(),
  });

  // Aggregate trades across the user's watches to surface pending incoming trades.
  const myWatches = watches.data?.watches ?? [];
  const tradesQueries = useQuery({
    queryKey: ['allMyTrades', myWatches.map((w) => w.id)],
    queryFn: async () => {
      const results = await Promise.all(
        myWatches.map((w) => tradesApi.getByWatch(w.id).catch(() => [])),
      );
      const all = results.flat();
      // Deduplicate by trade id.
      const seen = new Set<string>();
      return all.filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
    },
    enabled: !!myWatches.length,
  });

  const activity = useQuery({
    queryKey: ['myActivity'],
    queryFn: () => activityApi.mine(),
  });

  const pendingTrades = (tradesQueries.data ?? [])
    .filter((t) => t.status === TradeStatus.Pending)
    .slice(0, 5);

  const collectionValue = myWatches
    .filter((w) => w.status !== WatchStatus.Sold)
    .reduce((sum, w) => sum + (w.purchasePrice || 0), 0);
  const soldProfit = myWatches.reduce((sum, w) => sum + (w.profit || 0), 0);

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">{session?.email}</p>
        </div>
        <Link to="/watches/new" className="btn-primary">
          <Plus size={16} strokeWidth={2.5} />
          Add watch
        </Link>
      </header>

      <div className="stagger grid gap-4 sm:grid-cols-3">
        <StatCard label="Watches" value={String(myWatches.length)} loading={watches.isLoading} icon={Watch} />
        <StatCard label="Collection value" value={formatMoney(collectionValue)} loading={watches.isLoading} icon={TrendingUp} />
        <StatCard label="Recorded sales profit" value={formatMoney(soldProfit)} loading={watches.isLoading} icon={Coins} />
      </div>

      <section>
        <SectionHeader title="Pending trades" to="/trades" linkLabel="View all" />
        {tradesQueries.isLoading ? (
          <div className="card flex items-center gap-2 p-4 text-sm text-ink-soft"><Spinner /> Loading trades…</div>
        ) : tradesQueries.error ? (
          <PageError message={getMessage(tradesQueries.error)} />
        ) : pendingTrades.length === 0 ? (
          <EmptyState title="No pending trades" hint="Trades awaiting confirmation will appear here." />
        ) : (
          <ul className="stagger card divide-y divide-surface-line">
            {pendingTrades.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/trades/${t.id}`}
                  className="flex items-center gap-3 px-3 py-3 transition hover:bg-ink/10 sm:px-4"
                >
                  <span className="avatar h-8 w-8 shrink-0 bg-ink/10 text-ink-soft">
                    <Activity size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {t.buyerUserName ||
                        (t.buyerClientId ? `CRM client · ${t.buyerExternalName || 'client'}` : null) ||
                        t.buyerExternalName ||
                        'External buyer'}
                    </span>
                    <span className="block text-xs text-ink-faint">{formatDate(t.saleDate)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold">{formatMoney(t.salePrice)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader title="Recent watches" to="/watches" linkLabel="View collection" />
          {watches.isLoading ? (
            <div className="card p-4 text-sm text-ink-soft"><Spinner /> Loading…</div>
          ) : watches.error ? (
            <PageError message={getMessage(watches.error)} />
          ) : myWatches.length === 0 ? (
            <EmptyState title="No watches yet" hint="Add your first timepiece to start." action={<Link to="/watches/new" className="btn-primary">Add watch</Link>} />
          ) : (
            <ul className="stagger card divide-y divide-surface-line">
              {myWatches.slice(0, 5).map((w) => (
                <li key={w.id}>
<Link
                  to={`/watches/${w.id}`}
                  className="flex items-center gap-3 px-3 py-3 transition hover:bg-ink/10 sm:justify-between sm:px-4"
                >
                  <Watch size={22} strokeWidth={1.4} className="shrink-0 text-ink sm:hidden" />
                  <span className="min-w-0 flex-1 sm:flex-none">
                    <span className="block truncate text-sm font-medium">
                      {w.brand.name} {w.model}
                    </span>
                    <span className="block truncate text-xs text-ink-faint">
                      {w.referenceNumber || '—'} · {formatMoney(w.purchasePrice)}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-sm text-ink-soft sm:block">
                    {formatMoney(w.purchasePrice)}
                  </span>
                  <WatchStatusBadge status={w.status} />
                </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <SectionHeader title="Recent activity" />
          {activity.isLoading ? (
            <div className="card p-4 text-sm text-ink-soft"><Spinner /> Loading…</div>
          ) : activity.error ? (
            <PageError message={getMessage(activity.error)} />
          ) : (activity.data?.length ?? 0) === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ul className="stagger card divide-y divide-surface-line">
              {activity.data!.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                  <Watch size={22} strokeWidth={1.4} className="shrink-0 text-brand-500 sm:hidden" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{a.description}</p>
                    <p className="text-xs text-ink-faint">{formatDate(a.createdAt)}</p>
                  </div>
                  <span className="avatar hidden h-8 w-8 shrink-0 text-sm sm:flex">
                    {a.activityType.charAt(0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  to,
  linkLabel,
}: {
  title: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xl font-medium">{title}</h2>
      {to && linkLabel && (
        <Link to={to} className="text-sm font-medium text-brand-700 hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  icon: Icon,
}: {
  label: string;
  value: string;
  loading: boolean;
  icon: typeof Watch;
}) {
  return (
    <div className="card card-lift flex items-start justify-between p-4">
      <div>
        <p className="label mb-0">{label}</p>
        {loading ? (
          <p className="shimmer mt-2 h-7 w-24 rounded" />
        ) : (
          <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
        )}
      </div>
      <Icon size={40} strokeWidth={1.2} className="shrink-0 text-ink" />
    </div>
  );
}
