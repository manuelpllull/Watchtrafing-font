import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandsApi } from '@/api/brands';
import { clientsApi } from '@/api/clients';
import { watchesApi } from '@/api/watches';
import { tradesApi } from '@/api/trades';
import { ApiError, makeApiError } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  Field,
  Input,
  Select,
  Textarea,
  Checkbox,
} from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { ShareBadge } from '@/components/ui/Badge';
import { SearchCombobox, type ComboboxOption } from '@/components/SearchCombobox';
import { Condition } from '@/api/types';
import type { ClientResponse } from '@/api/types';
import { formatMoney, formatPercent, fromIsoDateTime, toIsoDateTime } from '@/lib/format';
import { searchUserOptions } from '@/lib/userSearch';
import { useTranslation } from '@/i18n';

const CONDITION_OPTIONS = [
  { value: Condition.New, label: 'New' },
  { value: Condition.LikeNew, label: 'Like new' },
  { value: Condition.VeryGood, label: 'Very good' },
  { value: Condition.Good, label: 'Good' },
  { value: Condition.Fair, label: 'Fair' },
];

interface FormState {
  brandId: string;
  model: string;
  referenceNumber: string;
  year: string;
  serialNumber: string;
  condition: Condition;
  boxIncluded: boolean;
  papersIncluded: boolean;
  description: string;
  purchasePrice: string;
  purchaseDate: string;
  boughtFromUserId: string;
}

interface SaleState {
  recordSale: boolean;
  salePrice: string;
  saleDate: string;
  buyerKind: 'external' | 'platform' | 'client';
  buyerUserId: string;
  buyerUserName: string;
  buyerClientId: string;
  buyerExternalName: string;
}

interface ShareDraft {
  key: string;
  kind: 'platform' | 'external';
  userId: string;
  userName: string;
  externalName: string;
  ownershipPercentage: string;
  profitPercentage: string;
  isConsignment: boolean;
}

const emptyShare = (): ShareDraft => ({
  key: crypto.randomUUID(),
  kind: 'platform',
  userId: '',
  userName: '',
  externalName: '',
  ownershipPercentage: '',
  profitPercentage: '',
  isConsignment: false,
});

// A share's cash stake is derived: its percentage of the watch's purchase price
// (expenses are added per person server-side once the watch exists).
const stakeOf = (share: ShareDraft, purchasePrice: number): number =>
  share.isConsignment
    ? 0
    : Math.round((purchasePrice || 0) * (Number(share.ownershipPercentage) || 0)) / 100;

const emptyForm: FormState = {
  brandId: '',
  model: '',
  referenceNumber: '',
  year: '',
  serialNumber: '',
  condition: Condition.VeryGood,
  boxIncluded: true,
  papersIncluded: true,
  description: '',
  purchasePrice: '',
  purchaseDate: fromIsoDateTime(new Date().toISOString()),
  boughtFromUserId: '',
};

const emptySale: SaleState = {
  recordSale: false,
  salePrice: '',
  saleDate: fromIsoDateTime(new Date().toISOString()),
  buyerKind: 'external',
  buyerUserId: '',
  buyerUserName: '',
  buyerClientId: '',
  buyerExternalName: '',
};

