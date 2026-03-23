import api from "@/config/axios";
import {
  GetDepotFundTransactionsParams,
  GetDepotFundTransactionsResponse,
  GetCampaignTransactionsParams,
  GetCampaignTransactionsResponse,
} from "./type";

/**
 * Get fund transaction history of a depot
 * GET /finance/depot-funds/{depotId}/transactions
 */
export async function getDepotFundTransactions(
  params: GetDepotFundTransactionsParams,
): Promise<GetDepotFundTransactionsResponse> {
  const { depotId, ...query } = params;
  const { data } = await api.get(
    `/finance/depot-funds/${depotId}/transactions`,
    {
      params: query,
    },
  );
  return data;
}

/**
 * Get financial transaction history of a campaign
 * GET /finance/campaigns/{id}/transactions
 */
export async function getCampaignTransactions(
  params: GetCampaignTransactionsParams,
): Promise<GetCampaignTransactionsResponse> {
  const { id, ...query } = params;
  const { data } = await api.get(`/finance/campaigns/${id}/transactions`, {
    params: query,
  });
  return data;
}
