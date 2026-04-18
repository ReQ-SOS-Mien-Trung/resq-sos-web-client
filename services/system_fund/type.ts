export type SystemFundTransactionType =
  | "LiquidationRevenue"
  | "AllocationToDepot"
  | "DepotClosureFundReturn";

export interface SystemFundMetadataItem {
  key: string;
  value: string;
}

export interface SystemFundEntity {
  id: number;
  name: string;
  balance: number;
  lastUpdatedAt: string;
}

export interface GetSystemFundTransactionsParams {
  pageNumber?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  transactionTypes?: SystemFundTransactionType[];
  search?: string;
}

export interface SystemFundTransactionItem {
  id: number;
  systemFundId: number;
  transactionType: string;
  amount: number;
  referenceType: string;
  referenceId: number | null;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface GetSystemFundTransactionsResponse {
  items: SystemFundTransactionItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
