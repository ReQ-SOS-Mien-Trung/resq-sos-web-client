import api from "@/config/axios";
import type {
  GetSystemFundTransactionsParams,
  GetSystemFundTransactionsResponse,
  SystemFundEntity,
  SystemFundMetadataItem,
} from "./type";

export async function getSystemFund(): Promise<SystemFundEntity> {
  const { data } = await api.get("/finance/system-fund");
  return data;
}

export async function getSystemFundTransactionTypes(): Promise<
  SystemFundMetadataItem[]
> {
  const { data } = await api.get("/finance/system-fund/metadata/transaction-types");
  return data;
}

export async function getSystemFundTransactions(
  params: GetSystemFundTransactionsParams,
): Promise<GetSystemFundTransactionsResponse> {
  const { data } = await api.get("/finance/system-fund/transactions", {
    params,
    paramsSerializer: { indexes: null },
  });
  return data;
}
