export type AiProvider = "Gemini" | "OpenRouter";

export interface AiConfigSummaryEntity {
  id: number;
  status: "Active" | "Draft" | "Archived" | string;
  name: string;
  provider: AiProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  apiUrl: string | null;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  version: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export type AiConfigDetailEntity = AiConfigSummaryEntity;

export interface GetAiConfigsResponse {
  items: AiConfigSummaryEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetAiConfigsParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface GetAiConfigVersionsResponse {
  sourceAiConfigId: number;
  items: AiConfigSummaryEntity[];
}

export interface CreateAiConfigRequest {
  name: string;
  provider: AiProvider;
  model: string;
  temperature: number;
  max_tokens: number;
  api_url: string;
  api_key?: string;
  version: string;
  is_active?: boolean;
}

export interface UpdateAiConfigRequest {
  name?: string;
  provider?: AiProvider;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  api_url?: string;
  api_key?: string;
  version?: string;
  is_active?: boolean;
}

export interface AiConfigVersionActionResponse {
  id: number;
  name: string;
  version: string | null;
  status: "Active" | "Draft" | "Archived" | string;
  message: string;
}

export interface CreateAiConfigResponse {
  id: number;
  name: string;
  message: string;
}
