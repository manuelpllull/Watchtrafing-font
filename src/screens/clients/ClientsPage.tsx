import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clientsApi } from '@/api/clients';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { PageError, getMessage } from '@/components/ui/ErrorBanner';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/format';
import { useTranslation } from '@/i18n';

export default function ClientsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const clients = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  });

  const term = search.trim().toLowerCase();
  const visible = (clients.data ?? []).filter((client) => {
    if (!term) return true;
    return [client.name, client.email, client.city, client.linkedUserName]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('clients.title')}</h1>
          <p className="text-sm text-ink-soft">
            Keep private contact records for marketplace and offline counterparties.
          </p>
        </div>
        <Link to="/clients/new" className="btn-primary">+ Add client</Link>
      </header>

      <div className="card p-4">
        <label htmlFor="client-search" className="label">{t('clients.title')}</label>
        <input
          id="client-search"
          className="input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('clients.searchPlaceholder')}
        />
      </div>

      {clients.isLoading ? (
        <div className="card flex items-center gap-2 p-6 text-sm text-ink-soft"><Spinner /> {t('common.loading')}</div>
      ) : clients.error ? (
        <PageError message={getMessage(clients.error)} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={t('clients.empty')}
          hint={t('clients.emptyHint')}
          action={!term ? <Link to="/clients/new" className="btn-primary">{t('clients.add')}</Link> : undefined}
        />
      ) : (
        <ul className="stagger grid gap-3 sm:grid-cols-2">
          {visible.map((client) => (
            <li key={client.id}>
              <Link to={`/clients/${client.id}`} className="card card-lift block p-4 hover:border-brand-300">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{client.name}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {client.email || client.phoneNumber || client.city || 'No contact details'}
                    </p>
                  </div>
                  <Badge color={client.linkedUserId ? 'blue' : 'slate'}>
                    {client.linkedUserId ? 'Linked user' : 'External'}
                  </Badge>
                </div>
                <div className="mt-4 flex items-end justify-between text-sm">
                  <div>
                    <p className="text-xs text-ink-faint">{t('clients.recordedTrades')}</p>
                    <p className="font-semibold">{client.tradeCount}</p>
                  </div>
                  <p className="text-xs text-ink-faint">Added {formatDate(client.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
