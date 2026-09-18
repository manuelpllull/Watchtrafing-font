import { apiGet, apiPost, apiPut } from './client';
import type {
  BlockedUserResponse,
  CounterpartyProfileResponse,
  UpdateProfileRequest,
  UserResponse,
} from './types';

export const usersApi = {
  getById: (id: string) => apiGet<UserResponse>(`users/${id}`),
  updateMyProfile: (body: UpdateProfileRequest) =>
    apiPut<void>('users/profile', body),
  block: (blockedUserId: string) =>
    apiPost<void>('users/block', { blockedUserId }),
  unblock: (blockedUserId: string) =>
    apiPost<void>('users/unblock', { blockedUserId }),
  getBlocked: () => apiGet<BlockedUserResponse[]>('users/blocked'),
  setTheme: (colorScheme: 'System' | 'Light' | 'Dark') =>
    apiPut<void>('users/theme', { colorScheme }),
  lookupByUsername: (userName: string) =>
    apiGet<CounterpartyProfileResponse>(
      `users/lookup/${encodeURIComponent(userName)}`,
    ),
  search: (userName: string) =>
    apiGet<{ id: string; userName: string; displayName: string }[]>(
      `users/search?userName=${encodeURIComponent(userName)}`,
    ),
};