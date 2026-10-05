import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { watchesApi } from '@/api/watches';
import { tradesApi } from '@/api/trades';
import { ApiError, makeApiError } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { useAuth } from '@/auth/AuthContext';
import { Spinner } from '@/components/ui/Spinner';
import { PageError, getMessage } from '@/components/ui/ErrorBanner';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { TradeStatusBadge, WatchStatusBadge, ShareBadge } from '@/components/ui/Badge';
import { SearchCombobox } from '@/components/SearchCombobox';
import { searchUserOptions } from '@/lib/userSearch';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  conditionLabel,
  expenseLabel,
  formatDate,
  formatMoney,
  formatPercent,
} from '@/lib/format';
import { ExpenseType, type AdditionalExpense } from '@/api/types';

export default function WatchDetailPage() {
  const { watchId } = useParams<{ watchId: string }>();
  const { notify } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const { session } = useAuth();

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<AdditionalExpense | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const watch = useQuery({
    queryKey: ['watch', watchId],
    queryFn: () => watchesApi.getById(watchId!),
    enabled: !!watchId,
  });

  const trades = useQuery({
    queryKey: ['watchTrades', watchId],
    queryFn: () => tradesApi.getByWatch(watchId!),
    enabled: !!watchId,
  });

  const remove = useMutation({
    mutationFn: () => watchesApi.remove(watchId!),
    onSuccess: async () => {
      notify('Watch deleted.', 'success');
      await qc.invalidateQueries({ queryKey: ['myWatches'] });
      navigate('/watches');
    },
  });

  const removeExpense = useMutation({
    mutationFn: (expenseId: string) => watchesApi.removeExpense(watchId!, expenseId),
    onSuccess: async () => {
      notify('Expense removed.', 'success');
      await qc.invalidateQueries({ queryKey: ['watch', watchId] });
      await qc.invalidateQueries({ queryKey: ['myWatches'] });
    },
  });

  const resolveShare = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      accept ? watchesApi.acceptShare(id) : watchesApi.rejectShare(id),
    onSuccess: async (_data, { accept }) => {
      notify(accept ? 'Share accepted.' : 'Invitation declined.', 'success');
      await qc.invalidateQueries({ queryKey: ['watch', watchId] });
      await qc.invalidateQueries({ queryKey: ['myWatches'] });
      await qc.invalidateQueries({ queryKey: ['shareInvites'] });
    },
    onError: (err: Error) => notify(getMessage(err), 'error'),
  });

  const onDeleteExpense = async (expenseId: string, title: string) => {
    const ok = await confirm({
      title: 'Delete expense?',
      message: `Remove "${title}" from this watch? Profit will be recalculated.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    removeExpense.mutate(expenseId);
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Delete watch?',
      message: 'The watch will be permanently deleted, along with any trades on it — including completed sales. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync();
    } catch (err) {
      notify(getMessage(err), 'error');
    }
  };

  if (watch.isLoading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  if (watch.error) return <PageError message={getMessage(watch.error)} />;
  if (!watch.data) return null;
  const w = watch.data;

  // Co-owners can view the watch but must not use owner-only controls.
  const isOwner = !session || session.userId === w.ownerUserId;
  const myShare = w.shares?.find((s) => s.userId === session?.userId);
  const myPendingShare = myShare?.status === 'Pending' ? myShare : undefined;

  return (
    <div className="space-y-5">
      <nav className="text-sm text-ink-soft">
        <Link to="/watches" className="hover:underline">Collection</Link> /{' '}
        <span className="text-ink">{w.brand.name} {w.model}</span>
      </nav>

      {!isOwner && (
        <div className="card p-4 text-sm text-ink-soft">
          Owned by <span className="font-semibold text-ink">@{w.ownerUserName ?? 'unknown'}</span>
          {myShare ? ` · you hold ${formatPercent(myShare.ownershipPercentage)}%` : ''}
        </div>
      )}

      {myPendingShare && (
        <div className="card border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            You're invited to co-own this watch
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            {myPendingShare.isConsignment
              ? `Consignment · ${formatPercent(myPendingShare.profitPercentage)}% profit`
              : `${formatPercent(myPendingShare.ownershipPercentage)}% ownership · ${formatPercent(myPendingShare.profitPercentage)}% profit · ${formatMoney(myPendingShare.moneyDown)} money down`}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => resolveShare.mutate({ id: myPendingShare.id, accept: false })}
              disabled={resolveShare.isPending}
            >
              Decline
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => resolveShare.mutate({ id: myPendingShare.id, accept: true })}
              disabled={resolveShare.isPending}
            >
              Accept share
            </button>
          </div>
        </div>
      )}

      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{w.brand.name} {w.model}</h1>
            <p className="text-sm text-ink-soft">
              {w.referenceNumber || 'No reference'} {w.year ? `· ${w.year}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <WatchStatusBadge status={w.status} />
            {isOwner && (
              <>
                <Link to={`/watches/${w.id}/edit`} className="btn-secondary">Edit</Link>
                <button type="button" className="btn-ghost text-red-600 dark:text-red-400" onClick={onDelete} disabled={remove.isPending}>
                  {remove.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </>
            )}
          </div>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Condition" value={conditionLabel(w.condition)} />
          <Detail label="Box / Papers" value={`${w.boxIncluded ? 'Box' : 'No box'} · ${w.papersIncluded ? 'Papers' : 'No papers'}`} />
          <Detail label="Purchase" value={formatMoney(w.purchasePrice)} sub={formatDate(w.purchaseDate)} />
          <Detail label="Sale" value={formatMoney(w.salePrice)} sub={formatDate(w.saleDate)} />
          <Detail label="Profit" value={formatMoney(w.profit)} />
          <Detail label="Margin" value={w.margin != null ? formatPercent(w.margin * 100) : '—'} />
          <Detail label="Managed" value={w.isManaged ? 'Yes (shares)' : 'Sole owner'} />
          <Detail label="Sold to" value={w.soldToUserId ? 'Platform user' : '—'} />
        </dl>

        {w.description && (
          <p className="mt-4 text-sm text-ink-soft">{w.description}</p>
        )}
        {w.serialNumber && (
          <p className="mt-2 text-xs text-ink-faint">Serial: {w.serialNumber}</p>
        )}
      </header>

      {/* Trade history for this watch */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">Trade history</h2>
        {trades.isLoading ? (
          <div className="card p-4 text-sm text-ink-soft"><Spinner /> Loading…</div>
        ) : trades.error ? (
          <PageError message={getMessage(trades.error)} />
        ) : (trades.data?.length ?? 0) === 0 ? (
          <EmptyState title="No trades recorded" hint="Record a sale to start a trade." />
        ) : (
          <ul className="card divide-y divide-surface-line">
            {trades.data!.map((t) => (
              <li key={t.id}>
                <Link to={`/trades/${t.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-ink/10">
                  <span className="text-sm font-medium">
                    {t.buyerUserName || (t.buyerClientId ? `CRM client · ${t.buyerExternalName || 'client'}` : null) || t.buyerExternalName || 'External buyer'}
                    <span className="text-ink-faint"> · {formatDate(t.saleDate)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatMoney(t.salePrice)}</span>
                    <TradeStatusBadge status={t.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Shares */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Shares {w.isManaged && <span className="text-xs font-normal text-ink-faint">(managed)</span>}</h2>
          {isOwner && (
            <button type="button" className="btn-secondary" onClick={() => setShareOpen(true)}>+ Add share</button>
          )}
        </div>
        {(w.shares?.length ?? 0) === 0 ? (
          <EmptyState title="No shares" hint="Add co-owners or a consignee to split profits on sale." />
        ) : (
          <ul className="card divide-y divide-surface-line">
            {w.shares.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {s.userName || s.externalName || 'Unknown'}
                    {s.isConsignment && <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">consignment</span>}
                  </p>
                  <p className="text-xs text-ink-faint">
                    Own {formatPercent(s.ownershipPercentage)} · Profit {formatPercent(s.profitPercentage)} · Money down {formatMoney(s.moneyDown)}
                  </p>
                </div>
                <ShareBadge status={s.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Additional expenses */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Additional expenses</h2>
          <button type="button" className="btn-secondary" onClick={() => setExpenseOpen(true)}>+ Add expense</button>
        </div>
        {(w.additionalExpenses?.length ?? 0) === 0 ? (
          <EmptyState title="No expenses" hint="Track repairs, services, accessories — used in profit calc." />
        ) : (
          <ul className="card divide-y divide-surface-line">
            {w.additionalExpenses.map((ex) => (
              <li key={ex.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{ex.title} <span className="text-xs text-ink-faint">· {expenseLabel(ex.expenseType)}</span></p>
                  <p className="text-xs text-ink-soft">{ex.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">−{formatMoney(ex.cost)}</span>
                  <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditingExpense(ex)}>Edit</button>
                  <button type="button" className="btn-ghost px-2 py-1 text-xs text-red-600 dark:text-red-400" onClick={() => onDeleteExpense(ex.id, ex.title)} disabled={removeExpense.isPending}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {expenseOpen && !editingExpense && (
        <ExpenseModal watchId={w.id} onClose={() => setExpenseOpen(false)} onDone={() => setExpenseOpen(false)} />
      )}
      {editingExpense && (
        <ExpenseModal
          watchId={w.id}
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onDone={() => setEditingExpense(null)}
        />
      )}
      {shareOpen && (
        <ShareModal watchId={w.id} onClose={() => setShareOpen(false)} onDone={() => setShareOpen(false)} />
      )}
      {dialog}
    </div>
  );
}

function Detail({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
      {sub && <dd className="text-xs text-ink-soft">{sub}</dd>}
    </div>
  );
}

// ── Add / edit expense modal ───────────────────────────
function ExpenseModal({
  watchId,
  expense,
  onClose,
  onDone,
}: {
  watchId: string;
  expense?: AdditionalExpense;
  onClose: () => void;
  onDone: () => void;
}) {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: expense?.title ?? '',
    cost: expense ? String(expense.cost) : '',
    expenseType: expense ? String(expense.expenseType) : String(ExpenseType.Service),
    description: expense?.description ?? '',
    paidByExternalName: expense?.paidByExternalName ?? '',
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        title: form.title.trim(),
        cost: Number(form.cost),
        expenseType: Number(form.expenseType),
        description: form.description,
        paidByExternalName: form.paidByExternalName.trim() || null,
      };
      if (expense) {
        await watchesApi.updateExpense(watchId, expense.id, body);
      } else {
        await watchesApi.addExpense(watchId, body);
      }
      await qc.invalidateQueries({ queryKey: ['watch', watchId] });
      await qc.invalidateQueries({ queryKey: ['myWatches'] });
      notify(expense ? 'Expense updated.' : 'Expense added.', 'success');
      onDone();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={expense ? 'Edit expense' : 'Add expense'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Saving…' : expense ? 'Save changes' : 'Add expense'}</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" required><Input value={form.title} onChange={set('title')} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cost" required><Input type="number" step="0.01" min="0" value={form.cost} onChange={set('cost')} required /></Field>
          <Field label="Type" required>
            <Select value={form.expenseType} onChange={set('expenseType')}>
              <option value={String(ExpenseType.Repair)}>Repair</option>
              <option value={String(ExpenseType.Service)}>Service</option>
              <option value={String(ExpenseType.Accessory)}>Accessory</option>
              <option value={String(ExpenseType.MissingPart)}>Missing part</option>
              <option value={String(ExpenseType.Shipping)}>Shipping</option>
            </Select>
          </Field>
        </div>
        <Field label="Description" required><Textarea value={form.description} onChange={set('description')} required /></Field>
        <Field label="Paid by (external name)" hint="Leave blank if you paid."><Input value={form.paidByExternalName} onChange={set('paidByExternalName')} /></Field>
        {error && <ErrorList error={error} />}
      </form>
    </Modal>
  );
}

// ── Add share modal ────────────────────────────────────
function ShareModal({
  watchId,
  onClose,
  onDone,
}: {
  watchId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    isExternal: false,
    userId: '',
    userName: '',
    externalName: '',
    ownershipPercentage: '50',
    profitPercentage: '',
    moneyDown: '0',
    isConsignment: false,
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [k]: value as never }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.isExternal && !form.userId) {
      setError(makeApiError('Choose the co-owner from the search results.'));
      return;
    }
    setSubmitting(true);
    try {
      const ownership = form.isConsignment ? 0 : Number(form.ownershipPercentage);
      const profit = form.profitPercentage
        ? Number(form.profitPercentage)
        : form.isConsignment
          ? Number(form.ownershipPercentage) // will be overridden below
          : ownership;
      await watchesApi.addShare(watchId, {
        userId: form.isExternal ? null : form.userId || null,
        externalName: form.isExternal ? form.externalName.trim() || null : null,
        ownershipPercentage: ownership,
        profitPercentage: form.isConsignment ? Number(form.profitPercentage || '0') : profit,
        moneyDown: form.isConsignment ? 0 : Number(form.moneyDown),
        isConsignment: form.isConsignment,
      });
      await qc.invalidateQueries({ queryKey: ['watch', watchId] });
      notify('Share added.', 'success');
      onDone();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add share"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Saving…' : 'Add share'}</button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Shareholder type">
          <Select value={form.isExternal ? 'external' : 'platform'} onChange={(e) => setForm((f) => ({ ...f, isExternal: e.target.value === 'external', userId: '', userName: '' }))}>
            <option value="platform">Platform user</option>
            <option value="external">External person</option>
          </Select>
        </Field>

        {form.isExternal ? (
          <Field label="External name" required><Input value={form.externalName} onChange={set('externalName')} required /></Field>
        ) : (
          <Field label="Co-owner" htmlFor="shareUserName" hint="Type to search. They'll be invited and must accept before a sale can be recorded.">
            <SearchCombobox
              id="shareUserName"
              value={form.userId}
              selectedLabel={form.userName}
              search={searchUserOptions}
              placeholder="e.g. johndoe"
              disabled={submitting}
              onSelect={(id, label) => setForm((f) => ({ ...f, userId: id, userName: label }))}
            />
          </Field>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isConsignment} onChange={set('isConsignment')} />
          Consignment share (no capital stake, just a profit cut)
        </label>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Ownership %">
            <Input type="number" step="0.01" min="0" max="100" value={form.isConsignment ? '0' : form.ownershipPercentage} onChange={set('ownershipPercentage')} disabled={form.isConsignment} />
          </Field>
          <Field label="Profit %">
            <Input type="number" step="0.01" min="0" max="100" value={form.profitPercentage} onChange={set('profitPercentage')} placeholder={form.isConsignment ? 'e.g. 15' : 'defaults to ownership'} />
          </Field>
          <Field label="Money down">
            <Input type="number" step="0.01" min="0" value={form.isConsignment ? '0' : form.moneyDown} onChange={set('moneyDown')} disabled={form.isConsignment} />
          </Field>
        </div>
        {error && <ErrorList error={error} />}
      </form>
    </Modal>
  );
}

function ErrorList({ error }: { error: ApiError }) {
  return (
    <div className="rounded-lg border border-red-200 dark:border-red-500 dark:border-red-400/60/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
      <ul className="list-disc space-y-0.5 pl-5">
        {error.messages.map((m, i) => (<li key={i}>{m}</li>))}
      </ul>
    </div>
  );
}
