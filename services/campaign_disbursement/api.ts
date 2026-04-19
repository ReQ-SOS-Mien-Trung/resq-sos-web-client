import api from "@/config/axios";
import type {
  AllocateDisbursementRequest,
  CampaignStatusMetadata,
  GetCampaignSpendingParams,
  GetCampaignSpendingResponse,
  GetCampaignsParams,
  GetCampaignsResponse,
  CreateCampaignRequest,
  UpdateCampaignInfoRequest,
  ExtendCampaignRequest,
  UpdateCampaignTargetRequest,
  UpdateCampaignStatusRequest,
} from "./type";

/**
 * Admin chủ động cấp tiền từ Campaign → Depot
 * POST /finance/disbursements/allocate
 */
export async function allocateDisbursement(
  payload: AllocateDisbursementRequest,
): Promise<void> {
  await api.post("/finance/disbursements/allocate", payload);
}

/**
 * Công khai xem tiền campaign đã được dùng mua vật tư gì
 * GET /finance/disbursements/public/campaigns/{campaignId}/spending
 */
export async function getCampaignSpending(
  params: GetCampaignSpendingParams,
): Promise<GetCampaignSpendingResponse> {
  const { campaignId, ...query } = params;
  const { data } = await api.get(
    `/finance/disbursements/public/campaigns/${campaignId}/spending`,
    {
      params: {
        pageNumber: query.pageNumber ?? 1,
        pageSize: query.pageSize ?? 10,
      },
    },
  );
  return data;
}

/**
 * Lấy danh sách chiến dịch gây quỹ có phân trang
 * GET /finance/campaigns
 */
export async function getCampaigns(
  params?: GetCampaignsParams,
): Promise<GetCampaignsResponse> {
  const { data } = await api.get("/finance/campaigns", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 100,
      statuses: params?.statuses,
    },
    paramsSerializer: { indexes: null },
  });
  return data;
}

/**
 * Lấy danh sách trạng thái chiến dịch (dùng cho filter dropdown)
 * GET /finance/campaigns/metadata/statuses
 */
export async function getCampaignStatuses(): Promise<CampaignStatusMetadata[]> {
  const { data } = await api.get("/finance/campaigns/metadata/statuses");
  return data;
}

/**
 * Tạo chiến dịch gây quỹ mới.
 * POST /finance/campaigns
 */
export async function createCampaign(
  payload: CreateCampaignRequest,
): Promise<void> {
  await api.post("/finance/campaigns", payload);
}

/**
 * Cập nhật thông tin cơ bản (tên, khu vực) của chiến dịch.
 * PUT /finance/campaigns/{id}/info
 */
export async function updateCampaignInfo(
  id: number,
  payload: UpdateCampaignInfoRequest,
): Promise<void> {
  await api.put(`/finance/campaigns/${id}/info`, payload);
}

/**
 * Gia hạn ngày kết thúc chiến dịch.
 * PUT /finance/campaigns/{id}/extension
 */
export async function extendCampaign(
  id: number,
  payload: ExtendCampaignRequest,
): Promise<void> {
  await api.put(`/finance/campaigns/${id}/extension`, payload);
}

/**
 * Tăng mục tiêu số tiền cần gây quỹ.
 * PUT /finance/campaigns/{id}/target
 */
export async function updateCampaignTarget(
  id: number,
  payload: UpdateCampaignTargetRequest,
): Promise<void> {
  await api.put(`/finance/campaigns/${id}/target`, payload);
}

/**
 * Thay đổi trạng thái chiến dịch.
 * PATCH /finance/campaigns/{id}/status
 */
export async function updateCampaignStatus(
  id: number,
  payload: UpdateCampaignStatusRequest,
): Promise<void> {
  await api.patch(`/finance/campaigns/${id}/status`, payload);
}

/**
 * Lấy biểu đồ biến động quỹ chiến dịch
 * GET /finance/campaigns/{id}/chart/fund-flow
 */
export async function getCampaignFundFlowChart(
  campaignId: number,
  params?: import("./type").GetCampaignFundFlowParams,
): Promise<import("./type").CampaignFundFlowChartResponse> {
  const { data } = await api.get(
    `/finance/campaigns/${campaignId}/chart/fund-flow`,
    { params },
  );
  return data;
}
