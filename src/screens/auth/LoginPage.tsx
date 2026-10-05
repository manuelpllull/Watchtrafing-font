import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/Toast';
import { ApiError } from '@/api/client';
import { Field, Input } from '@/components/ui/Field';
import { AuthShell, ErrorMessages } from './AuthShell';
import { useTranslation } from '@/i18n';

export default function LoginPage() {
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      notify(t('dashboard.welcome'), 'success');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title={t('auth.signIn')} subtitle={t('auth.loginSubtitle')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t('common.email')} htmlFor="email" required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </Field>
        <Field label={t('common.password')} htmlFor="password" required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </Field>
        {error && <ErrorMessages error={error} />}
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? t('common.loading') : t('auth.signIn')}
        </button>
      </form>

      <div className="mt-6 space-y-1 text-center text-sm text-ink-soft">
        <p>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            {t('auth.register')}
          </Link>
        </p>
        <p>
          <Link to="/request-password-reset" className="text-ink-soft hover:underline">
            {t('auth.forgotPassword')}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
