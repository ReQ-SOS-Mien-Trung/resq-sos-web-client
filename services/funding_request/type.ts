/* ── Funding Request Types ── */

export type FundingRequestStatus = "Pending" | "Approved" | "Rejected";

/* ── Item inside a funding request ── */

export interface FundingRequestItem {
  id: number;
  row: number;
  itemName: string;
  categoryCode: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemType: string;
  targetGroup: string;
  receivedDate: string;
  expiredDate: string;
  notes: string;
}

/* ── Funding Request Entity ── */

export interface FundingRequestEntity {
  id: number;
  depotId: number;
  depotName: string;
  totalAmount: number;
  description: string;
  attachmentUrl: string;
  status: FundingRequestStatus;
  approvedCampaignId: number | null;
  approvedCampaignName: string | null;
  requestedByUserName: string;
  reviewedByUserName: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  items: FundingRequestItem[];
}

/* ── GET /finance/funding-requests ── */

export interface GetFundingRequestsParams {
  pageNumber?: number;
  pageSize?: number;
  depotIds?: number[];
  statuses?: string[];
}

export interface GetFundingRequestsResponse {
  items: FundingRequestEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/* ── POST /finance/funding-requests ── */

export interface CreateFundingRequestItem {
  row: number;
  itemName: string;
  categoryCode: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemType: string;
  targetGroup: string;
  receivedDate: string;
  expiredDate: string;
  notes: string;
}

export interface CreateFundingRequestPayload {
  description: string;
  items: CreateFundingRequestItem[];
}

/* ── PATCH /finance/funding-requests/{id}/approve ── */

export interface ApproveFundingRequestPayload {
  campaignId: number;
}

/* ── PATCH /finance/funding-requests/{id}/reject ── */

export interface RejectFundingRequestPayload {
  reason: string;
}
