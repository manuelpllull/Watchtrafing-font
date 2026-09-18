import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Cog } from 'lucide-react';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 text-center">
        <Cog size={34} strokeWidth={1.6} className="text-ink" />
        <span className="font-display text-2xl font-semibold tracking-tight">WatchTrading</span>
      </Link>
      <div className="card p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function ErrorMessages({ error }: { error: { messages: string[] } }) {
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
