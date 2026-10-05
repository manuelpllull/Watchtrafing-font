import { apiDelete, apiGet, apiPost, apiPut } from './client';
import type {
  AddExpenseRequest,
  AddShareRequest,
  CreateWatchRequest,
  UpdateWatchRequest,
  WatchResponse,
  WatchesByUserIdResponse,
  WatchShareResponse,
} from './types';

export const watchesApi = {
  listMine: () => apiGet<WatchesByUserIdResponse>('watches'),
  getById: (id: string) => apiGet<WatchResponse>(`watches/${id}`),
  create: (body: CreateWatchRequest) =>
    apiPost<{ watchId: string }>('watches', body),
  update: (id: string, body: UpdateWatchRequest) =>
    apiPut<void>(`watches/${id}`, body),
  remove: (id: string) => apiDelete<void>(`watches/${id}`),
  addExpense: (watchId: string, body: AddExpenseRequest) =>
    apiPost<{ expenseId: string }>(`watches/${watchId}/expenses`, body),
  updateExpense: (watchId: string, expenseId: string, body: AddExpenseRequest) =>
    apiPut<void>(`watches/${watchId}/expenses/${expenseId}`, body),
  removeExpense: (watchId: string, expenseId: string) =>
    apiDelete<void>(`watches/${watchId}/expenses/${expenseId}`),
  addShare: (watchId: string, body: AddShareRequest) =>
    apiPost<{ shareId: string }>(`watches/${watchId}/shares`, body),
  removeShare: (watchId: string, shareId: string) =>
    apiDelete<void>(`watches/${watchId}/shares/${shareId}`),
  getShares: (watchId: string) =>
    apiGet<WatchShareResponse[]>(`watches/${watchId}/shares`),
  acceptShare: (shareId: string) =>
    apiPost<void>(`watches/shares/${shareId}/accept`),
  rejectShare: (shareId: string) =>
    apiPost<void>(`watches/shares/${shareId}/reject`),
};