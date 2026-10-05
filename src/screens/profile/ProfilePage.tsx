import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { usersApi } from '@/api/users';
import { ApiError } from '@/api/client';
import { useToast } from '@/components/Toast';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { PageError, ErrorBanner, getMessage } from '@/components/ui/ErrorBanner';
import { useTranslation } from '@/i18n';

interface ProfileForm {
  displayName: string;
  country: string;
  timeZone: string;
  description: string;
}

const emptyForm: ProfileForm = {
  displayName: '',
  country: '',
  timeZone: '',
  description: '',
};

export default function ProfilePage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { notify } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [error, setError] = useState<ApiError | null>(null);

  const profile = useQuery({
    queryKey: ['profile', session?.userId],
    queryFn: () => usersApi.getById(session!.userId),
    enabled: !!session?.userId,
  });
  useEffect(() => {
    if (!profile.data) return;
    setForm({
      displayName: profile.data.displayName,
      country: profile.data.country || '',
      timeZone: profile.data.timeZone || '',
      description: profile.data.description || '',
    });
  }, [profile.data]);

  const update = useMutation({
    mutationFn: () =>
      usersApi.updateMyProfile({
        displayName: form.displayName.trim(),
        country: form.country.trim() || null,
        timeZone: form.timeZone.trim() || null,
        description: form.description.trim(),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['profile', session?.userId] });
      notify(t('profile.updated'), 'success');
    },
  });

  const set = (key: keyof ProfileForm) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((current) => ({ ...current, [key]: e.target.value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await update.mutateAsync();
    } catch (err) {
      setError(err as ApiError);
    }
  };

  if (profile.isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  }
  if (profile.error) return <PageError message={getMessage(profile.error)} />;
  if (!profile.data) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('profile.title')}</h1>
        <p className="text-sm text-ink-soft">{t('profile.subtitle')}</p>
      </header>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xl font-semibold">{profile.data.displayName}</p>
            <p className="text-sm text-ink-soft">@{profile.data.userName} · {profile.data.email}</p>
          </div>
          <span className={profile.data.emailVerified ? 'badge bg-emerald-100 text-emerald-700 dark:text-emerald-400' : 'badge bg-amber-100 text-amber-700 dark:text-amber-400'}>
            {profile.data.emailVerified ? 'Email verified' : 'Email not verified'}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Stat label={t('counterparty.completedAsSeller')} value={profile.data.completedTradesAsSeller} />
          <Stat label={t('counterparty.completedAsBuyer')} value={profile.data.completedTradesAsBuyer} />
          <Stat label={t('counterparty.cancelledAsSeller')} value={profile.data.cancelledTradesAsSeller} />
          <Stat label={t('counterparty.cancelledAsBuyer')} value={profile.data.cancelledTradesAsBuyer} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">{t('profile.personalDetails')}</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('profile.displayName')} htmlFor="displayName" required>
              <Input id="displayName" value={form.displayName} onChange={set('displayName')} required disabled={update.isPending} />
            </Field>
            <Field label={t('profile.country')} htmlFor="country" hint={t('profile.countryHint')}>
              <Input id="country" value={form.country} onChange={set('country')} disabled={update.isPending} />
            </Field>
          </div>
          <Field label={t('profile.timeZone')} htmlFor="timeZone" hint={t('profile.timeZoneHint')}>
            <Input id="timeZone" value={form.timeZone} onChange={set('timeZone')} disabled={update.isPending} />
          </Field>
          <Field label={t('profile.description')} htmlFor="description">
            <Textarea id="description" value={form.description} onChange={set('description')} disabled={update.isPending} />
          </Field>
          {error && <ErrorBanner error={error} />}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>

      <BlockedUsersSection />
    </div>
  );
}

function BlockedUsersSection() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [target, setTarget] = useState<{ id: string; userName: string; displayName: string } | null>(null);
  const [error, setError] = useState('');

  const blocked = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: () => usersApi.getBlocked(),
  });
  const block = useMutation({ mutationFn: (id: string) => usersApi.block(id) });
  const unblock = useMutation({ mutationFn: (id: string) => usersApi.unblock(id) });

  const lookup = async () => {
    setError('');
    setTarget(null);
    try {
      const p = await usersApi.lookupByUsername(username.trim());
      setTarget({ id: p.id, userName: p.userName, displayName: p.displayName });
    } catch (err) {
      setError(getMessage(err));
    }
  };

  const doBlock = async () => {
    if (!target) return;
    try {
      await block.mutateAsync(target.id);
      await qc.invalidateQueries({ queryKey: ['blockedUsers'] });
      setTarget(null);
      setUsername('');
      notify(`@${target.userName} blocked.`, 'success');
    } catch (err) {
      setError(getMessage(err));
    }
  };

  const doUnblock = async (id: string, name: string) => {
    try {
      await unblock.mutateAsync(id);
      await qc.invalidateQueries({ queryKey: ['blockedUsers'] });
      notify(`@${name} unblocked.`, 'success');
    } catch (err) {
      notify(getMessage(err), 'error');
    }
  };

  return (
    <section className="card p-5">
      <h2 className="text-lg font-semibold">{t('profile.blockedUsers')}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t('profile.blockedUsersHint')}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('profile.blockPlaceholder')} />
        <button type="button" className="btn-secondary shrink-0" onClick={lookup} disabled={!username.trim()}>{t('profile.lookUp')}</button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {target && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-300">
          <span><strong>{target.displayName}</strong> (@{target.userName})</span>
          <button type="button" className="btn-danger" onClick={doBlock} disabled={block.isPending}>
            {block.isPending ? t('profile.blocking') : t('profile.block')}
          </button>
        </div>
      )}
      <div className="mt-4">
        {blocked.isLoading ? (
          <p className="text-sm text-ink-soft">{t('profile.loadingBlocked')}</p>
        ) : (blocked.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-ink-faint">{t('profile.noBlocked')}</p>
        ) : (
          <ul className="divide-y divide-surface-line rounded-lg border border-surface-line">
            {blocked.data!.map((user) => (
              <li key={user.userId} className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">@{user.userName}</p>
                  <p className="text-xs text-ink-faint">{user.email}</p>
                </div>
                <button type="button" className="btn-ghost text-sm" onClick={() => doUnblock(user.userId, user.userName)} disabled={unblock.isPending}>
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-ink/5 p-3">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
