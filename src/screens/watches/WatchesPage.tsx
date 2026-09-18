import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { watchesApi } from '@/api/watches';
import { useAuth } from '@/auth/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageError, getMessage } from '@/components/ui/ErrorBanner';
import { WatchStatusBadge } from '@/components/ui/Badge';
import { formatMoney } from '@/lib/format';
import { WatchStatus } from '@/api/types';

const STATUS_FILTERS: { value: 'all' | WatchStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: WatchStatus.OwnedOnly, label: 'Owned' },
  { value: WatchStatus.ForSale, label: 'For sale' },
  { value: WatchStatus.Sold, label: 'Sold' },
];

export default function WatchesPage() {
  const { session } = useAuth();
  const [filter, setFilter] = useState<'all' | WatchStatus>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['myWatches'],
    queryFn: () => watchesApi.listMine(),
  });

  const watches = (data?.watches ?? []).filter(
    (w) => filter === 'all' || w.status === filter,
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Collection</h1>
          <p className="text-sm text-ink-soft">{session?.email}</p>
        </div>
        <Link to="/watches/new" className="btn-primary">+ Add watch</Link>
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              filter === f.value
                ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                : 'border-surface-line bg-surface-field text-ink-soft hover:bg-ink/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card flex items-center gap-2 p-6 text-ink-soft"><Spinner /> Loading…</div>
      ) : error ? (
        <PageError message={getMessage(error)} />
      ) : watches.length === 0 ? (
        <EmptyState
          title="No watches here"
          hint="Add your first timepiece to start tracking it."
          action={<Link to="/watches/new" className="btn-primary">+ Add watch</Link>}
        />
      ) : (
        <ul className="stagger grid gap-3 sm:grid-cols-2">
          {watches.map((w) => (
            <li key={w.id}>
              <Link
                to={`/watches/${w.id}`}
                className="card card-lift block p-4 hover:border-brand-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{w.brand.name} {w.model}</p>
                    <p className="text-xs text-ink-faint">{w.referenceNumber || 'No reference'}</p>
                  </div>
                  <WatchStatusBadge status={w.status} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-ink-faint">Purchased</dt>
                    <dd className="font-medium">{formatMoney(w.purchasePrice)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-faint">Sold</dt>
                    <dd className="font-medium">{formatMoney(w.salePrice)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-faint">Profit</dt>
                    <dd className="font-medium">{formatMoney(w.profit)}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
