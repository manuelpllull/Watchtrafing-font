import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import { NotificationToggle } from '@/components/NotificationToggle';
import { useTranslation } from '@/i18n';

export function AccountMenu({
  email,
  onLogout,
}: {
  email?: string | null;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const initial = (email ?? '?').charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-3 pr-1 transition hover:bg-ink/10"
      >
        <span className="hidden truncate text-sm text-ink-soft md:inline" title={email ?? undefined}>
          {email}
        </span>
        <span className="avatar h-9 w-9 text-base">{initial}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="animate-pop-in absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-surface-line bg-surface-header shadow-lg"
        >
          <p className="truncate border-b border-surface-line px-4 py-3 text-sm text-ink-soft" title={email ?? undefined}>
            {email}
          </p>
          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 font-display text-[15px] text-ink hover:bg-ink/10"
          >
            <UserRound size={15} className="text-ink-faint" />
            {t('nav.profile')}
          </Link>
          <NotificationToggle onDone={() => setOpen(false)} />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left font-display text-[15px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/100/10"
          >
            <LogOut size={15} />
            {t('nav.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
