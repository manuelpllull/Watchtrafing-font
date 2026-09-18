import { apiPost } from './client';
import type {
  AuthTokenResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  RequestPasswordResetRequest,
  VerifyEmailRequest,
} from './types';

// All auth endpoints are public (anonymous). The refresh token itself is carried
// in the HttpOnly wt_refresh cookie, so refresh/logout take no token argument.
export const authApi = {
  register: (body: RegisterRequest) =>
    apiPost<string>('users/register', body, true),
  login: (body: LoginRequest) =>
    apiPost<AuthTokenResponse>('users/login', body, true),
  refresh: () => apiPost<AuthTokenResponse>('users/refresh', undefined, true),
  logout: () => apiPost<void>('users/logout', undefined, true),
  verifyEmail: (body: VerifyEmailRequest) =>
    apiPost<void>('users/verify-email', body, true),
  requestPasswordReset: (body: RequestPasswordResetRequest) =>
    apiPost<string>('users/request-password-reset', body, true),
  resetPassword: (body: ResetPasswordRequest) =>
    apiPost<void>('users/reset-password', body, true),
};