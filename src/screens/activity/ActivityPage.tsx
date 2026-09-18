import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityApi, type ActivityQuery } from '@/api/activity';
import { useAuth } from '@/auth/AuthContext';
import { Field, Input } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { PageError, getMessage } from '@/components/ui/ErrorBanner';
import { formatDateTime } from '@/lib/format';

export default function ActivityPage() {
  const { session } = useAuth();
  const isAdmin = session?.role === 'Admin';
  const [global, setGlobal] = useState(false);
  const [filters, setFilters] = useState({ userId: '', entityId: '', from: '', to: '' });

  const query = useQuery({
    queryKey: ['activity', global, filters],
    queryFn: () => {
      if (!global || !isAdmin) return activityApi.mine();
      const q: ActivityQuery = {
        userId: filters.userId.trim() || undefined,
        entityId: filters.entityId.trim() || undefined,
        from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
        to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
      };
      return activityApi.all(q);
    },
  });

  const set = (key: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((current) => ({ ...current, [key]: e.target.value }));
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Activity</h1>
          <p className="text-sm text-ink-soft">A timeline of domain events affecting your account.</p>
        </div>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={global} onChange={(e) => setGlobal(e.target.checked)} />
            Admin global view
          </label>
        )}
      </header>

      {global && isAdmin && (
        <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="User ID" htmlFor="activity-user"><Input id="activity-user" value={filters.userId} onChange={set('userId')} placeholder="UUID" /></Field>
          <Field label="Entity ID" htmlFor="activity-entity"><Input id="activity-entity" value={filters.entityId} onChange={set('entityId')} placeholder="UUID" /></Field>
          <Field label="From" htmlFor="activity-from"><Input id="activity-from" type="date" value={filters.from} onChange={set('from')} /></Field>
          <Field label="To" htmlFor="activity-to"><Input id="activity-to" type="date" value={filters.to} onChange={set('to')} /></Field>
        </div>
      )}

      {query.isLoading ? (
        <div className="card flex items-center gap-2 p-6 text-sm text-ink-soft"><Spinner /> Loading activity…</div>
      ) : query.error ? (
        <PageError message={getMessage(query.error)} />
      ) : (query.data?.length ?? 0) === 0 ? (
        <EmptyState title="No activity" hint="Domain events will appear here as you use the app." />
      ) : (
        <ol className="card divide-y divide-surface-line">
          {query.data!.map((item) => (
            <li key={item.id} className="flex gap-3 px-4 py-4">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-medium">{item.description}</p>
                  <time className="text-xs text-ink-faint">{formatDateTime(item.createdAt)}</time>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  {item.activityType}{item.entityId ? ` · ${item.entityId}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
