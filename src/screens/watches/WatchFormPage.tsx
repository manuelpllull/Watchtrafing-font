import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandsApi } from '@/api/brands';
import { clientsApi } from '@/api/clients';
import { watchesApi } from '@/api/watches';
import { tradesApi } from '@/api/trades';
import { usersApi } from '@/api/users';
import { ApiError } from '@/api/client';
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
import { SearchCombobox, type ComboboxOption } from '@/components/SearchCombobox';
import { Condition } from '@/api/types';
import type { ClientResponse } from '@/api/types';
import { fromIsoDateTime, toIsoDateTime } from '@/lib/format';

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
  buyerUserName: string;
  buyerClientId: string;
  buyerExternalName: string;
}

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
  buyerUserName: '',
  buyerClientId: '',
  buyerExternalName: '',
};

export default function WatchFormPage() {
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
  const [brandName, setBrandName] = useState('');
  const [sellerText, setSellerText] = useState('');
  const [sale, setSale] = useState<SaleState>(emptySale);
  const [error, setError] = useState<ApiError | null>(null);
  const [buyerLookup, setBuyerLookup] = useState({
    loading: false,
    result: null as { id: string; userName: string; displayName: string } | null,
    error: '' as string,
  });

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

  const createTrade = useMutation({
    mutationFn: tradesApi.create,
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.brandId) {
      setError(makeError('Choose a brand.'));
      return;
    }
    if (!isEdit && sellerText.trim() && !form.boughtFromUserId) {
      setError(makeError('Look up the seller by username to confirm they exist before saving.'));
      return;
    }
    const purchasePrice = Number(form.purchasePrice);
    if (!form.purchasePrice || Number.isNaN(purchasePrice)) {
      setError(makeError('Purchase price is required.'));
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
        setError(makeError('Sale price is required when recording a sale.'));
        return;
      }
      if (!sale.saleDate) {
        setError(makeError('Sale date is required when recording a sale.'));
        return;
      }
      if (sale.buyerKind === 'platform') {
        if (!buyerLookup.result) {
          setError(makeError('Look up the buyer by username first.'));
          return;
        }
        salePayload = {
          salePrice: sp,
          saleDate: toIsoDateTime(sale.saleDate),
          buyerUserId: buyerLookup.result.id,
          buyerClientId: null,
          buyerExternalName: null,
        };
      } else if (sale.buyerKind === 'client') {
        const selectedClient = clients.data?.find((client) => client.id === sale.buyerClientId);
        if (!selectedClient) {
          setError(makeError('Choose a CRM client first.'));
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
          setError(makeError('External buyer label is required.'));
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
        title: 'Record this sale?',
        message: selectedClient?.linkedUserId
          ? 'This linked CRM client resolves to a platform user. A pending trade will be created and they must confirm or reject it.'
          : 'A pending trade will be created. The buyer must confirm or reject it before it completes.',
        confirmLabel: 'Record sale',
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

    try {
      const id = (await saveWatch.mutateAsync(watchPayload)) as string;
      if (sale.recordSale && salePayload) {
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
        sale.recordSale ? 'Watch saved and trade recorded.' : 'Watch saved.',
        'success',
      );
      navigate(`/watches/${id}`);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const lookupBuyer = async () => {
    setBuyerLookup({ loading: true, result: null, error: '' });
    try {
      const profile = await usersApi.lookupByUsername(sale.buyerUserName.trim());
      setBuyerLookup({
        loading: false,
        result: {
          id: profile.id,
          userName: profile.userName,
          displayName: profile.displayName,
        },
        error: '',
      });
      setSale((s) => ({ ...s, buyerExternalName: '' }));
    } catch (err) {
      setBuyerLookup({
        loading: false,
        result: null,
        error: err instanceof Error ? err.message : 'User not found.',
      });
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

  const searchSellers = useCallback(async (term: string): Promise<ComboboxOption[]> => {
    const list = await usersApi.search(term);
    return list.map((u) => ({ id: u.id, label: u.userName, hint: u.displayName }));
  }, []);

  const submitting = saveWatch.isPending || createTrade.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{isEdit ? 'Edit watch' : 'Add watch'}</h1>
        <p className="text-sm text-ink-soft">
          Record details. Optionally mark the watch as sold to create a trade.
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
          <Field label="Brand" htmlFor="brand" required hint="Type to search the catalog.">
            <SearchCombobox
              id="brand"
              value={form.brandId}
              selectedLabel={brandName}
              disabled={submitting || brands.isLoading}
              idleOptions={brandOptions}
              search={searchBrands}
              placeholder="Start typing a brand…"
              onSelect={(id, name) => {
                setBrandName(name);
                setForm((f) => ({ ...f, brandId: id }));
              }}
            />
          </Field>
          <Field label="Model" htmlFor="model" required>
            <Input id="model" value={form.model} onChange={set('model')} disabled={submitting} required />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Reference" htmlFor="reference">
            <Input id="reference" value={form.referenceNumber} onChange={set('referenceNumber')} disabled={submitting} />
          </Field>
          <Field label="Year" htmlFor="year">
            <Input id="year" type="number" value={form.year} onChange={set('year')} disabled={submitting} />
          </Field>
          <Field label="Serial" htmlFor="serial" hint="Private — not exposed publicly.">
            <Input id="serial" value={form.serialNumber} onChange={set('serialNumber')} disabled={submitting} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Condition" htmlFor="condition" required>
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
              label="Box included"
              checked={form.boxIncluded}
              onChange={set('boxIncluded')}
              disabled={submitting}
            />
            <Checkbox
              label="Papers included"
              checked={form.papersIncluded}
              onChange={set('papersIncluded')}
              disabled={submitting}
            />
          </div>
        </div>

        <Field label="Description" htmlFor="description">
          <Textarea id="description" value={form.description} onChange={set('description')} disabled={submitting} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Purchase price" htmlFor="purchasePrice" required hint="In EUR.">
            <Input id="purchasePrice" type="number" step="0.01" min="0" value={form.purchasePrice} onChange={set('purchasePrice')} disabled={submitting} required />
          </Field>
          <Field label="Purchase date" htmlFor="purchaseDate" required>
            <Input id="purchaseDate" type="datetime-local" value={form.purchaseDate} onChange={set('purchaseDate')} disabled={submitting} required />
          </Field>
        </div>

        {!isEdit && (
          <Field label="Bought from (platform user)" htmlFor="boughtFrom" hint="Optional. Type a username — users blocked by you (or who blocked you) won't show up.">
            <SearchCombobox
              id="boughtFrom"
              value={form.boughtFromUserId}
              selectedLabel={sellerText}
              disabled={submitting}
              search={searchSellers}
              placeholder="e.g. johndoe"
              onSelect={(id, name) => {
                setSellerText(name);
                setForm((f) => ({ ...f, boughtFromUserId: id }));
              }}
            />
          </Field>
        )}

        {/* Sale / trade section — workflow §4.1 */}
        <fieldset className="rounded-xl border border-surface-line p-4">
          <legend className="px-1 text-sm font-semibold">Record a sale (optional)</legend>
          <Checkbox
            label="I sold this watch — create a trade"
            checked={sale.recordSale}
            onChange={setSaleField('recordSale')}
            disabled={submitting}
          />
          {sale.recordSale && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sale price" htmlFor="salePrice" required>
                  <Input id="salePrice" type="number" step="0.01" min="0" value={sale.salePrice} onChange={setSaleField('salePrice')} disabled={submitting} required />
                </Field>
                <Field label="Sale date" htmlFor="saleDate" required>
                  <Input id="saleDate" type="datetime-local" value={sale.saleDate} onChange={setSaleField('saleDate')} disabled={submitting} required />
                </Field>
              </div>

              <Field label="Buyer" htmlFor="buyerKind">
                <Select id="buyerKind" value={sale.buyerKind} onChange={setSaleField('buyerKind')} disabled={submitting}>
                  <option value="external">External buyer (non-platform)</option>
                  <option value="platform">Platform user</option>
                </Select>
              </Field>

              {sale.buyerKind === 'platform' ? (
                <div className="space-y-2">
                  <Field label="Buyer username" htmlFor="buyerUserName" hint="Look them up to verify reputation before dealing.">
                    <div className="flex gap-2">
                      <Input
                        id="buyerUserName"
                        value={sale.buyerUserName}
                        onChange={setSaleField('buyerUserName')}
                        disabled={submitting}
                        placeholder="e.g. johndoe"
                      />
                      <button type="button" className="btn-secondary shrink-0" onClick={lookupBuyer} disabled={submitting || !sale.buyerUserName.trim() || buyerLookup.loading}>
                        {buyerLookup.loading ? <Spinner /> : 'Look up'}
                      </button>
                    </div>
                  </Field>
                  {buyerLookup.error && <p className="text-sm text-red-600 dark:text-red-400">{buyerLookup.error}</p>}
                  {buyerLookup.result && (
                    <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-500/15 dark:text-brand-300">
                      <span className="font-semibold">{buyerLookup.result.displayName}</span>{' '}
                      <span>(@{buyerLookup.result.userName}) · will need to confirm</span>
                    </div>
                  )}
                </div>
              ) : sale.buyerKind === 'client' ? (
                <div className="space-y-2">
                  <Field label="CRM client" htmlFor="buyerClientId" hint="The client is private to your CRM. Linked clients require platform confirmation.">
                    <Select id="buyerClientId" value={sale.buyerClientId} onChange={setSaleField('buyerClientId')} disabled={submitting}>
                      <option value="">Choose a client…</option>
                      {clients.data?.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}{client.linkedUserName ? ` · @${client.linkedUserName}` : ' · external'}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {clients.isLoading && <p className="text-sm text-ink-soft">Loading your clients…</p>}
                  {clients.error && <p className="text-sm text-red-600 dark:text-red-400">Unable to load CRM clients.</p>}
                  <Link to="/clients/new" className="inline-block text-sm font-medium text-brand-600 hover:underline">
                    + Add a new CRM client
                  </Link>
                  {sale.buyerClientId && (
                    <ClientSaleHint client={clients.data?.find((client) => client.id === sale.buyerClientId)} />
                  )}
                </div>
              ) : (
                <Field label="External buyer label" htmlFor="buyerExternalName" hint="Free text, e.g. 'Local dealer'. Trade completes immediately.">
                  <Input id="buyerExternalName" value={sale.buyerExternalName} onChange={setSaleField('buyerExternalName')} disabled={submitting} placeholder="Local dealer" />
                </Field>
              )}
            </div>
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

function makeError(message: string): ApiError {
  return new ApiError(400, { status: 400, title: message, detail: message });
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
