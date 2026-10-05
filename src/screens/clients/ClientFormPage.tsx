import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/api/clients';
import { usersApi } from '@/api/users';
import type { ClientRequest } from '@/api/types';
import { ApiError } from '@/api/client';
import { useToast } from '@/components/Toast';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { SearchCombobox, type ComboboxOption } from '@/components/SearchCombobox';
import { Spinner } from '@/components/ui/Spinner';
import { useTranslation } from '@/i18n';

interface ClientFormState {
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  wallapopProfileLink: string;
  vintedProfileLink: string;
  chrono24ProfileLink: string;
  linkedUserName: string;
}

const emptyForm: ClientFormState = {
  name: '',
  phoneNumber: '',
  email: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
  wallapopProfileLink: '',
  vintedProfileLink: '',
  chrono24ProfileLink: '',
  linkedUserName: '',
};

export default function ClientFormPage() {
  const { t } = useTranslation();
  const { clientId } = useParams<{ clientId?: string }>();
  const isEdit = !!clientId;
  const navigate = useNavigate();
  const { notify } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [linkedUserId, setLinkedUserId] = useState('');
  const [error, setError] = useState<ApiError | null>(null);

  const existing = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.getById(clientId!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing.data) return;
    const client = existing.data;
    setForm({
      name: client.name,
      phoneNumber: client.phoneNumber || '',
      email: client.email || '',
      address: client.address || '',
      city: client.city || '',
      postalCode: client.postalCode || '',
      country: client.country || '',
      wallapopProfileLink: client.wallapopProfileLink || '',
      vintedProfileLink: client.vintedProfileLink || '',
      chrono24ProfileLink: client.chrono24ProfileLink || '',
      linkedUserName: client.linkedUserName || '',
    });
    setLinkedUserId(client.linkedUserId || '');
  }, [existing.data]);

  const searchUsers = useCallback(async (term: string): Promise<ComboboxOption[]> => {
    const list = await usersApi.search(term);
    return list.map((u) => ({ id: u.id, label: u.userName, hint: u.displayName }));
  }, []);

  const save = useMutation({
    mutationFn: async (body: ClientRequest) => {
      if (isEdit) {
        await clientsApi.update(clientId!, body);
        return clientId!;
      }
      const response = await clientsApi.create(body);
      return response.clientId;
    },
  });

  const set = (key: keyof ClientFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const body: ClientRequest = {
      name: form.name.trim(),
      phoneNumber: form.phoneNumber.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      postalCode: form.postalCode.trim() || null,
      country: form.country.trim() || null,
      wallapopProfileLink: form.wallapopProfileLink.trim() || null,
      vintedProfileLink: form.vintedProfileLink.trim() || null,
      chrono24ProfileLink: form.chrono24ProfileLink.trim() || null,
      linkedUserName: form.linkedUserName.trim() || null,
    };
    if (!body.name) {
      setError(new ApiError(400, { status: 400, title: 'Client name is required.' }));
      return;
    }
    if (body.linkedUserName && !linkedUserId) {
      setError(new ApiError(400, { status: 400, title: 'Pick a platform user from the suggestions to link, or clear the field to unlink.' }));
      return;
    }
    try {
      const id = await save.mutateAsync(body);
      await qc.invalidateQueries({ queryKey: ['clients'] });
      if (isEdit) await qc.invalidateQueries({ queryKey: ['client', clientId] });
      notify(t('clients.saved'), 'success');
      navigate(`/clients/${id}`);
    } catch (err) {
      setError(err as ApiError);
    }
  };

  const submitting = save.isPending;
  if (existing.isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  }
  if (existing.error) {
    return <p className="card p-5 text-sm text-red-700 dark:text-red-300">{t('clients.loadFailed')}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <nav className="text-sm text-ink-soft">
        <Link to="/clients" className="hover:underline">{t('clients.title')}</Link> /{' '}
        <span className="text-ink">{isEdit ? t('clients.update') : t('clients.create')}</span>
      </nav>
      <header>
        <h1 className="text-2xl font-semibold">{isEdit ? t('clients.update') : t('clients.add')}</h1>
        <p className="text-sm text-ink-soft">
          Client records are private to your account. A linked username turns their sales into platform-confirmed trades.
        </p>
      </header>

      <form onSubmit={submit} className="card space-y-5 p-5">
        <section className="space-y-4">
          <h2 className="text-base font-semibold">{t('clients.identity')}</h2>
          <Field label={t('clients.name')} htmlFor="client-name" required>
            <Input id="client-name" value={form.name} onChange={set('name')} required disabled={submitting} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('clients.phone')} htmlFor="client-phone"><Input id="client-phone" value={form.phoneNumber} onChange={set('phoneNumber')} disabled={submitting} /></Field>
            <Field label={t('common.email')} htmlFor="client-email"><Input id="client-email" type="email" value={form.email} onChange={set('email')} disabled={submitting} /></Field>
          </div>
          <Field label={t('clients.address')} htmlFor="client-address"><Textarea id="client-address" value={form.address} onChange={set('address')} disabled={submitting} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t('clients.city')} htmlFor="client-city"><Input id="client-city" value={form.city} onChange={set('city')} disabled={submitting} /></Field>
            <Field label={t('clients.postalCode')} htmlFor="client-postal"><Input id="client-postal" value={form.postalCode} onChange={set('postalCode')} disabled={submitting} /></Field>
            <Field label={t('clients.country')} htmlFor="client-country" hint={t('clients.countryHint')}><Input id="client-country" value={form.country} onChange={set('country')} disabled={submitting} /></Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-surface-line pt-5">
          <h2 className="text-base font-semibold">{t('clients.marketplaceProfiles')}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Wallapop" htmlFor="client-wallapop"><Input id="client-wallapop" type="url" value={form.wallapopProfileLink} onChange={set('wallapopProfileLink')} disabled={submitting} placeholder="https://…" /></Field>
            <Field label="Vinted" htmlFor="client-vinted"><Input id="client-vinted" type="url" value={form.vintedProfileLink} onChange={set('vintedProfileLink')} disabled={submitting} placeholder="https://…" /></Field>
            <Field label="Chrono24" htmlFor="client-chrono24"><Input id="client-chrono24" type="url" value={form.chrono24ProfileLink} onChange={set('chrono24ProfileLink')} disabled={submitting} placeholder="https://…" /></Field>
          </div>
        </section>

        <section className="space-y-3 border-t border-surface-line pt-5">
          <h2 className="text-base font-semibold">{t('clients.linkedUser')}</h2>
          <Field label={t('clients.linkedUsername')} htmlFor="client-linked" hint={t('clients.linkedHint')}>
            <SearchCombobox
              id="client-linked"
              value={linkedUserId}
              selectedLabel={form.linkedUserName}
              disabled={submitting}
              search={searchUsers}
              placeholder={t('counterparty.placeholder')}
              onSelect={(id, name) => {
                setLinkedUserId(id);
                setForm((current) => ({ ...current, linkedUserName: name }));
              }}
            />
          </Field>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-500 dark:border-red-400/60/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <ul className="list-disc space-y-0.5 pl-5">{error.messages.map((message, index) => <li key={index}>{message}</li>)}</ul>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)} disabled={submitting}>{t('common.cancel')}</button>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? t('common.saving') : isEdit ? t('clients.updateConfirm') : t('clients.createConfirm')}</button>
        </div>
      </form>
    </div>
  );
}
