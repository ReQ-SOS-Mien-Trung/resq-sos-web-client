// Prompt Entity (item in paginated list)
export interface PromptEntity {
  id: number;
  name: string;
  purpose: string;
  model: string;
  temperature: number;
  maxTokens: number;
  version: string;
  apiUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

// Prompt Detail Entity (GET /system/prompts/{id})
export interface PromptDetailEntity extends PromptEntity {
  systemPrompt: string;
  userPromptTemplate: string | null;
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
  purpose: string;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  version: string;
  api_url: string;
}

// Create Prompt Response
export interface CreatePromptResponse {
  name: string;
  message: string;
}

// Update Prompt Request
export interface UpdatePromptRequest {
  name: string;
  purpose: string;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  version: string;
  api_url: string;
  is_active: boolean;
}
