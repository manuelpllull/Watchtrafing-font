import { classNames } from '@/lib/format';
import { useTranslation } from '@/i18n';
import type {
  TradeStatus,
  WatchStatus,
} from '@/api/types';
import { tradeStatusLabel, watchStatusLabel } from '@/lib/format';

const tone: Record<string, string> = {
  slate: 'bg-ink/10 text-ink-soft',
  green: 'bg-emerald-900/10 text-emerald-800 dark:text-emerald-400',
  blue: 'bg-brand-200/60 text-brand-800 dark:bg-brand-500/25 dark:text-brand-300',
  amber: 'bg-amber-500/15 text-amber-800 dark:text-amber-400',
  red: 'bg-red-50 dark:bg-red-500/100/10 text-red-700 dark:text-red-300',
  gray: 'bg-ink/5 text-ink-faint',
};

export function Badge({
  children,
  color = 'slate',
}: {
  children: React.ReactNode;
  color?: keyof typeof tone;
}) {
  return <span className={classNames('badge', tone[color])}>{children}</span>;
}

export function WatchStatusBadge({ status }: { status: WatchStatus }) {
  const { t } = useTranslation();
  const map: Record<WatchStatus, keyof typeof tone> = {
    0: 'slate',
    1: 'green',
    2: 'blue',
  };
  return <Badge color={map[status]}>{watchStatusLabel(status, t)}</Badge>;
}

export function TradeStatusBadge({ status }: { status: TradeStatus }) {
  const { t } = useTranslation();
  const map: Record<TradeStatus, keyof typeof tone> = {
    0: 'amber',
    1: 'blue',
    2: 'green',
    3: 'red',
  };
  return <Badge color={map[status]}>{tradeStatusLabel(status, t)}</Badge>;
}

export function ShareBadge({ status }: { status: string }) {
  const color =
    status === 'Accepted'
      ? 'green'
      : status === 'Pending'
        ? 'amber'
        : 'red';
  return <Badge color={color as keyof typeof tone}>{status}</Badge>;
}