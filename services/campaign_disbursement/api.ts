import api from "@/config/axios";
import type {
  AllocateDisbursementRequest,
  CampaignStatusMetadata,
  GetCampaignSpendingParams,
  GetCampaignSpendingResponse,
  GetCampaignsParams,
  GetCampaignsResponse,
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
