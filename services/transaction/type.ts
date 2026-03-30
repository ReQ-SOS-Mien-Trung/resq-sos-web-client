// ─── Depot Fund Metadata ───

export interface DepotFundMetadataItem {
  key: string;
  value: string;
}

// ─── Depot Fund Transactions ───

export interface GetDepotFundTransactionsParams {
  depotId: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface DepotFundTransactionItem {
  id: number;
  depotFundId: number;
  transactionType: string;
  amount: number;
  referenceType: string;
  referenceId: number;
  note: string;
  createdBy: string;
  createdAt: string;
}

export interface GetDepotFundTransactionsResponse {
  items: DepotFundTransactionItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Campaign Transactions ───

export interface GetCampaignTransactionsParams {
  id: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface CampaignTransactionItem {
  id: number;
  fundCampaignId: number;
  fundCampaignName: string;
  type: string;
  direction: string;
  amount: number;
  referenceType: string;
  referenceId: number;
  createdByUserName: string;
  createdAt: string;
}

export interface GetCampaignTransactionsResponse {
  items: CampaignTransactionItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
