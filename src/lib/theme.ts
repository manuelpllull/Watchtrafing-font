export type Theme = 'light' | 'dark';

/** Stored per user on the backend; "System" follows the OS preference. */
export type ThemePreference = 'System' | 'Light' | 'Dark';

const STORAGE_KEY = 'wt-theme';

export function resolvePreference(pref: ThemePreference): Theme {
  if (pref === 'Light') return 'light';
  if (pref === 'Dark') return 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Persist + apply a user preference (e.g. received on login). */
export function applyPreference(pref: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, resolvePreference(pref));
  } catch {
    /* private mode */
  }
  applyTheme(resolvePreference(pref));
}

let transitionTimer: number | undefined;

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* private mode */
  }
  return systemTheme();
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const set = () => {
    root.classList.toggle('dark', theme === 'dark');
    emitThemeChange(theme);
  };

  // Preferred: cross-fade a snapshot of the page (crisp text, no per-glyph
  // color interpolation). Falls back to the .theme-transition class fade.
  if (!reduceMotion && typeof document.startViewTransition === 'function') {
    document.startViewTransition(set);
    return;
  }

  if (!reduceMotion) {
    root.classList.add('theme-transition');
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(
      () => root.classList.remove('theme-transition'),
      350,
    );
  }

  set();
}

// Listeners let React components (e.g. the header toggle icon) stay in sync
// when the theme changes from any source: a click, a login-time preference
// apply, or a change made in another tab.
type ThemeListener = (theme: Theme) => void;
const listeners = new Set<ThemeListener>();

function emitThemeChange(theme: Theme) {
  for (const listener of listeners) listener(theme);
}

export function subscribeTheme(listener: ThemeListener): () => void {
  listeners.add(listener);
  listener(getStoredTheme());
  return () => {
    listeners.delete(listener);
  };
}

// Another tab wrote to the shared key: reflect it here without a reload.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
      applyTheme(e.newValue);
    }
  });
}

export function toggleTheme(): Theme {
  const next: Theme = getStoredTheme() === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* private mode */
  }
  applyTheme(next);
  return next;
}
