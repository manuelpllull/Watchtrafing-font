import { apiDelete, apiGet, apiPost, apiPut } from './client';
import type {
  ClientDetailResponse,
  ClientRequest,
  ClientResponse,
} from './types';

export const clientsApi = {
  list: () => apiGet<ClientResponse[]>('clients'),
  getById: (id: string) => apiGet<ClientDetailResponse>(`clients/${id}`),
  create: (body: ClientRequest) =>
    apiPost<{ clientId: string }>('clients', body),
  update: (id: string, body: ClientRequest) =>
    apiPut<void>(`clients/${id}`, body),
  remove: (id: string) => apiDelete<void>(`clients/${id}`),
};
