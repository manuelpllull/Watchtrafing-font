import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import { authApi } from '@/api/auth';
import {
  clearTokens,
  getAccessToken,
  setUnauthorizedHandler,
  setTokens,
} from '@/api/client';
import { applyPreference, type ThemePreference } from '@/lib/theme';

interface JwtClaims {
  sub?: string;
  email?: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string;
  color_scheme?: string;
  exp?: number;
}

export interface Session {
  userId: string;
  email: string;
  /**
   * UI-only convenience (nav/route visibility). Security decisions are made
   * server-side from the validated JWT — never trust this for authorization.
   */
  role: string;
  /** Per-user color scheme preference stored on the backend. */
  colorScheme: ThemePreference;
}

interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decode(token: string): Session | null {
  try {
    const claims = jwtDecode<JwtClaims>(token);
    const role =
      claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
      'Trader';
    const rawScheme = (claims.color_scheme ?? 'System') as string;
    const colorScheme: ThemePreference =
      rawScheme === 'Light' || rawScheme === 'Dark' ? rawScheme : 'System';
    if (!claims.sub || !claims.email) return null;
    return { userId: claims.sub, email: claims.email, role, colorScheme };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setReady] = useState(false);

  // Bootstrap from stored access token.
  useEffect(() => {
    const token = getAccessToken();
    if (token) setSession(decode(token));
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget server-side revocation of the refresh-token cookie;
    // local cleanup happens regardless of the outcome.
    authApi.logout().catch(() => undefined);
    clearTokens();
    setSession(null);
  }, []);

  // Force logout on expired session (signaled by the API client).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      clearTokens();
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    // Only the access token is visible to JS; the refresh token is an
    // HttpOnly cookie set by the server in the same response.
    setTokens(res.accessToken);
    const next = decode(res.accessToken);
    if (!next) throw new Error('Invalid token returned by server.');
    setSession(next);
    // Login is the one moment where the account's stored preference should
    // overwrite this device's. On a subsequent refresh, the JWT's claim is
    // stale (it was minted at login) so we leave the local choice alone.
    applyPreference(next.colorScheme);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: session !== null,
      isReady,
      login,
      logout,
    }),
    [session, isReady, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>.');
  return ctx;
}