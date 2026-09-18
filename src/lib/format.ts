import type {
  Condition,
  ExpenseType,
  TradeStatus,
  WatchStatus,
} from '@/api/types';
import {
  CONDITION_LABELS,
  EXPENSE_LABELS,
  TRADE_STATUS_LABELS,
  WATCH_STATUS_LABELS,
} from '@/api/types';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.format(d);
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFormatter.format(d);
}

/** Convert a value to an ISO date-time expected by the backend. */
export function toIsoDateTime(value: string): string {
  // <input type="datetime-local"> returns "YYYY-MM-DDTHH:mm". Append seconds + Z.
  if (!value) return '';
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return withSeconds.endsWith('Z') || withSeconds.includes('+')
    ? new Date(withSeconds).toISOString()
    : new Date(withSeconds).toISOString();
}

/** Convert an ISO date-time to the value for <input type="datetime-local">. */
export function fromIsoDateTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(p: number): string {
  return `${Number(p).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

export const conditionLabel = (c: Condition) => CONDITION_LABELS[c] ?? String(c);
export const watchStatusLabel = (s: WatchStatus) =>
  WATCH_STATUS_LABELS[s] ?? String(s);
export const tradeStatusLabel = (s: TradeStatus) =>
  TRADE_STATUS_LABELS[s] ?? String(s);
export const expenseLabel = (e: ExpenseType) =>
  EXPENSE_LABELS[e] ?? String(e);

export function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}