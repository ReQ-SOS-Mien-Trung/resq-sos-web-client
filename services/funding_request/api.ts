import api from "@/config/axios";
import { useAuthStore } from "@/stores/auth.store";
import type {
  FundingRequestEntity,
  FundingRequestItem,
  FundingRequestStatus,
  GetFundingRequestsParams,
  GetFundingRequestsResponse,
  GetFundingRequestItemsParams,
  GetFundingRequestItemsResponse,
  CreateFundingRequestPayload,
  ApproveFundingRequestPayload,
  RejectFundingRequestPayload,
} from "./type";

type FundingRequestRawResponse = {
  data?: FundingRequestRawResponsePayload;
} & FundingRequestRawResponsePayload;

type FundingRequestRawResponsePayload = {
  items?: FundingRequestRawEntity[];
  fundingRequests?: FundingRequestRawEntity[];
  pageNumber?: number;
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  totalItems?: number;
  totalPages?: number;
  pageCount?: number;
  hasPreviousPage?: boolean;
  hasPrevious?: boolean;
  hasNextPage?: boolean;
  hasNext?: boolean;
};

type FundingRequestRawEntity = Partial<FundingRequestEntity> & {
  requestId?: number;
  requestDescription?: string;
  requestedByName?: string;
  reviewedByName?: string | null;
  requestItems?: FundingRequestRawItem[];
  fundingRequestItems?: FundingRequestRawItem[];
};

type FundingRequestRawItem = Partial<FundingRequestItem> & {
  note?: string;
};

type FundingRequestItemsRawResponse = {
  data?: FundingRequestItemsRawResponsePayload;
} & FundingRequestItemsRawResponsePayload;

type FundingRequestItemsRawResponsePayload = {
  items?: FundingRequestRawItem[];
  fundingRequestItems?: FundingRequestRawItem[];
  pageNumber?: number;
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
  totalItems?: number;
  totalPages?: number;
  pageCount?: number;
  hasPreviousPage?: boolean;
  hasPrevious?: boolean;
  hasNextPage?: boolean;
  hasNext?: boolean;
};

function normalizeFundingRequestItem(
  item: FundingRequestRawItem,
): FundingRequestItem {
  return {
    id: item.id,
    row: item.row ?? 0,
    itemName: item.itemName ?? "",
    categoryCode: item.categoryCode ?? "",
    unit: item.unit ?? "",
    quantity: item.quantity ?? 0,
    unitPrice: item.unitPrice ?? 0,
    totalPrice: item.totalPrice,
    itemType: item.itemType ?? "",
    targetGroup: item.targetGroup ?? "",
    receivedDate: item.receivedDate ?? null,
    expiredDate: item.expiredDate ?? null,
    notes: item.notes ?? item.note,
    description: item.description,
    volumePerUnit: item.volumePerUnit,
    weightPerUnit: item.weightPerUnit,
  };
}

function normalizeFundingRequestEntity(
  entity: FundingRequestRawEntity,
): FundingRequestEntity {
  const rawItems =
    entity.items ?? entity.requestItems ?? entity.fundingRequestItems;

  return {
    id: entity.id ?? entity.requestId ?? 0,
    depotId: entity.depotId ?? 0,
    depotName: entity.depotName ?? "",
    totalAmount: entity.totalAmount ?? 0,
    description: entity.description ?? entity.requestDescription ?? "",
    attachmentUrl: entity.attachmentUrl,
    status: (entity.status as FundingRequestStatus | undefined) ?? "Pending",
    approvedCampaignId: entity.approvedCampaignId ?? null,
    approvedCampaignName: entity.approvedCampaignName ?? null,
    requestedByUserName:
      entity.requestedByUserName ?? entity.requestedByName ?? "",
    reviewedByUserName:
      entity.reviewedByUserName ?? entity.reviewedByName ?? null,
    rejectionReason: entity.rejectionReason ?? null,
    createdAt: entity.createdAt ?? new Date(0).toISOString(),
    reviewedAt: entity.reviewedAt ?? null,
    items: rawItems?.map(normalizeFundingRequestItem),
  };
}

function normalizeFundingRequestsResponse(
  raw: FundingRequestRawResponse,
  fallbackPageNumber: number,
  fallbackPageSize: number,
): GetFundingRequestsResponse {
  const payload = raw.data ?? raw;
  const rawItems = payload.items ?? payload.fundingRequests ?? [];
  const items = rawItems.map(normalizeFundingRequestEntity);

  const pageNumber =
    payload.pageNumber ?? payload.currentPage ?? fallbackPageNumber;
  const pageSize = payload.pageSize ?? fallbackPageSize;
  const totalCount = payload.totalCount ?? payload.totalItems ?? items.length;
  const totalPages =
    payload.totalPages ??
    payload.pageCount ??
    Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1)));

  const hasPreviousPage =
    payload.hasPreviousPage ?? payload.hasPrevious ?? pageNumber > 1;
  const hasNextPage =
    payload.hasNextPage ?? payload.hasNext ?? pageNumber < totalPages;

  return {
    items,
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
  };
}

