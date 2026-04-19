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
  currentBalance: number;
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

/* ── POST /finance/campaigns ── */

export interface CreateCampaignRequest {
  name: string;
  region: string;
  campaignStartDate: string;
  campaignEndDate: string;
  targetAmount: number;
}

/* ── PUT /finance/campaigns/{id}/info ── */

export interface UpdateCampaignInfoRequest {
  name: string;
  region: string;
}

/* ── PUT /finance/campaigns/{id}/extension ── */

export interface ExtendCampaignRequest {
  newEndDate: string;
}

/* ── PUT /finance/campaigns/{id}/target ── */

export interface UpdateCampaignTargetRequest {
  newTarget: number;
}

/* ── PATCH /finance/campaigns/{id}/status ── */

export interface UpdateCampaignStatusRequest {
  newStatus: CampaignStatus;
  reason?: string;
}

/* ── GET /finance/campaigns/{id}/chart/fund-flow ── */

export interface CampaignFundFlowDataPoint {
  periodLabel: string;
  totalIn: number;
  totalOut: number;
  netBalance: number;
}

export interface CampaignFundFlowChartResponse {
  campaignId: number;
  campaignName: string;
  granularity: "month" | "week" | string;
  from: string;
  to: string;
  dataPoints: CampaignFundFlowDataPoint[];
}

export interface GetCampaignFundFlowParams {
  from?: string;
  to?: string;
  granularity?: "month" | "week";
}
