// Domain types matching docs/openapi.yaml (System.Text.Json camelCase output).

export enum Condition {
  New = 0,
  LikeNew = 1,
  VeryGood = 2,
  Good = 3,
  Fair = 4,
}

export enum WatchStatus {
  OwnedOnly = 0,
  ForSale = 1,
  Sold = 2,
}

export enum TradeStatus {
  Pending = 0,
  InTransit = 1,
  Completed = 2,
  Cancelled = 3,
}

export enum ExpenseType {
  Repair = 0,
  Service = 1,
  Accessory = 2,
  MissingPart = 3,
  Shipping = 4,
}

export type ShareStatus = 'Pending' | 'Accepted' | 'Rejected';

// ── Auth ──────────────────────────────────────────────
export interface AuthTokenResponse {
  accessToken: string;
  // NOTE: the refresh token is NOT here — the backend sets it as an HttpOnly
  // cookie (wt_refresh) on login/refresh, so it is invisible to JavaScript.
}

export interface RegisterRequest {
  email: string;
  userName: string;
  displayName: string;
  country?: string | null;
  timeZone?: string | null;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  token: string;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

// ── Users ──────────────────────────────────────────────
export interface UpdateProfileRequest {
  displayName: string;
  country?: string | null;
  timeZone?: string | null;
  description: string;
}

export interface BlockUserRequest {
  blockedUserId: string;
}

export interface UserResponse {
  id: string;
  email: string;
  userName: string;
  displayName: string;
  description: string;
  country: string | null;
  timeZone: string | null;
  emailVerified: boolean;
  role: string;
  colorScheme: 'System' | 'Light' | 'Dark';
  completedTradesAsBuyer: number;
  completedTradesAsSeller: number;
  cancelledTradesAsBuyer: number;
  cancelledTradesAsSeller: number;
}

export interface BlockedUserResponse {
  userId: string;
  email: string;
  userName: string;
}

// ── Personal CRM ──────────────────────────────────────
export interface ClientResponse {
  id: string;
  name: string;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  wallapopProfileLink: string | null;
  vintedProfileLink: string | null;
  chrono24ProfileLink: string | null;
  linkedUserId: string | null;
  linkedUserName: string | null;
  tradeCount: number;
  createdAt: string;
}

export interface ClientTradeResponse {
  id: string;
  watchId: string;
  watchBrand: string;
  watchModel: string;
  salePrice: number;
  saleDate: string;
  status: TradeStatus;
  createdAt: string;
}

export interface ClientDetailResponse {
  id: string;
  name: string;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  wallapopProfileLink: string | null;
  vintedProfileLink: string | null;
  chrono24ProfileLink: string | null;
  linkedUserId: string | null;
  linkedUserName: string | null;
  createdAt: string;
  trades: ClientTradeResponse[];
}

export interface ClientRequest {
  name: string;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  wallapopProfileLink?: string | null;
  vintedProfileLink?: string | null;
  chrono24ProfileLink?: string | null;
  linkedUserName?: string | null;
}

export interface CounterpartyProfileResponse {
  id: string;
  userName: string;
  displayName: string;
  country: string | null;
  completedTradesAsBuyer: number;
  completedTradesAsSeller: number;
  cancelledTradesAsBuyer: number;
  cancelledTradesAsSeller: number;
  completedTradesWithYou: number;
}

// ── Brands ─────────────────────────────────────────────
export interface Brand {
  id: string;
  name: string;
}

// ── Watches ────────────────────────────────────────────
export interface AdditionalExpense {
  id: string;
  watchId: string;
  title: string;
  cost: number;
  expenseType: ExpenseType;
  description: string;
  paidByUserId: string | null;
  paidByExternalName: string | null;
}

export interface WatchShareResponse {
  id: string;
  userId: string | null;
  userName: string | null;
  externalName: string | null;
  ownershipPercentage: number;
  profitPercentage: number;
  moneyDown: number;
  isConsignment: boolean;
  status: ShareStatus;
  createdAt: string;
}

export interface MyShareInvitation {
  id: string;
  watchId: string;
  watchLabel: string;
  referenceNumber: string | null;
  inviterUserName: string;
  ownershipPercentage: number;
  profitPercentage: number;
  moneyDown: number;
  isConsignment: boolean;
  status: ShareStatus;
  createdAt: string;
}

export interface WatchResponse {
  id: string;
  ownerUserId: string;
  ownerUserName: string | null;
  brand: Brand;
  additionalExpenses: AdditionalExpense[];
  shares: WatchShareResponse[];
  model: string;
  referenceNumber: string | null;
  year: number | null;
  serialNumber: string | null;
  condition: Condition;
  boxIncluded: boolean;
  papersIncluded: boolean;
  status: WatchStatus;
  description: string;
  purchasePrice: number;
  salePrice: number | null;
  purchaseDate: string;
  saleDate: string | null;
  boughtFromUserId: string | null;
  soldToUserId: string | null;
  isManaged: boolean;
  profit: number | null;
  margin: number | null;
}

export interface WatchesByUserIdResponse {
  watches: WatchResponse[];
}

export interface CreateWatchRequest {
  brandId: string;
  model: string;
  referenceNumber?: string | null;
  year?: number | null;
  serialNumber?: string | null;
  condition: Condition;
  boxIncluded: boolean;
  papersIncluded: boolean;
  description: string;
  purchasePrice: number;
  purchaseDate: string; // ISO date-time
  boughtFromUserId?: string | null;
}

export type UpdateWatchRequest = Omit<CreateWatchRequest, 'boughtFromUserId'>;

export interface AddExpenseRequest {
  title: string;
  cost: number;
  expenseType: ExpenseType;
  description: string;
  paidByUserId?: string | null;
  paidByExternalName?: string | null;
}

export interface AddShareRequest {
  userId?: string | null;
  externalName?: string | null;
  ownershipPercentage: number;
  profitPercentage?: number | null;
  moneyDown: number;
  isConsignment: boolean;
}

// ── Trades ────────────────────────────────────────────
export interface CreateTradeRequest {
  watchId: string;
  salePrice: number;
  saleDate: string; // ISO date-time
  buyerUserId?: string | null;
  buyerClientId?: string | null;
  buyerExternalName?: string | null;
}

export interface CompleteTradeRequest {
  paymentReference?: string | null;
}

export interface MarkTradeInTransitRequest {
  shippingReference?: string | null;
}

export interface TradeSettlementResponse {
  id: string;
  watchShareId: string;
  shareholderName: string | null;
  profitPercentage: number;
  profitAmount: number;
  payoutAmount: number;
}

export interface TradeResponse {
  id: string;
  watchId: string;
  salePrice: number;
  saleDate: string;
  buyerUserId: string | null;
  buyerUserName: string | null;
  buyerClientId: string | null;
  buyerExternalName: string | null;
  status: TradeStatus;
  paymentReference: string | null;
  shippingReference: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  settlements: TradeSettlementResponse[];
  createdAt: string;
}

export interface CounterpartyTradeResponse {
  id: string;
  watchId: string;
  watchBrand: string;
  watchModel: string;
  sellerId: string;
  buyerUserId: string | null;
  salePrice: number;
  saleDate: string;
  status: TradeStatus;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface CounterpartyHistoryResponse {
  counterpartyId: string;
  counterpartyUserName: string;
  counterpartyDisplayName: string;
  soldByYou: number;
  boughtByYou: number;
  totalCompleted: number;
  totalPending: number;
  totalCancelled: number;
  trades: CounterpartyTradeResponse[];
}

// ── Activity ──────────────────────────────────────────
export interface ActivityResponse {
  id: string;
  userId: string;
  activityType: string;
  entityId: string | null;
  description: string;
  createdAt: string;
}

// ── Error envelope (RFC 7807) ─────────────────────────
export interface ProblemDetailsError {
  code: string;
  description: string;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: ProblemDetailsError[];
}

// Helper labels
/** i18n keys for the enum labels shown in badges and detail rows. */
export type LabelKey = string;

export const CONDITION_LABELS: Record<Condition, LabelKey> = {
  [Condition.New]: 'condition.New',
  [Condition.LikeNew]: 'condition.LikeNew',
  [Condition.VeryGood]: 'condition.VeryGood',
  [Condition.Good]: 'condition.Good',
  [Condition.Fair]: 'condition.Fair',
};

export const WATCH_STATUS_LABELS: Record<WatchStatus, LabelKey> = {
  [WatchStatus.OwnedOnly]: 'watchStatus.OwnedOnly',
  [WatchStatus.ForSale]: 'watchStatus.ForSale',
  [WatchStatus.Sold]: 'watchStatus.Sold',
};

export const TRADE_STATUS_LABELS: Record<TradeStatus, LabelKey> = {
  [TradeStatus.Pending]: 'tradeStatus.Pending',
  [TradeStatus.InTransit]: 'tradeStatus.InTransit',
  [TradeStatus.Completed]: 'tradeStatus.Completed',
  [TradeStatus.Cancelled]: 'tradeStatus.Cancelled',
};

export const EXPENSE_LABELS: Record<ExpenseType, LabelKey> = {
  [ExpenseType.Repair]: 'expenseType.Repair',
  [ExpenseType.Service]: 'expenseType.Service',
  [ExpenseType.Accessory]: 'expenseType.Accessory',
  [ExpenseType.MissingPart]: 'expenseType.MissingPart',
  [ExpenseType.Shipping]: 'expenseType.Shipping',
};