function normalizeFundingRequestItemsResponse(
  raw: FundingRequestItemsRawResponse,
  fallbackPageNumber: number,
  fallbackPageSize: number,
): GetFundingRequestItemsResponse {
  const payload = raw.data ?? raw;
  const rawItems = payload.items ?? payload.fundingRequestItems ?? [];
  const items = rawItems.map(normalizeFundingRequestItem);

  const pageNumber =
    payload.pageNumber ?? payload.currentPage ?? fallbackPageNumber;
  const pageSize = payload.pageSize ?? fallbackPageSize;
  const totalCount = payload.totalCount ?? payload.totalItems ?? items.length;
  const totalPages =
    payload.totalPages ??
    payload.pageCount ??
    Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1)));

  const hasPreviousPage =
    payload.hasPreviousPage ?? payload.hasPrevious ?? pageNumber > 1;
  const hasNextPage =
    payload.hasNextPage ?? payload.hasNext ?? pageNumber < totalPages;

  return {
    items,
    pageNumber,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
  };
}

/**
 * Lấy danh sách yêu cầu cấp quỹ (filter theo nhiều depot, nhiều status)
 * GET /finance/funding-requests
 */
export async function getFundingRequests(
  params?: GetFundingRequestsParams,
): Promise<GetFundingRequestsResponse> {
  const pageNumber = params?.pageNumber ?? 1;
  const pageSize = params?.pageSize ?? 10;

  const { data } = await api.get<FundingRequestRawResponse>(
    "/finance/funding-requests",
    {
      params: {
        pageNumber,
        pageSize,
        depotId: params?.depotId,
        depotIds: params?.depotIds,
        statuses: params?.statuses,
      },
      paramsSerializer: {
        indexes: null, // depotIds=1&depotIds=2 (no brackets)
      },
    },
  );

  return normalizeFundingRequestsResponse(data, pageNumber, pageSize);
}

/**
 * Lấy danh sách các trạng thái funding request
 * GET /finance/funding-requests/metadata/statuses
 */
export async function getFundingRequestStatuses(): Promise<string[]> {
  const { data } = await api.get("/finance/funding-requests/metadata/statuses");
  return data;
}

/**
 * Depot gửi yêu cầu cấp thêm quỹ kèm danh sách vật tư
 * POST /finance/funding-requests
 */
export async function createFundingRequest(
  payload: CreateFundingRequestPayload,
): Promise<void> {
  await api.post("/finance/funding-requests", payload);
}

/**
 * Lấy danh sách vật tư theo funding request
 * GET /finance/funding-requests/{id}/items
 */
export async function getFundingRequestItems(
  id: number,
  params?: GetFundingRequestItemsParams,
): Promise<GetFundingRequestItemsResponse> {
  const pageNumber = params?.pageNumber ?? 1;
  const pageSize = params?.pageSize ?? 20;

  const { data } = await api.get<FundingRequestItemsRawResponse>(
    `/finance/funding-requests/${id}/items`,
    {
      params: { pageNumber, pageSize },
    },
  );

  return normalizeFundingRequestItemsResponse(data, pageNumber, pageSize);
}

/**
 * Download funding request Excel template
 * Proxied via /api/finance/funding-requests/template
 * → GET /finance/funding-requests/template
 */
export async function downloadFundingRequestTemplate(): Promise<{
  blob: Blob;
  filename: string;
}> {
  const token = useAuthStore.getState().accessToken;
  const response = await fetch("/api/finance/funding-requests/template", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  let filename = "mau_yeu_cau_cap_quy.xlsx";

  const utf8Match = disposition.match(/filename\*=[^']*'[^']*'([^;\s]+)/i);
  if (utf8Match) {
    filename = decodeURIComponent(utf8Match[1]);
  } else {
    const asciiMatch = disposition.match(/filename="([^"]+)"/);
    if (asciiMatch) {
      filename = asciiMatch[1];
    } else if (disposition.includes("filename=")) {
      const plain = disposition.match(/filename=([^;\s]+)/);
      if (plain) filename = plain[1];
    }
  }

  const blob = await response.blob();
  return { blob, filename };
}

/**
 * Admin duyệt yêu cầu — chọn campaign để rút tiền
 * PATCH /finance/funding-requests/{id}/approve
 */
export async function approveFundingRequest(
  id: number,
  payload: ApproveFundingRequestPayload,
): Promise<void> {
  await api.patch(`/finance/funding-requests/${id}/approve`, payload);
}

/**
 * Admin từ chối yêu cầu cấp quỹ
 * PATCH /finance/funding-requests/{id}/reject
 */
export async function rejectFundingRequest(
  id: number,
  payload: RejectFundingRequestPayload,
): Promise<void> {
  await api.patch(`/finance/funding-requests/${id}/reject`, payload);
}
