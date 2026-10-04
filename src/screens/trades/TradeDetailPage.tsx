import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tradesApi } from '@/api/trades';
import { clientsApi } from '@/api/clients';
import { usersApi } from '@/api/users';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { PageError, getMessage } from '@/components/ui/ErrorBanner';
import { TradeStatusBadge } from '@/components/ui/Badge';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatDateTime, formatMoney, formatPercent, fromIsoDateTime } from '@/lib/format';
import { TradeStatus, type TradeResponse } from '@/api/types';

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
  const [editOpen, setEditOpen] = useState(false);

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

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to={`/watches/${t.watchId}`} className="font-medium text-brand-600 hover:underline">
            View watch →
          </Link>
          {t.status !== TradeStatus.Cancelled && (
            <button type="button" className="btn-secondary px-3 py-1.5 text-[13px]" onClick={() => setEditOpen(true)}>
              Edit trade
            </button>
          )}
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
      {editOpen && (
        <EditTradeModal trade={t} onClose={() => setEditOpen(false)} />
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

// ── Edit trade modal ───────────────────────────────────
function EditTradeModal({ trade, onClose }: { trade: TradeResponse; onClose: () => void }) {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    salePrice: String(trade.salePrice),
    saleDate: fromIsoDateTime(trade.saleDate),
    buyerKind: trade.buyerUserId ? 'platform' : trade.buyerClientId ? 'client' : 'external',
    buyerUserName: trade.buyerUserName || '',
    buyerClientId: trade.buyerClientId || '',
    buyerExternalName: trade.buyerExternalName || '',
  });
  const [buyerLookup, setBuyerLookup] = useState({
    loading: false,
    result: null as { id: string; userName: string } | null,
    error: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const clients = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
    enabled: form.buyerKind === 'client',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const doLookup = async () => {
    setBuyerLookup({ loading: true, result: null, error: '' });
    try {
      const p = await usersApi.lookupByUsername(form.buyerUserName.trim());
      setBuyerLookup({ loading: false, result: { id: p.id, userName: p.userName }, error: '' });
    } catch {
      setBuyerLookup({ loading: false, result: null, error: 'User not found.' });
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const buyerUserId =
        form.buyerKind === 'platform' ? buyerLookup.result?.id ?? null : null;
      const buyerClientId = form.buyerKind === 'client' ? form.buyerClientId || null : null;
      const buyerExternalName =
        form.buyerKind === 'external' ? form.buyerExternalName.trim() || null : null;

      if (form.buyerKind === 'platform' && !buyerUserId) {
        notify('Look up the buyer by username first.', 'error');
        return;
      }
      if (form.buyerKind === 'client' && !buyerClientId) {
        notify('Choose a CRM client.', 'error');
        return;
      }
      if (form.buyerKind === 'external' && !buyerExternalName) {
        notify('Enter the external buyer name.', 'error');
        return;
      }

      await tradesApi.update(trade.id, {
        salePrice: Number(form.salePrice),
        saleDate: new Date(form.saleDate).toISOString(),
        buyerUserId,
        buyerClientId,
        buyerExternalName,
      });
      await qc.invalidateQueries({ queryKey: QUERY_KEY(trade.id) });
      await qc.invalidateQueries({ queryKey: ['allMyTrades'] });
      await qc.invalidateQueries({ queryKey: ['myWatches'] });
      notify('Trade updated.', 'success');
      onClose();
    } catch (err) {
      notify(getMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit trade"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-primary" form="modal-edit-trade" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      <p className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">
        If the buyer is a platform user, editing resets the trade to pending — they must confirm the new terms.
      </p>
      <form id="modal-edit-trade" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sale price" required>
            <Input type="number" step="0.01" min="0" value={form.salePrice} onChange={set('salePrice')} required />
          </Field>
          <Field label="Sale date" required>
            <Input type="datetime-local" value={form.saleDate} onChange={set('saleDate')} required />
          </Field>
        </div>
        <Field label="Buyer">
          <Select value={form.buyerKind} onChange={set('buyerKind')}>
            <option value="external">External buyer (non-platform)</option>
            <option value="platform">Platform user</option>
            <option value="client">CRM client</option>
          </Select>
        </Field>
        {form.buyerKind === 'platform' && (
          <Field label="Buyer username" required>
            <div className="flex gap-2">
              <Input value={form.buyerUserName} onChange={set('buyerUserName')} placeholder="e.g. johndoe" />
              <button type="button" className="btn-secondary shrink-0" onClick={doLookup} disabled={buyerLookup.loading || !form.buyerUserName.trim()}>
                {buyerLookup.loading ? <Spinner /> : 'Look up'}
              </button>
            </div>
            {buyerLookup.error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{buyerLookup.error}</p>}
            {buyerLookup.result && <p className="mt-1 text-sm text-brand-700 dark:text-brand-300">Found @{buyerLookup.result.userName}.</p>}
          </Field>
        )}
        {form.buyerKind === 'client' && (
          <Field label="CRM client" required>
            <Select value={form.buyerClientId} onChange={set('buyerClientId')}>
              <option value="">Choose a client…</option>
              {clients.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.linkedUserName ? ` · @${c.linkedUserName}` : ' · external'}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {form.buyerKind === 'external' && (
          <Field label="External buyer name" required>
            <Input value={form.buyerExternalName} onChange={set('buyerExternalName')} placeholder="Local dealer" />
          </Field>
        )}
      </form>
    </Modal>
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
