import api from "@/config/axios";
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
