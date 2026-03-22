/* ── Disbursement Types ── */

export type DisbursementType = "AdminAllocation" | "FundingRequestApproval";

/* ── POST /finance/disbursements/allocate ── */

export interface AllocateDisbursementRequest {
  fundCampaignId: number;
  depotId: number;
  amount: number;
  purpose: string;
}

/* ── GET /finance/disbursements/public/campaigns/{campaignId}/spending ── */

export interface GetCampaignSpendingParams {
  campaignId: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface CampaignSpendingItem {
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CampaignDisbursement {
  id: number;
  depotName: string;
  amount: number;
  purpose: string;
  type: DisbursementType;
  createdAt: string;
  items: CampaignSpendingItem[];
}

export interface GetCampaignSpendingResponse {
  campaignId: number;
  campaignName: string;
  totalRaised: number;
  totalDisbursed: number;
  remainingBalance: number;
  disbursements: CampaignDisbursement[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

/* ── GET /finance/campaigns ── */

export type CampaignStatus =
  | "Draft"
  | "Active"
  | "Suspended"
  | "Closed"
  | "Archived";

export interface CampaignEntity {
  id: number;
  name: string;
  region: string;
  targetAmount: number;
  totalAmount: number;
  status: CampaignStatus;
  campaignStartDate: string;
  campaignEndDate: string;
  createdAt: string;
}

export interface GetCampaignsParams {
  pageNumber?: number;
  pageSize?: number;
  statuses?: CampaignStatus[];
}

export interface GetCampaignsResponse {
  items: CampaignEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/* ── GET /finance/campaigns/metadata/statuses ── */

export interface CampaignStatusMetadata {
  key: CampaignStatus;
  value: string;
}
