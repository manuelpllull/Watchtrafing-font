import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tradesApi } from '@/api/trades';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { PageError, getMessage } from '@/components/ui/ErrorBanner';
import { TradeStatusBadge } from '@/components/ui/Badge';
import { Field, Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatDateTime, formatMoney, formatPercent } from '@/lib/format';
import { TradeStatus } from '@/api/types';

const QUERY_KEY = (id: string) => ['trade', id];

export default function TradeDetailPage() {
  const { tradeId } = useParams<{ tradeId: string }>();
  const { notify } = useToast();
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();

  const trade = useQuery({
    queryKey: QUERY_KEY(tradeId!),
    queryFn: () => tradesApi.getById(tradeId!),
    enabled: !!tradeId,
  });

  const [inTransitOpen, setInTransitOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: QUERY_KEY(tradeId!) });
    await qc.invalidateQueries({ queryKey: ['allMyTrades'] });
  };

  const act = async (
    label: string,
    fn: () => Promise<unknown>,
    opts?: { confirm?: Parameters<typeof confirm>[0] },
  ) => {
    if (opts?.confirm) {
      const ok = await confirm(opts.confirm);
      if (!ok) return;
    }
    try {
      await fn();
      await refresh();
      notify(`${label}.`, 'success');
    } catch (err) {
      notify(getMessage(err), 'error');
    }
  };

  const confirmMut = useMutation({ mutationFn: () => tradesApi.confirm(tradeId!) });
  const rejectMut = useMutation({ mutationFn: () => tradesApi.reject(tradeId!) });
  const cancelMut = useMutation({ mutationFn: () => tradesApi.cancel(tradeId!) });

  if (trade.isLoading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  if (trade.error) return <PageError message={getMessage(trade.error)} />;
  if (!trade.data) return null;
  const t = trade.data;
  const pending = t.status === TradeStatus.Pending;

  return (
    <div className="space-y-5">
      <nav className="text-sm text-ink-soft">
        <Link to="/trades" className="hover:underline">Trades</Link> /{' '}
        <span className="text-ink">{t.id.slice(0, 8)}…</span>
      </nav>

      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">
              Trade · {formatMoney(t.salePrice)}
            </h1>
            <p className="text-sm text-ink-soft">
              {t.buyerUserId
                ? `Buyer: ${t.buyerUserName || 'platform user'}`
                : t.buyerClientId
                  ? `CRM client: ${t.buyerExternalName || 'client'}`
                  : `External buyer: ${t.buyerExternalName || '—'}`}
            </p>
          </div>
          <TradeStatusBadge status={t.status} />
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <Detail label="Sale date" value={formatDate(t.saleDate)} />
          <Detail label="Created" value={formatDateTime(t.createdAt)} />
          <Detail label="Completed" value={formatDateTime(t.completedAt)} />
          <Detail label="Cancelled" value={formatDateTime(t.cancelledAt)} />
          <Detail label="Payment ref" value={t.paymentReference || '—'} />
          <Detail label="Shipping ref" value={t.shippingReference || '—'} />
        </dl>

        <div className="mt-4 flex text-sm">
          <Link to={`/watches/${t.watchId}`} className="font-medium text-brand-600 hover:underline">
            View watch →
          </Link>
        </div>

        {(pending || t.status === TradeStatus.InTransit) && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-surface-line pt-4">
            {pending && (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={confirmMut.isPending}
                  onClick={() =>
                    act('Trade confirmed', () => confirmMut.mutateAsync(), {
                      confirm: {
                        title: 'Confirm this trade?',
                        message: 'Confirming completes the trade and replicates the watch to the buyer.',
                        confirmLabel: 'Confirm',
                      },
                    })
                  }
                >
                  {confirmMut.isPending ? 'Confirming…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  disabled={rejectMut.isPending}
                  onClick={() =>
                    act('Trade rejected', () => rejectMut.mutateAsync(), {
                      confirm: {
                        title: 'Reject this trade?',
                        message: 'The trade will be cancelled. No ownership data will change.',
                        confirmLabel: 'Reject',
                        tone: 'danger',
                      },
                    })
                  }
                >
                  {rejectMut.isPending ? 'Rejecting…' : 'Reject'}
                </button>
              </>
            )}
            {pending && (
              <button type="button" className="btn-secondary" onClick={() => setInTransitOpen(true)}>
                Mark in transit
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              disabled={cancelMut.isPending}
              onClick={() =>
                act('Trade cancelled', () => cancelMut.mutateAsync(), {
                  confirm: {
                    title: 'Cancel this trade?',
                    message: 'This cancels the trade. The seller can create a new one if needed.',
                    confirmLabel: 'Cancel trade',
                    tone: 'danger',
                  },
                })
              }
            >
              {cancelMut.isPending ? 'Cancelling…' : 'Cancel'}
            </button>
          </div>
        )}

        {t.status === TradeStatus.InTransit && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-surface-line pt-4">
            <button type="button" className="btn-primary" onClick={() => setCompleteOpen(true)}>
              Mark completed
            </button>
          </div>
        )}
      </header>

      {t.settlements.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Settlements</h2>
          <ul className="card divide-y divide-surface-line">
            {t.settlements.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{s.shareholderName || 'Shareholder'}</p>
                  <p className="text-xs text-ink-faint">
                    Profit {formatPercent(s.profitPercentage)} · {formatMoney(s.profitAmount)}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatMoney(s.payoutAmount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {inTransitOpen && (
        <InTransitModal tradeId={t.id} onClose={() => setInTransitOpen(false)} />
      )}
      {completeOpen && (
        <CompleteModal tradeId={t.id} onClose={() => setCompleteOpen(false)} />
      )}
      {dialog}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

function InTransitModal({ tradeId, onClose }: { tradeId: string; onClose: () => void }) {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [shippingReference, setShippingReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await tradesApi.markInTransit(tradeId, { shippingReference: shippingReference.trim() || null });
      await qc.invalidateQueries({ queryKey: QUERY_KEY(tradeId) });
      await qc.invalidateQueries({ queryKey: ['allMyTrades'] });
      notify('Trade marked in transit.', 'success');
      onClose();
    } catch (err) {
      notify(getMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalField
      title="Mark in transit"
      onClose={onClose}
      submitting={submitting}
      submitLabel="Mark in transit"
      onSubmit={submit}
    >
      <Field label="Shipping reference" hint="Optional tracking number.">
        <Input value={shippingReference} onChange={(e) => setShippingReference(e.target.value)} />
      </Field>
    </ModalField>
  );
}

function CompleteModal({ tradeId, onClose }: { tradeId: string; onClose: () => void }) {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await tradesApi.complete(tradeId, { paymentReference: paymentReference.trim() || null });
      await qc.invalidateQueries({ queryKey: QUERY_KEY(tradeId) });
      await qc.invalidateQueries({ queryKey: ['allMyTrades'] });
      notify('Trade completed.', 'success');
      onClose();
    } catch (err) {
      notify(getMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalField
      title="Complete trade"
      onClose={onClose}
      submitting={submitting}
      submitLabel="Complete"
      onSubmit={submit}
    >
      <Field label="Payment reference" hint="Optional wire/transaction reference.">
        <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
      </Field>
    </ModalField>
  );
}

// Small wrapper that renders a modal form with a footer.
function ModalField({
  title,
  onClose,
  submitting,
  submitLabel,
  onSubmit,
  children,
}: {
  title: string;
  onClose: () => void;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (e: FormEvent) => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-primary" form={`modal-${title}`} disabled={submitting}>
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </>
      }
    >
      <form id={`modal-${title}`} onSubmit={onSubmit} className="space-y-4">{children}</form>
    </Modal>
  );
}
