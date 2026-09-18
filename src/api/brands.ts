import { apiDelete, apiGet, apiPost } from './client';
import type { Brand } from './types';

export const brandsApi = {
  list: () => apiGet<Brand[]>('brands'),
  search: (name: string) =>
    apiGet<Brand[]>(`brands/search?name=${encodeURIComponent(name)}`),
  getById: (id: string) => apiGet<Brand>(`brands/${id}`),
  create: (name: string) => apiPost<{ brandId: string }>('brands', { name }),
  remove: (id: string) => apiDelete<void>(`brands/${id}`),
};