export type PromptType =
  | "SosPriorityAnalysis"
  | "MissionPlanning"
  | "MissionRequirementsAssessment"
  | "MissionDepotPlanning"
  | "MissionTeamPlanning"
  | "MissionPlanValidation";

export type AiProvider = "Gemini" | "OpenRouter";

// Prompt Entity (item in paginated list)
export interface PromptEntity {
  id: number;
  name: string;
  promptType: PromptType;
  provider: AiProvider;
  purpose: string | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  version: string | null;
  apiUrl: string | null;
  apiKeyMasked: string | null;
  hasApiKey: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

// Prompt Detail Entity (GET /system/prompts/{id})
export interface PromptDetailEntity extends PromptEntity {
  systemPrompt: string | null;
  userPromptTemplate: string | null;
  apiKey: string | null;
}

// Paginated Response for Prompts
export interface GetPromptsResponse {
  items: PromptEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query params for fetching prompts
export interface GetPromptsParams {
  pageNumber?: number;
  pageSize?: number;
}

// Create Prompt Request
export interface CreatePromptRequest {
  name: string;
  prompt_type: PromptType;
  provider: AiProvider;
  purpose: string;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  version: string;
  api_url?: string;
  api_key?: string;
  is_active?: boolean;
}

// Create Prompt Response
export interface CreatePromptResponse {
  name: string;
  message: string;
}

// Update Prompt Request
export interface UpdatePromptRequest {
  name: string;
  prompt_type: PromptType;
  provider: AiProvider;
  purpose: string;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  version: string;
  api_url?: string;
  api_key?: string;
  is_active: boolean;
}

export interface PreviewPromptRescueSuggestionRequest {
  cluster_id: number;
  source_prompt_id?: number;
  prompt_type: PromptType;
  provider: AiProvider;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  version: string;
  api_url?: string;
  api_key?: string;
}
