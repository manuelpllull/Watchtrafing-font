import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useToast } from '@/components/Toast';
import { Field, Input } from '@/components/ui/Field';
import { AuthShell, ErrorMessages } from './AuthShell';

export default function RegisterPage() {
  const { notify } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    userName: '',
    displayName: '',
    country: 'CH',
    timeZone: 'Europe/Zurich',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.register({
        email: form.email.trim(),
        userName: form.userName.trim(),
        displayName: form.displayName.trim(),
        country: form.country || null,
        timeZone: form.timeZone || null,
        password: form.password,
      });
      notify('Account created. You can sign in now.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Start managing your watch collection and trades."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" htmlFor="email" required>
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} disabled={submitting} />
        </Field>
        <Field label="Username" htmlFor="userName" required hint="Used for counterparty lookup.">
          <Input id="userName" autoComplete="username" required value={form.userName} onChange={set('userName')} disabled={submitting} />
        </Field>
        <Field label="Display name" htmlFor="displayName" required>
          <Input id="displayName" required value={form.displayName} onChange={set('displayName')} disabled={submitting} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country" htmlFor="country" hint="ISO code, e.g. CH">
            <Input id="country" value={form.country} onChange={set('country')} disabled={submitting} />
          </Field>
          <Field label="Time zone" htmlFor="timeZone" hint="IANA, e.g. Europe/Zurich">
            <Input id="timeZone" value={form.timeZone} onChange={set('timeZone')} disabled={submitting} />
          </Field>
        </div>
        <Field label="Password" htmlFor="password" required>
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} disabled={submitting} />
        </Field>
        {error && <ErrorMessages error={error} />}
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
