import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandsApi } from '@/api/brands';
import { ApiError } from '@/api/client';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';
import { Field, Input } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { PageError, ErrorBanner, getMessage } from '@/components/ui/ErrorBanner';
import { useTranslation } from '@/i18n';

export default function BrandsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const [name, setName] = useState('');
  const [error, setError] = useState<ApiError | null>(null);

  const brands = useQuery({
    queryKey: ['brands'],
    queryFn: () => brandsApi.list(),
  });
  const create = useMutation({ mutationFn: () => brandsApi.create(name.trim()) });
  const remove = useMutation({ mutationFn: (id: string) => brandsApi.remove(id) });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    try {
      await create.mutateAsync();
      await qc.invalidateQueries({ queryKey: ['brands'] });
      setName('');
      notify(t('brands.created'), 'success');
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const deleteBrand = async (id: string, brandName: string) => {
    const ok = await confirm({
      title: 'Delete brand?',
      message: `Delete ${brandName} from the configured catalog? Existing watches may prevent this.`,
      confirmLabel: 'Delete brand',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(id);
      await qc.invalidateQueries({ queryKey: ['brands'] });
      notify(t('brands.deleted'), 'success');
    } catch (err) {
      notify(getMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{t('brands.title')}</h1>
        <p className="text-sm text-ink-soft">{t('brands.subtitle')}</p>
      </header>

      <form onSubmit={submit} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label={t('brands.new')} htmlFor="brand-name" required>
            <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('brands.namePlaceholder')} required />
          </Field>
        </div>
        <button type="submit" className="btn-primary" disabled={create.isPending}>
          {create.isPending ? <><Spinner /> {t('common.loading')}</> : t('brands.add')}
        </button>
      </form>
      {error && <ErrorBanner error={error} />}

      {brands.isLoading ? (
        <div className="card flex items-center gap-2 p-6 text-sm text-ink-soft"><Spinner /> Loading brands…</div>
      ) : brands.error ? (
        <PageError message={getMessage(brands.error)} />
      ) : (brands.data?.length ?? 0) === 0 ? (
        <EmptyState title={t('brands.empty')} hint={t('brands.emptyHint')} />
      ) : (
        <ul className="card divide-y divide-surface-line">
          {brands.data!.map((brand) => (
            <li key={brand.id} className="flex items-center justify-between px-4 py-3">
              <span className="font-medium">{brand.name}</span>
              <button type="button" className="btn-ghost text-red-600 dark:text-red-400" onClick={() => deleteBrand(brand.id, brand.name)} disabled={remove.isPending}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </div>
  );
}
