import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { ApiError } from '@/api/client';
import { useToast } from '@/components/Toast';
import { Field, Input } from '@/components/ui/Field';
import { AuthShell } from './AuthShell';

export default function RequestPasswordResetPage() {
  const { notify } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const token = await authApi.requestPasswordReset({ email: email.trim() });
      notify('Reset token generated.', 'success');
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      // Show the returned token in dev (backend stubs email sending).
      notify(`Reset token (stub): ${token}`, 'info');
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="We'll generate a reset token (email sending is stubbed).">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" htmlFor="email" required>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
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
          {submitting ? 'Requesting…' : 'Request reset token'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
