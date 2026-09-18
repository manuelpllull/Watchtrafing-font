import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useToast } from '@/components/Toast';
import { Field, Input } from '@/components/ui/Field';
import { AuthShell } from './AuthShell';

export default function ResetPasswordPage() {
  const { notify } = useToast();
  const [params] = useSearchParams();

  const [email, setEmail] = useState(params.get('email') || '');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword({
        email: email.trim(),
        token: token.trim(),
        newPassword,
      });
      notify('Password updated. Please sign in.', 'success');
      setDone(true);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Password updated">
        <Link to="/login" className="btn-primary w-full">
          Continue to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" htmlFor="email" required>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
        </Field>
        <Field label="Reset token" htmlFor="token" required>
          <Input id="token" required value={token} onChange={(e) => setToken(e.target.value)} disabled={submitting} />
        </Field>
        <Field label="New password" htmlFor="newPassword" required>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={submitting}
          />
        </Field>
        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-500 dark:border-red-400/60/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <ul className="list-disc space-y-0.5 pl-5">
              {error.messages.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Updating…' : 'Set new password'}
        </button>
      </form>
    </AuthShell>
  );
}