export default function WatchFormPage() {
  const { t } = useTranslation();
  const { watchId } = useParams<{ watchId?: string }>();
  const isEdit = !!watchId;
  const navigate = useNavigate();
  const { notify } = useToast();
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();

  const brands = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });

  const clients = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list(),
  });

  const existing = useQuery({
    queryKey: ['watch', watchId],
    queryFn: () => watchesApi.getById(watchId!),
    enabled: isEdit,
  });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [shares, setShares] = useState<ShareDraft[]>([]);
  const [brandName, setBrandName] = useState('');
  const [sellerText, setSellerText] = useState('');
  const [sale, setSale] = useState<SaleState>(emptySale);
  const [error, setError] = useState<ApiError | null>(null);

  // Hydrate the form when editing.
  useEffect(() => {
    if (!isEdit || !existing.data) return;
    const w = existing.data;
    setBrandName(w.brand.name);
    setForm({
      brandId: w.brand.id,
      model: w.model,
      referenceNumber: w.referenceNumber || '',
      year: w.year ? String(w.year) : '',
      serialNumber: w.serialNumber || '',
      condition: w.condition,
      boxIncluded: w.boxIncluded,
      papersIncluded: w.papersIncluded,
      description: w.description,
      purchasePrice: String(w.purchasePrice),
      purchaseDate: fromIsoDateTime(w.purchaseDate),
      boughtFromUserId: w.boughtFromUserId || '',
    });
  }, [isEdit, existing.data]);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value =
        e.target.type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setForm((f) => ({ ...f, [key]: value as never }));
    };

  const setSaleField =
    (key: keyof SaleState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value =
        e.target.type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setSale((s) => ({ ...s, [key]: value as never }));
    };

  const saveWatch = useMutation({
    mutationFn: async (payload: {
      brandId: string;
      model: string;
      referenceNumber: string | null;
      year: number | null;
      serialNumber: string | null;
      condition: Condition;
      boxIncluded: boolean;
      papersIncluded: boolean;
      description: string;
      purchasePrice: number;
      purchaseDate: string;
      boughtFromUserId?: string | null;
    }) => {
      if (isEdit) {
        return watchesApi.update(watchId!, payload).then(() => watchId!);
      }
      return watchesApi.create(payload).then((r) => r.watchId);
    },
  });

  const removeShare = useMutation({
    mutationFn: ({ watchId, shareId }: { watchId: string; shareId: string }) =>
      watchesApi.removeShare(watchId, shareId),
    onSuccess: async () => {
      notify(t('watch.invitationRemoved'), 'success');
      await qc.invalidateQueries({ queryKey: ['watch', watchId] });
      await qc.invalidateQueries({ queryKey: ['myWatches'] });
      await qc.invalidateQueries({ queryKey: ['shareInvites'] });
    },
    onError: (err: Error) => notify(err.message, 'error'),
  });

  const onRemoveExistingShare = async (shareId: string, name: string) => {
    const ok = await confirm({
      title: 'Remove invitation',
      message: `Remove the pending invitation for ${name}?`,
      confirmLabel: 'Remove',
      tone: 'danger',
    });
    if (ok) removeShare.mutate({ watchId: watchId!, shareId });
  };

  const existingShares = useMemo(
    () => (isEdit ? (existing.data?.shares ?? []) : []),
    [isEdit, existing.data],
  );

  const createTrade = useMutation({
    mutationFn: tradesApi.create,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.brandId) {
      setError(makeApiError(t('watch.chooseBrand')));
      return;
    }
    if (!isEdit && sellerText.trim() && !form.boughtFromUserId) {
      setError(makeApiError(t('watch.boughtFromRequired')));
      return;
    }
    const purchasePrice = Number(form.purchasePrice);
    if (!form.purchasePrice || Number.isNaN(purchasePrice)) {
      setError(makeApiError(t('watch.purchasePriceRequired')));
      return;
    }

    // Validate sale payload up-front.
    let salePayload: {
      salePrice: number;
      saleDate: string;
      buyerUserId?: string | null;
      buyerClientId?: string | null;
      buyerExternalName?: string | null;
    } | null = null;
    if (sale.recordSale) {
      const sp = Number(sale.salePrice);
      if (!sale.salePrice || Number.isNaN(sp)) {
        setError(makeApiError(t('watch.salePriceRequired')));
        return;
      }
      if (!sale.saleDate) {
        setError(makeApiError(t('watch.saleDateRequired')));
        return;
      }
      if (sale.buyerKind === 'platform') {
        if (!sale.buyerUserId) {
          setError(makeApiError(t('watch.buyerRequired')));
          return;
        }
        salePayload = {
          salePrice: sp,
          saleDate: toIsoDateTime(sale.saleDate),
          buyerUserId: sale.buyerUserId,
          buyerClientId: null,
          buyerExternalName: null,
        };
      } else if (sale.buyerKind === 'client') {
        const selectedClient = clients.data?.find((client) => client.id === sale.buyerClientId);
        if (!selectedClient) {
          setError(makeApiError(t('watch.crmClientRequired')));
          return;
        }
        salePayload = {
          salePrice: sp,
          saleDate: toIsoDateTime(sale.saleDate),
          buyerUserId: null,
          buyerClientId: selectedClient.id,
          buyerExternalName: null,
        };
      } else {
        if (!sale.buyerExternalName.trim()) {
          setError(makeApiError(t('watch.externalBuyerRequired')));
          return;
        }
        salePayload = {
          salePrice: sp,
          saleDate: toIsoDateTime(sale.saleDate),
          buyerUserId: null,
          buyerClientId: null,
          buyerExternalName: sale.buyerExternalName.trim(),
        };
      }
    }

    const selectedClient = sale.buyerKind === 'client'
      ? clients.data?.find((client) => client.id === sale.buyerClientId)
      : undefined;
    const requiresConfirmation = !!salePayload?.buyerUserId || !!selectedClient?.linkedUserId;
    if (sale.recordSale && requiresConfirmation) {
      const ok = await confirm({
        title: t('watch.recordSaleTitle'),
        message: selectedClient?.linkedUserId
          ? t('watch.recordSaleLinkedClient')
          : t('watch.recordSaleConfirmMessage'),
        confirmLabel: t('watch.recordSaleConfirm'),
      });
      if (!ok) return;
    }

    const watchPayload = {
      brandId: form.brandId,
      model: form.model.trim(),
      referenceNumber: form.referenceNumber.trim() || null,
      year: form.year ? Number(form.year) : null,
      serialNumber: form.serialNumber.trim() || null,
      condition: Number(form.condition),
      boxIncluded: form.boxIncluded,
      papersIncluded: form.papersIncluded,
      description: form.description,
      purchasePrice,
      purchaseDate: toIsoDateTime(form.purchaseDate),
      boughtFromUserId: form.boughtFromUserId || null,
    };

    // Validate share drafts up-front (they are sent after the watch is created).
    const validShares = shares.filter((s) => {
      if (s.kind === 'platform') return !!s.userId;
      return !!s.externalName.trim();
    });
    for (const s of validShares) {
      const own = Number(s.ownershipPercentage || 0);
      const prof = Number(s.profitPercentage || s.ownershipPercentage || 0);
      if (s.isConsignment) {
        if (own !== 0) {
          setError(makeApiError(t('watch.consignmentRules')));
          return;
        }
        if (prof < 0 || prof > 100) {
          setError(makeApiError(t('watch.consignmentProfitRange')));
          return;
        }
      } else if (own <= 0 || own > 100) {
        setError(makeApiError(t('watch.shareRules')));
        return;
      }
    }
    const skippedSale = sale.recordSale && validShares.length > 0;

    try {
      const id = (await saveWatch.mutateAsync(watchPayload)) as string;
      for (const s of validShares) {
        await watchesApi.addShare(id, {
          userId: s.kind === 'platform' ? s.userId : null,
          externalName: s.kind === 'external' ? s.externalName.trim() : null,
          ownershipPercentage: s.isConsignment ? 0 : Number(s.ownershipPercentage),
          profitPercentage: Number(s.profitPercentage || s.ownershipPercentage || 0),
          isConsignment: s.isConsignment,
        });
      }
      if (sale.recordSale && salePayload && !skippedSale) {
        await createTrade.mutateAsync({
          watchId: id,
          salePrice: salePayload.salePrice,
          saleDate: salePayload.saleDate,
          buyerUserId: salePayload.buyerUserId,
          buyerClientId: salePayload.buyerClientId,
          buyerExternalName: salePayload.buyerExternalName,
        });
      }
      await qc.invalidateQueries({ queryKey: ['myWatches'] });
      if (isEdit) await qc.invalidateQueries({ queryKey: ['watch', watchId] });
      notify(
        skippedSale
          ? t('watch.savedSaleDeferred')
          : sale.recordSale
            ? t('watch.savedAndTrade')
            : validShares.length > 0
              ? t('watch.savedWithShares')
              : t('watch.saved'),
        'success',
      );
      navigate(`/watches/${id}`);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const brandOptions = useMemo<ComboboxOption[]>(
    () => (brands.data ?? []).map((b) => ({ id: b.id, label: b.name })),
    [brands.data],
  );

  const searchBrands = useCallback(async (term: string): Promise<ComboboxOption[]> => {
    const list = await brandsApi.search(term);
    return list.map((b) => ({ id: b.id, label: b.name }));
  }, []);

  const submitting = saveWatch.isPending || createTrade.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{isEdit ? t('watch.editTitle') : t('watch.addTitle')}</h1>
        <p className="text-sm text-ink-soft">
          {t('watch.addSubtitle')}
        </p>
      </header>

      {existing.isLoading && (
        <div className="card flex items-center gap-2 p-4 text-sm text-ink-soft">
          <Spinner /> Loading watch…
        </div>
      )}
      {brands.isLoading && (
        <div className="card flex items-center gap-2 p-4 text-sm text-ink-soft">
          <Spinner /> Loading brands…
        </div>
      )}

      <form onSubmit={onSubmit} className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('watch.brand')} htmlFor="brand" required hint={t('watch.brandHint')}>
            <SearchCombobox
              id="brand"
              value={form.brandId}
              selectedLabel={brandName}
              disabled={submitting || brands.isLoading}
              idleOptions={brandOptions}
              search={searchBrands}
              placeholder={t('watch.brandPlaceholder')}
              onSelect={(id, name) => {
                setBrandName(name);
                setForm((f) => ({ ...f, brandId: id }));
              }}
            />
          </Field>
          <Field label={t('watch.model')} htmlFor="model" required>
            <Input id="model" value={form.model} onChange={set('model')} disabled={submitting} required />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('watch.reference')} htmlFor="reference">
            <Input id="reference" value={form.referenceNumber} onChange={set('referenceNumber')} disabled={submitting} />
          </Field>
          <Field label={t('watch.year')} htmlFor="year">
            <Input id="year" type="number" value={form.year} onChange={set('year')} disabled={submitting} />
          </Field>
          <Field label={t('watch.serial')} htmlFor="serial" hint={t('watch.descriptionHint')}>
            <Input id="serial" value={form.serialNumber} onChange={set('serialNumber')} disabled={submitting} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('watch.condition')} htmlFor="condition" required>
            <Select id="condition" value={form.condition} onChange={set('condition')} disabled={submitting}>
              {CONDITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-4">
            <Checkbox
              label={t('watch.boxIncluded')}
              checked={form.boxIncluded}
              onChange={set('boxIncluded')}
              disabled={submitting}
            />
            <Checkbox
              label={t('watch.papersIncluded')}
              checked={form.papersIncluded}
              onChange={set('papersIncluded')}
              disabled={submitting}
            />
          </div>
        </div>

        <Field label={t('watch.description')} htmlFor="description">
          <Textarea id="description" value={form.description} onChange={set('description')} disabled={submitting} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('watch.purchasePrice')} htmlFor="purchasePrice" required hint={t('watch.purchasePriceHint')}>
            <Input id="purchasePrice" type="number" step="0.01" min="0" value={form.purchasePrice} onChange={set('purchasePrice')} disabled={submitting} required />
          </Field>
          <Field label={t('watch.purchaseDate')} htmlFor="purchaseDate" required>
            <Input id="purchaseDate" type="datetime-local" value={form.purchaseDate} onChange={set('purchaseDate')} disabled={submitting} required />
          </Field>
        </div>

        {!isEdit && (
          <Field label={t('watch.boughtFrom')} htmlFor="boughtFrom" hint={t('watch.boughtFromHint')}>
            <SearchCombobox
              id="boughtFrom"
              value={form.boughtFromUserId}
              selectedLabel={sellerText}
              disabled={submitting}
              search={searchUserOptions}
              placeholder={t('counterparty.placeholder')}
              onSelect={(id, name) => {
                setSellerText(name);
                setForm((f) => ({ ...f, boughtFromUserId: id }));
              }}
            />
          </Field>
        )}

        {/* Sale / trade section — workflow §4.1 */}
        <fieldset className="rounded-xl border border-surface-line p-4">
          <legend className="px-1 text-sm font-semibold">{t('watch.saleSection')}</legend>
          <Checkbox
            label={t('watch.saleCheckbox')}
            checked={sale.recordSale}
            onChange={setSaleField('recordSale')}
            disabled={submitting}
          />
          {sale.recordSale && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('watch.salePrice')} htmlFor="salePrice" required>
                  <Input id="salePrice" type="number" step="0.01" min="0" value={sale.salePrice} onChange={setSaleField('salePrice')} disabled={submitting} required />
                </Field>
                <Field label={t('watch.saleDate')} htmlFor="saleDate" required>
                  <Input id="saleDate" type="datetime-local" value={sale.saleDate} onChange={setSaleField('saleDate')} disabled={submitting} required />
                </Field>
              </div>

              <Field label={t('watch.buyerKind')} htmlFor="buyerKind">
                <Select id="buyerKind" value={sale.buyerKind} onChange={setSaleField('buyerKind')} disabled={submitting}>
                  <option value="external">{t('watch.buyerKindExternal')}</option>
                  <option value="platform">{t('watch.buyerKindPlatform')}</option>
                  <option value="client">{t('watch.buyerKindClient')}</option>
                </Select>
              </Field>

              {sale.buyerKind === 'platform' ? (
                <Field
                  label={t('watch.buyerKind')}
                  htmlFor="buyerUserName"
                  hint={t('watch.buyerRequired')}
                >
                  <SearchCombobox
                    id="buyerUserName"
                    value={sale.buyerUserId}
                    selectedLabel={sale.buyerUserName}
                    disabled={submitting}
                    search={searchUserOptions}
                    placeholder={t('counterparty.placeholder')}
                    onSelect={(id, label) =>
                      setSale((s) => ({
                        ...s,
                        buyerUserId: id,
                        buyerUserName: label,
                        buyerExternalName: '',
                      }))
                    }
                  />
                </Field>
              ) : sale.buyerKind === 'client' ? (
                <div className="space-y-2">
                  <Field label={t('watch.crmClient')} htmlFor="buyerClientId" hint={t('watch.crmClientHint')}>
                    <Select id="buyerClientId" value={sale.buyerClientId} onChange={setSaleField('buyerClientId')} disabled={submitting}>
                      <option value="">{t('watch.chooseClient')}</option>
                      {clients.data?.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}{client.linkedUserName ? ` · @${client.linkedUserName}` : ' · external'}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {clients.isLoading && <p className="text-sm text-ink-soft">{t('watch.loadingClients')}</p>}
                  {clients.error && <p className="text-sm text-red-600 dark:text-red-400">{t('watch.crmClientLoadFailed')}</p>}
                  <Link to="/clients/new" className="inline-block text-sm font-medium text-brand-600 hover:underline">
                    {t('watch.addClient')}
                  </Link>
                  {sale.buyerClientId && (
                    <ClientSaleHint client={clients.data?.find((client) => client.id === sale.buyerClientId)} />
                  )}
                </div>
              ) : (
                <Field label={t('watch.externalBuyerLabel')} htmlFor="buyerExternalName" hint={t('watch.externalBuyerHint')}>
                  <Input id="buyerExternalName" value={sale.buyerExternalName} onChange={setSaleField('buyerExternalName')} disabled={submitting} placeholder={t('trades.externalBuyerPlaceholder')} />
                </Field>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="rounded-xl border border-surface-line p-4">
          <legend className="px-1 text-sm font-semibold">{t('watch.sharesSection')}</legend>
          <p className="mb-3 text-xs text-ink-soft">
            {t('watch.sharesHint')}
          </p>

          {isEdit && existingShares.length > 0 && (
            <ul className="mb-4 divide-y divide-surface-line rounded-lg border border-surface-line">
              {existingShares.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {s.userName ? `@${s.userName}` : s.externalName || 'Unknown'}
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
                  <div className="flex shrink-0 items-center gap-2">
                    <ShareBadge status={s.status} />
                    {s.status === 'Pending' && (
                      <button
                        type="button"
                        className="btn-ghost px-2 py-1 text-xs text-red-600 dark:text-red-400"
                        onClick={() => onRemoveExistingShare(s.id, s.userName ? `@${s.userName}` : s.externalName || t('watch.coOwner'))}
                        disabled={removeShare.isPending}
                      >
                        {t('common.remove')}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {shares.length === 0 ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShares((s) => [...s, emptyShare()])}
              disabled={submitting}
            >
              + Add co-owner
            </button>
          ) : (
            <>
              <div className="space-y-3">
                {shares.map((share, index) => (
                  <ShareDraftRow
                    key={share.key}
                    share={share}
                    purchasePrice={Number(form.purchasePrice) || 0}
                    onChange={(patch) =>
                      setShares((all) =>
                        all.map((s, i) => (i === index ? { ...s, ...patch } : s)),
                      )
                    }
                    onRemove={() =>
                      setShares((all) => all.filter((_, i) => i !== index))
                    }
                    disabled={submitting}
                  />
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShares((s) => [...s, emptyShare()])}
                  disabled={submitting}
                >
                  {t('watch.addAnother')}
                </button>
                <ShareTotals shares={shares} />
              </div>
            </>
          )}
        </fieldset>

        {error && <ErrorList error={error} />}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add watch'}
          </button>
        </div>
      </form>

      {dialog}
    </div>
  );
}

function ErrorList({ error }: { error: ApiError }) {
  return (
    <div className="rounded-lg border border-red-200 dark:border-red-500 dark:border-red-400/60/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
      <ul className="list-disc space-y-0.5 pl-5">
        {error.messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

function ClientSaleHint({ client }: { client: ClientResponse | undefined }) {
  if (!client) return null;
  return (
    <div className="rounded-lg bg-ink/5 px-3 py-2 text-sm text-ink">
      <span className="font-semibold">{client.name}</span>{' '}
      <span>{client.linkedUserId ? 'is linked to a platform user and will need to confirm.' : 'will complete as an external sale.'}</span>
    </div>
  );
}

// ── Co-owner draft row ─────────────────────────────────
function ShareDraftRow({
  share,
  purchasePrice,
  onChange,
  onRemove,
  disabled,
}: {
  share: ShareDraft;
  purchasePrice: number;
  onChange: (patch: Partial<ShareDraft>) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-surface-line bg-ink/[0.02] p-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-40 flex-1">
          <Field label={t('watch.coOwnerType')}>
            <Select
              value={share.kind}
              onChange={(e) =>
                onChange({ kind: e.target.value as ShareDraft['kind'], userId: '', userName: '' })
              }
              disabled={disabled}
            >
              <option value="platform">{t('watch.buyerKindPlatform')}</option>
              <option value="external">{t('watchDetail.externalName')}</option>
            </Select>
          </Field>
        </div>

        {share.kind === 'platform' ? (
          <div className="min-w-48 flex-[2]">
            <Field
              label={t('watch.coOwner')}
              htmlFor={`share-user-${share.key}`}
              hint={t('watch.coOwnerHint')}
            >
              <SearchCombobox
                id={`share-user-${share.key}`}
                value={share.userId}
                selectedLabel={share.userName}
                disabled={disabled}
                search={searchUserOptions}
                placeholder={t('counterparty.placeholder')}
                onSelect={(id, label) => onChange({ userId: id, userName: label })}
              />
            </Field>
          </div>
        ) : (
          <div className="min-w-48 flex-[2]">
            <Field label={t('watch.externalName')} required>
              <Input
                value={share.externalName}
                onChange={(e) => onChange({ externalName: e.target.value })}
                disabled={disabled}
                placeholder={t('watchDetail.externalNamePlaceholder')}
              />
            </Field>
          </div>
        )}

        <button
          type="button"
          className="btn-ghost mt-6 px-2 text-red-600 dark:text-red-400"
          onClick={onRemove}
          disabled={disabled}
          aria-label={t('watch.removeCoOwner')}
        >
          {t('common.remove')}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Field label={t('watch.ownership')}>
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={share.ownershipPercentage}
            onChange={(e) => onChange({ ownershipPercentage: e.target.value })}
            disabled={disabled || share.isConsignment}
            placeholder="50"
          />
        </Field>
        <Field label={t('watch.profit')}>
          <Input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={share.profitPercentage}
            onChange={(e) => onChange({ profitPercentage: e.target.value })}
            disabled={disabled}
            placeholder={t('watch.profitDefaults')}
          />
        </Field>
        <Field label={t('watch.moneyDown')} hint={t('watch.moneyDownHint')}>
          <div className="flex h-9 items-center rounded-lg bg-ink/5 px-3 text-sm font-medium text-ink">
            {formatMoney(stakeOf(share, purchasePrice))}
          </div>
        </Field>
      </div>

      <label className="mt-2 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={share.isConsignment}
          onChange={(e) =>
            onChange({
              isConsignment: e.target.checked,
              ownershipPercentage: e.target.checked ? '0' : share.ownershipPercentage,
            })
          }
          disabled={disabled}
        />
        {t('watch.consignment')}
      </label>
    </div>
  );
}

function ShareTotals({ shares }: { shares: ShareDraft[] }) {
  const { t } = useTranslation();
  const own = shares.reduce((sum, s) => sum + Number(s.ownershipPercentage || 0), 0);
  const prof = shares.reduce(
    (sum, s) => sum + Number(s.profitPercentage || s.ownershipPercentage || 0),
    0,
  );
  const ok = Math.abs(own - 100) < 0.01 && Math.abs(prof - 100) < 0.01;
  return (
    <p className="text-xs text-ink-soft">
      {t('watch.totalOwnership')}: {own.toFixed(2)}% · {t('watch.totalProfit')}: {prof.toFixed(2)}%
      {!ok && <span className="ml-1 text-amber-700 dark:text-amber-400">{t('watch.overHundred')}</span>}
    </p>
  );
}
