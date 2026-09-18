import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '@/api/users';
import type { CounterpartyProfileResponse } from '@/api/types';
import { ApiError } from '@/api/client';
import { Field, Input } from '@/components/ui/Field';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Spinner } from '@/components/ui/Spinner';

export default function CounterpartyLookupPage() {
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<CounterpartyProfileResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (e: FormEvent) => {
    e.preventDefault();
    const value = username.trim();
    if (!value) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      setProfile(await usersApi.lookupByUsername(value));
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Counterparty lookup</h1>
        <p className="text-sm text-ink-soft">
          Check reputation and shared completed trades before recording a deal.
        </p>
      </header>

      <form onSubmit={search} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Username" htmlFor="username" required hint="Exact platform username.">
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="johndoe"
              required
              autoComplete="off"
            />
          </Field>
        </div>
        <button type="submit" className="btn-primary sm:mb-0.5" disabled={loading}>
          {loading ? <><Spinner /> Searching…</> : 'Look up'}
        </button>
      </form>

      {error && <ErrorBanner error={error} />}

      {profile && (
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xl font-semibold">{profile.displayName}</p>
              <p className="text-sm text-ink-soft">
                @{profile.userName}{profile.country ? ` · ${profile.country}` : ''}
              </p>
            </div>
            <Link to={`/counterparty/${profile.id}`} className="btn-secondary">
              View shared history
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Completed as seller" value={profile.completedTradesAsSeller} />
            <Stat label="Completed as buyer" value={profile.completedTradesAsBuyer} />
            <Stat label="Cancelled as seller" value={profile.cancelledTradesAsSeller} />
            <Stat label="Cancelled as buyer" value={profile.cancelledTradesAsBuyer} />
            <Stat label="Completed with you" value={profile.completedTradesWithYou} accent />
          </div>

          <p className="mt-4 text-xs text-ink-faint">
            Reputation is based on platform trade outcomes. Cancellation counts are signals, not ratings.
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={accent ? 'rounded-lg bg-brand-50 p-3 dark:bg-brand-500/15' : 'rounded-lg bg-ink/5 p-3'}>
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={accent ? 'mt-1 text-xl font-semibold text-brand-700' : 'mt-1 text-xl font-semibold'}>
        {value}
      </p>
    </div>
  );
}
