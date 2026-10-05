import { useEffect, type ReactNode } from 'react';
import { useTranslation } from '@/i18n';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="backdrop-fade absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="modal-panel card relative z-10 w-full max-w-lg rounded-b-none rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-surface-line px-5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            type="button"
            className="btn-ghost -mr-2 h-8 w-8 rounded-full p-0 text-xl leading-none"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-surface-line px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}