import { useState, type ReactNode } from 'react';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <Spinner className="h-4 w-4" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">{message}</p>
    </Modal>
  );
}

/** Convenience hook to drive a confirm modal declaratively. */
export function useConfirm() {
  const [state, setState] = useState<{
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    tone?: 'primary' | 'danger';
    resolve: (ok: boolean) => void;
  } | null>(null);

  const confirm = (opts: {
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    tone?: 'primary' | 'danger';
  }) =>
    new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });

  const close = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  const dialog = (
    <ConfirmDialog
      open={state !== null}
      title={state?.title ?? ''}
      message={state?.message ?? ''}
      confirmLabel={state?.confirmLabel}
      tone={state?.tone}
      onConfirm={() => close(true)}
      onClose={() => close(false)}
    />
  );

  return { confirm, dialog };
}