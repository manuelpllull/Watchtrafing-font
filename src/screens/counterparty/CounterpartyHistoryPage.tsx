import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tradesApi } from '@/api/trades';
import { TradeStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { PageError, getMessage } from '@/components/ui/ErrorBanner';
import { formatDate, formatMoney } from '@/lib/format';

export default function CounterpartyHistoryPage() {
  const { counterpartyId } = useParams<{ counterpartyId: string }>();
  const history = useQuery({
    queryKey: ['counterpartyHistory', counterpartyId],
    queryFn: () => tradesApi.getCounterpartyTrades(counterpartyId!),
    enabled: !!counterpartyId,
  });

  if (history.isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  }
  if (history.error) return <PageError message={getMessage(history.error)} />;
  if (!history.data) return null;

  const h = history.data;
  return (
    <div className="space-y-5">
      <nav className="text-sm text-ink-soft">
        <Link to="/lookup" className="hover:underline">Counterparties</Link> /{' '}
        <span className="text-ink">@{h.counterpartyUserName}</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold">{h.counterpartyDisplayName}</h1>
        <p className="text-sm text-ink-soft">@{h.counterpartyUserName} · shared history</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Sold by you" value={h.soldByYou} />
        <Stat label="Bought by you" value={h.boughtByYou} />
        <Stat label="Completed" value={h.totalCompleted} />
        <Stat label="Pending" value={h.totalPending} />
        <Stat label="Cancelled" value={h.totalCancelled} />
      </div>

      {h.trades.length === 0 ? (
        <EmptyState title="No shared trades" hint="There is no transaction history with this counterparty yet." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-surface-line bg-ink/5 text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-4 py-3">Watch</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-line">
                {h.trades.map((t) => {
                  const direction = t.sellerId === counterpartyId ? 'Bought by you' : 'Sold by you';
                  return (
                    <tr key={t.id} className="hover:bg-ink/10">
                      <td className="px-4 py-3">
                        <Link to={`/trades/${t.id}`} className="font-medium text-brand-700 hover:underline">
                          {t.watchBrand} {t.watchModel}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{direction}</td>
                      <td className="px-4 py-3 text-ink-soft">{formatDate(t.saleDate)}</td>
                      <td className="px-4 py-3 font-medium">{formatMoney(t.salePrice)}</td>
                      <td className="px-4 py-3"><TradeStatusBadge status={t.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
