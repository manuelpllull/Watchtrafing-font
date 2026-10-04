import { apiGet, apiPost, apiPut } from './client';
import type {
  CompleteTradeRequest,
  CounterpartyHistoryResponse,
  CreateTradeRequest,
  MarkTradeInTransitRequest,
  TradeResponse,
} from './types';

export const tradesApi = {
  create: (body: CreateTradeRequest) =>
    apiPost<{ tradeId: string }>('trades', body),
  update: (
    id: string,
    body: {
      salePrice: number;
      saleDate: string;
      buyerUserId?: string | null;
      buyerClientId?: string | null;
      buyerExternalName?: string | null;
    },
  ) => apiPut<void>(`trades/${id}`, body),
  getById: (id: string) => apiGet<TradeResponse>(`trades/${id}`),
  getByWatch: (watchId: string) =>
    apiGet<TradeResponse[]>(`watches/${watchId}/trades`),
  confirm: (id: string) => apiPost<void>(`trades/${id}/confirm`),
  markInTransit: (id: string, body: MarkTradeInTransitRequest) =>
    apiPost<void>(`trades/${id}/in-transit`, body),
  complete: (id: string, body: CompleteTradeRequest) =>
    apiPost<void>(`trades/${id}/complete`, body),
  reject: (id: string) => apiPost<void>(`trades/${id}/reject`),
  cancel: (id: string) => apiPost<void>(`trades/${id}/cancel`),
  getCounterpartyTrades: (counterpartyId: string) =>
    apiGet<CounterpartyHistoryResponse>(
      `trades/counterparty/${counterpartyId}`,
    ),
};