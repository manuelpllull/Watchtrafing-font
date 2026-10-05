import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Cog, Moon, Plus, Sun } from 'lucide-react';
import { usersApi } from '@/api/users';
import { useAuth } from '@/auth/AuthContext';
import { useShareInvitations } from '@/components/useShareInvitations';
import { AccountMenu } from '@/components/AccountMenu';
import { useToast } from '@/components/Toast';
import { classNames } from '@/lib/format';
import { getStoredTheme, toggleTheme, type Theme } from '@/lib/theme';

interface NavItem {
  to: string;
  label: string;
  adminOnly?: boolean;
  /** Shows a count of pending share invitations next to the label. */
  badge?: number;
}

const NAV: NavItem[] = [
  { to: '/watches', label: 'Collection' },
  { to: '/invitations', label: 'Invitations' },
  { to: '/trades', label: 'Trades' },
  { to: '/lookup', label: 'Counterparties' },
  { to: '/clients', label: 'Clients' },
  { to: '/activity', label: 'Activity' },
  { to: '/brands', label: 'Brands', adminOnly: true },
];

export function Layout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  // One query backs the badge, the dashboard card and the invitations page.
  const { pending } = useShareInvitations();

  const items = NAV.filter((i) => !i.adminOnly || session?.role === 'Admin').map((i) =>
    i.to === '/invitations' ? { ...i, badge: pending.length } : i,
  );

  const onLogout = () => {
    logout();
    notify('Signed out.', 'info');
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-surface-line bg-surface-header/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2.5">
            <Cog size={30} strokeWidth={1.6} className="text-ink" />
            <span className="font-display text-xl font-semibold tracking-tight">
              WatchTrading
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                className={({ isActive }) =>
                  classNames(
                    'rounded-lg px-3 py-2 font-display text-[15px] font-medium tracking-tight transition',
                    isActive
                      ? 'text-brand-700'
                      : 'text-ink-soft hover:bg-ink/10 hover:text-ink',
                  )
                }
              >
                {i.label}
                {i.badge ? (
                  <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    {i.badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/watches/new"
              className="btn-primary hidden px-3 py-1.5 text-[13px] sm:inline-flex"
            >
              <Plus size={15} strokeWidth={2.5} />
              Add watch
            </Link>
            <button
              type="button"
              className="btn-ghost px-2 lg:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              ☰
            </button>
            <button
              type="button"
              onClick={() => {
                const next = toggleTheme();
                setTheme(next);
                if (session) {
                  // Persist server-side so the preference follows the account.
                  usersApi
                    .setTheme(next === 'dark' ? 'Dark' : 'Light')
                    .catch(() => undefined);
                }
              }}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="btn-ghost h-9 w-9 rounded-full p-0"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <AccountMenu email={session?.email} onLogout={onLogout} />
          </div>
        </div>

        {/* Mobile nav */}
        {open && (
          <nav className="animate-fade-in border-t border-surface-line bg-surface-header lg:hidden">
            <div className="mx-auto max-w-6xl px-2 py-2">
              {items.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    classNames(
                      'block rounded-lg px-3 py-2.5 font-display text-[15px] font-medium',
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                        : 'text-ink hover:bg-ink/10',
                    )
                  }
                >
                  <span className="flex items-center justify-between gap-2">
                    {i.label}
                    {i.badge ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                        {i.badge}
                      </span>
                    ) : null}
                  </span>
                </NavLink>
              ))}
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2.5 text-left font-display text-[15px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-500/10"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
              >
                Sign out
              </button>
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <p className="pb-10 text-center text-xs text-ink-faint">
        WatchTrading PWA · {session?.role}
      </p>
    </div>
  );
}
