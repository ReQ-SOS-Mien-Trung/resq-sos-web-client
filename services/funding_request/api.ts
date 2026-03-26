import api from "@/config/axios";
import { useAuthStore } from "@/stores/auth.store";
import type {
  GetFundingRequestsParams,
  GetFundingRequestsResponse,
  CreateFundingRequestPayload,
  ApproveFundingRequestPayload,
  RejectFundingRequestPayload,
} from "./type";

/**
 * Lấy danh sách yêu cầu cấp quỹ (filter theo nhiều depot, nhiều status)
 * GET /finance/funding-requests
 */
export async function getFundingRequests(
  params?: GetFundingRequestsParams,
): Promise<GetFundingRequestsResponse> {
  const { data } = await api.get("/finance/funding-requests", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
      depotIds: params?.depotIds,
      statuses: params?.statuses,
    },
    paramsSerializer: {
      indexes: null, // depotIds=1&depotIds=2 (no brackets)
    },
  });
  return data;
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
