import api from "@/config/axios";
import {
  DepotFundMetadataItem,
  GetDepotFundTransactionsParams,
  GetDepotFundTransactionsResponse,
  GetCampaignTransactionsParams,
  GetCampaignTransactionsResponse,
} from "./type";

/**
 * Get depot fund transaction type metadata (key-value)
 * GET /finance/depot-funds/metadata/transaction-types
 */
export async function getDepotFundTransactionTypes(): Promise<
  DepotFundMetadataItem[]
> {
  const { data } = await api.get(
    "/finance/depot-funds/metadata/transaction-types",
  );
  return data;
}

/**
 * Get depot fund reference type metadata (key-value)
 * GET /finance/depot-funds/metadata/reference-types
 */
export async function getDepotFundReferenceTypes(): Promise<
  DepotFundMetadataItem[]
> {
  const { data } = await api.get(
    "/finance/depot-funds/metadata/reference-types",
  );
  return data;
}

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
      paramsSerializer: { indexes: null },
    },
  );
  return data;
}

/**
 * Get campaign transaction type metadata
 * GET /finance/campaigns/metadata/transaction-types
 */
export async function getCampaignTransactionTypes(): Promise<
  DepotFundMetadataItem[]
> {
  const { data } = await api.get(
    "/finance/campaigns/metadata/transaction-types",
  );
  return data;
}

/**
 * Get campaign reference type metadata
 * GET /finance/campaigns/metadata/reference-types
 */
export async function getCampaignReferenceTypes(): Promise<
  DepotFundMetadataItem[]
> {
  const { data } = await api.get("/finance/campaigns/metadata/reference-types");
  return data;
}

/**
 * Get campaign direction metadata
 * GET /finance/campaigns/metadata/directions
 */
export async function getCampaignDirections(): Promise<
  DepotFundMetadataItem[]
> {
  const { data } = await api.get("/finance/campaigns/metadata/directions");
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
    paramsSerializer: { indexes: null },
  });
  return data;
}
