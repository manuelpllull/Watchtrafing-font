import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="text-ink-faint">{icon ?? <Clock size={36} strokeWidth={1.5} />}</div>
      <div>
        <p className="font-display text-lg font-medium text-ink">{title}</p>
        {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}