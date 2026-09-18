import { apiGet } from './client';
import type { ActivityResponse } from './types';

export interface ActivityQuery {
  userId?: string;
  entityId?: string;
  from?: string; // ISO date-time
  to?: string; // ISO date-time
}

export const activityApi = {
  // Admin global query (requires Admin role server-side).
  all: (q: ActivityQuery = {}) => {
    const params = new URLSearchParams();
    if (q.userId) params.set('userId', q.userId);
    if (q.entityId) params.set('entityId', q.entityId);
    if (q.from) params.set('from', q.from);
    if (q.to) params.set('to', q.to);
    const qs = params.toString();
    return apiGet<ActivityResponse[]>(`activity${qs ? `?${qs}` : ''}`);
  },
  mine: () => apiGet<ActivityResponse[]>('activity/mine'),
};