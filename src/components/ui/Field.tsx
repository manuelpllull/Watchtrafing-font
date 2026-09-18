import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { classNames } from '@/lib/format';

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-sm text-red-600 dark:text-red-400">{children}</p>;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  required,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-red-500 dark:text-red-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function Input({
  invalid,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      className={classNames('input', invalid && 'border-red-400 dark:border-red-500 dark:border-red-400/60/40 focus:border-red-500 dark:border-red-400/60 focus:ring-red-200', className)}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      className={classNames('input min-h-[80px]', invalid && 'border-red-400 dark:border-red-500 dark:border-red-400/60/40 focus:border-red-500 dark:border-red-400/60 focus:ring-red-200', className)}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      {...props}
      className={classNames('input', invalid && 'border-red-400 dark:border-red-500 dark:border-red-400/60/40 focus:border-red-500 dark:border-red-400/60 focus:ring-red-200', className)}
    >
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" {...props} className="h-4 w-4 rounded border-surface-line text-brand-600 focus:ring-brand-200" />
      {label}
    </label>
  );
}