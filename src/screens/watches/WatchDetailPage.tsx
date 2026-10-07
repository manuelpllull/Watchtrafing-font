import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { watchesApi } from '@/api/watches';
import { tradesApi } from '@/api/trades';
import { ApiError, makeApiError } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { useAuth } from '@/auth/AuthContext';
import { useTranslation } from '@/i18n';
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
  const { t } = useTranslation();
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
      notify(t('watchDetail.deleted'), 'success');
      await qc.invalidateQueries({ queryKey: ['myWatches'] });
      navigate('/watches');
    },
  });

  const removeExpense = useMutation({
    mutationFn: (expenseId: string) => watchesApi.removeExpense(watchId!, expenseId),
    onSuccess: async () => {
      notify(t('watchDetail.expenseRemoved'), 'success');
      await qc.invalidateQueries({ queryKey: ['watch', watchId] });
      await qc.invalidateQueries({ queryKey: ['myWatches'] });
    },
  });

  const resolveShare = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      accept ? watchesApi.acceptShare(id) : watchesApi.rejectShare(id),
    onSuccess: async (_data, { accept }) => {
      notify(accept ? t('invitations.accepted') : t('invitations.declined'), 'success');
      await qc.invalidateQueries({ queryKey: ['watch', watchId] });
      await qc.invalidateQueries({ queryKey: ['myWatches'] });
      await qc.invalidateQueries({ queryKey: ['shareInvites'] });
    },
    onError: (err: Error) => notify(getMessage(err), 'error'),
  });

  const onDeleteExpense = async (expenseId: string, title: string) => {
    const ok = await confirm({
      title: t('watchDetail.deleteExpenseTitle'),
      message: t('watchDetail.deleteExpenseMessage', { title }),
      confirmLabel: t('watchDetail.deleteExpenseConfirm'),
      tone: 'danger',
    });
    if (!ok) return;
    removeExpense.mutate(expenseId);
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: t('watchDetail.deleteTitle'),
      message: t('watchDetail.deleteMessage'),
      confirmLabel: t('watchDetail.deleteConfirm'),
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
        <Link to="/watches" className="hover:underline">{t('watches.title')}</Link> /{' '}
        <span className="text-ink">{w.brand.name} {w.model}</span>
      </nav>

      {!isOwner && (
        <div className="card p-4 text-sm text-ink-soft">
          {t('watchDetail.ownedBy', { owner: w.ownerUserName ?? t('common.unknown') })}
          {myShare ? ` · ${t('watchDetail.youHold', { ownership: formatPercent(myShare.ownershipPercentage) })}` : ''}
        </div>
      )}

      {myPendingShare && (
        <div className="card border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {t('watchDetail.invitedTitle')}
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
            {myPendingShare.isConsignment
              ? t('invitations.consignmentTerms', { profit: formatPercent(myPendingShare.profitPercentage) })
              : t('invitations.shareTerms', {
                  ownership: formatPercent(myPendingShare.ownershipPercentage),
                  profit: formatPercent(myPendingShare.profitPercentage),
                  money: formatMoney(myPendingShare.stake),
                })}
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
              {w.referenceNumber || t('watchDetail.noReference')} {w.year ? `· ${w.year}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <WatchStatusBadge status={w.status} />
            {isOwner && (
              <>
                <Link to={`/watches/${w.id}/edit`} className="btn-secondary">{t('common.edit')}</Link>
                <button type="button" className="btn-ghost text-red-600 dark:text-red-400" onClick={onDelete} disabled={remove.isPending}>
                  {remove.isPending ? t('watchDetail.deleting') : t('common.delete')}
                </button>
              </>
            )}
          </div>
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label={t('watch.condition')} value={conditionLabel(w.condition, t)} />
          <Detail label={t('watchDetail.boxPapers')} value={`${w.boxIncluded ? t('watchDetail.box') : t('watchDetail.noBox')} · ${w.papersIncluded ? t('watchDetail.papers') : t('watchDetail.noPapers')}`} />
          <Detail label={t('watchDetail.purchase')} value={formatMoney(w.purchasePrice)} sub={formatDate(w.purchaseDate)} />
          <Detail label={t('watchDetail.sale')} value={formatMoney(w.salePrice)} sub={formatDate(w.saleDate)} />
          <Detail label={t('watchDetail.profit')} value={formatMoney(w.profit)} />
          <Detail label={t('watchDetail.margin')} value={w.margin != null ? formatPercent(w.margin * 100) : '—'} />
          <Detail label={t('watchDetail.managed')} value={w.isManaged ? t('watchDetail.managedYes') : t('watchDetail.soleOwner')} />
          <Detail label={t('watchDetail.soldTo')} value={w.soldToUserId ? t('watchDetail.platformUser') : '—'} />
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
        <h2 className="mb-2 text-lg font-semibold">{t('watchDetail.tradeHistory')}</h2>
        {trades.isLoading ? (
          <div className="card p-4 text-sm text-ink-soft"><Spinner /> Loading…</div>
        ) : trades.error ? (
          <PageError message={getMessage(trades.error)} />
        ) : (trades.data?.length ?? 0) === 0 ? (
          <EmptyState title={t('watchDetail.noTrades')} hint={t('watchDetail.recordSale')} />
        ) : (
          <ul className="card divide-y divide-surface-line">
            {trades.data!.map((trade) => (
              <li key={trade.id}>
                <Link to={`/trades/${trade.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-ink/10">
                  <span className="text-sm font-medium">
                    {trade.buyerUserName || (trade.buyerClientId ? `${t('dashboard.crmClient')} · ${trade.buyerExternalName || 'client'}` : null) || trade.buyerExternalName || t('dashboard.externalBuyer')}
                    <span className="text-ink-faint"> · {formatDate(trade.saleDate)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatMoney(trade.salePrice)}</span>
                    <TradeStatusBadge status={trade.status} />
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
          <h2 className="text-lg font-semibold">
            {t('watchDetail.shares')}{' '}
            {w.isManaged && (
              <span className="text-xs font-normal text-ink-faint">{t('watchDetail.managedSuffix')}</span>
            )}
          </h2>
          {isOwner && (
            <button type="button" className="btn-secondary" onClick={() => setShareOpen(true)}>{t('watchDetail.addShare')}</button>
          )}
        </div>
        {(w.shares?.length ?? 0) === 0 ? (
          <EmptyState title={t('watchDetail.noShares')} hint={t('watchDetail.noSharesHint')} />
        ) : (
          <ul className="card divide-y divide-surface-line">
            {w.shares.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {s.userName || s.externalName || t('common.unknown')}
                    {s.isConsignment && <span className="ml-2 text-xs text-amber-700 dark:text-amber-400">{t('watchDetail.consignment')}</span>}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {t('invitations.shareTerms', {
                      ownership: formatPercent(s.ownershipPercentage),
                      profit: formatPercent(s.profitPercentage),
                      money: formatMoney(s.stake),
                    })}
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
          <h2 className="text-lg font-semibold">{t('watchDetail.expenses')}</h2>
          <button type="button" className="btn-secondary" onClick={() => setExpenseOpen(true)}>{t('watchDetail.addExpense')}</button>
        </div>
        {(w.additionalExpenses?.length ?? 0) === 0 ? (
          <EmptyState title={t('watchDetail.noExpenses')} hint={t('watchDetail.noExpensesHint')} />
        ) : (
          <ul className="card divide-y divide-surface-line">
            {w.additionalExpenses.map((ex) => (
              <li key={ex.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{ex.title} <span className="text-xs text-ink-faint">· {expenseLabel(ex.expenseType, t)}</span></p>
                  <p className="text-xs text-ink-soft">{ex.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">−{formatMoney(ex.cost)}</span>
                  <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setEditingExpense(ex)}>{t('watchDetail.editExpense')}</button>
                  <button type="button" className="btn-ghost px-2 py-1 text-xs text-red-600 dark:text-red-400" onClick={() => onDeleteExpense(ex.id, ex.title)} disabled={removeExpense.isPending}>{t('common.delete')}</button>
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
  const { t } = useTranslation();
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
      notify(expense ? t('watchDetail.expenseUpdated') : t('watchDetail.expenseAdded'), 'success');
      onDone();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={expense ? t('watchDetail.editExpense') : t('watchDetail.addExpense')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? t('common.saving') : expense ? t('common.save') : t('watchDetail.addExpense')}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('watchDetail.expenseTitle')} required><Input value={form.title} onChange={set('title')} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('watchDetail.expenseCost')} required><Input type="number" step="0.01" min="0" value={form.cost} onChange={set('cost')} required /></Field>
          <Field label={t('watchDetail.expenseType')} required>
            <Select value={form.expenseType} onChange={set('expenseType')}>
              <option value={String(ExpenseType.Repair)}>{t('expenseType.Repair')}</option>
              <option value={String(ExpenseType.Service)}>{t('expenseType.Service')}</option>
              <option value={String(ExpenseType.Accessory)}>{t('expenseType.Accessory')}</option>
              <option value={String(ExpenseType.MissingPart)}>{t('expenseType.MissingPart')}</option>
              <option value={String(ExpenseType.Shipping)}>{t('expenseType.Shipping')}</option>
            </Select>
          </Field>
        </div>
        <Field label={t('watchDetail.expenseDescription')} required><Textarea value={form.description} onChange={set('description')} required /></Field>
        <Field label={t('watchDetail.expensePaidBy')} hint={t('watchDetail.expenseDescriptionPlaceholder')}><Input value={form.paidByExternalName} onChange={set('paidByExternalName')} /></Field>
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
  const { t } = useTranslation();
  const { notify } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    isExternal: false,
    userId: '',
    userName: '',
    externalName: '',
    ownershipPercentage: '50',
    profitPercentage: '',
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
      setError(makeApiError(t('watch.coOwnerRequired')));
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
        isConsignment: form.isConsignment,
      });
      await qc.invalidateQueries({ queryKey: ['watch', watchId] });
      notify(t('watchDetail.shareAdded'), 'success');
      onDone();
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={t('watchDetail.addShare')}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={submitting}>{t('common.cancel')}</button>
          <button className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? t('common.saving') : t('watchDetail.addShareConfirm')}
          </button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('watchDetail.shareholderType')}>
          <Select value={form.isExternal ? 'external' : 'platform'} onChange={(e) => setForm((f) => ({ ...f, isExternal: e.target.value === 'external', userId: '', userName: '' }))}>
            <option value="platform">{t('watch.buyerKindPlatform')}</option>
            <option value="external">{t('watchDetail.externalName')}</option>
          </Select>
        </Field>

        {form.isExternal ? (
          <Field label={t('watchDetail.externalName')} required><Input value={form.externalName} onChange={set('externalName')} required /></Field>
        ) : (
          <Field label={t('watchDetail.coOwner')} htmlFor="shareUserName" hint={t('watch.coOwnerHint')}>
            <SearchCombobox
              id="shareUserName"
              value={form.userId}
              selectedLabel={form.userName}
              search={searchUserOptions}
              placeholder={t('counterparty.placeholder')}
              disabled={submitting}
              onSelect={(id, label) => setForm((f) => ({ ...f, userId: id, userName: label }))}
            />
          </Field>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isConsignment} onChange={set('isConsignment')} />
          {t('watch.consignmentShare')}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('watch.ownership')}>
            <Input type="number" step="0.01" min="0" max="100" value={form.isConsignment ? '0' : form.ownershipPercentage} onChange={set('ownershipPercentage')} disabled={form.isConsignment} />
          </Field>
          <Field label={t('watch.profit')}>
            <Input type="number" step="0.01" min="0" max="100" value={form.profitPercentage} onChange={set('profitPercentage')} placeholder={form.isConsignment ? t('watch.profitExample') : t('watch.profitDefaults')} />
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
