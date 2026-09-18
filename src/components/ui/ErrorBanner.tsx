import type { ReactNode } from 'react';

interface ApiErrorLike {
  message: string;
  messages?: string[];
}

export function ErrorBanner({
  error,
}: {
  error: ApiErrorLike | null | undefined;
}) {
  if (!error) return null;
  const messages = error.messages ?? [error.message];
  return (
    <div className="rounded-lg border border-red-200 dark:border-red-500 dark:border-red-400/60/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
      <ul className="list-disc space-y-0.5 pl-5">
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="card flex items-center gap-3 border-red-200 dark:border-red-500 dark:border-red-400/60/30 bg-red-50 dark:bg-red-500/10 px-5 py-4 text-sm text-red-700 dark:text-red-300">
      <span className="text-lg">⚠</span>
      <span>{message}</span>
    </div>
  );
}

export function getMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (!error) return fallback;
  if (typeof error === 'object' && error && 'messages' in error) {
    const e = error as ApiErrorLike;
    return e.messages?.[0] ?? e.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-red-600 dark:text-red-400">{children}</p>;
}