import api from "@/config/axios";
import { useAuthStore } from "@/stores/auth.store";
import type {
  ClusterRescueSuggestionResponse,
  SseMissionEvent,
} from "@/services/sos_cluster/type";
import {
  GetPromptsResponse,
  GetPromptsParams,
  PromptDetailEntity,
  CreatePromptRequest,
  CreatePromptResponse,
  UpdatePromptRequest,
  PreviewPromptRescueSuggestionRequest,
  TestPromptRescueSuggestionRequest,
  TestPromptRescueSuggestionResponse,
} from "./type";

/**
 * Get all prompts with pagination
 * GET /system/prompts
 */
export async function getPrompts(
  params?: GetPromptsParams,
): Promise<GetPromptsResponse> {
  const { data } = await api.get("/system/prompts", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
    },
  });
  return data;
}

/**
 * Create a new prompt
 * POST /system/prompts
 */
export async function createPrompt(
  request: CreatePromptRequest,
): Promise<CreatePromptResponse> {
  const { data } = await api.post("/system/prompts", request);
  return data;
}

/**
 * Get a prompt by ID
 * GET /system/prompts/{id}
 */
export async function getPromptById(id: number): Promise<PromptDetailEntity> {
  const { data } = await api.get(`/system/prompts/${id}`);
  return data;
}

/**
 * Update a prompt
 * PUT /system/prompts/{id}
 */
export async function updatePrompt(
  id: number,
  request: UpdatePromptRequest,
): Promise<void> {
  await api.put(`/system/prompts/${id}`, request);
}

/**
 * Delete a prompt
 * DELETE /system/prompts/{id}
 */
export async function deletePrompt(id: number): Promise<void> {
  await api.delete(`/system/prompts/${id}`);
}

/**
 * Test a saved prompt with a SOS cluster
 * POST /system/prompts/{id}/test
 */
export async function testPromptRescueSuggestion(
  id: number,
  request: TestPromptRescueSuggestionRequest,
): Promise<TestPromptRescueSuggestionResponse> {
  const { data } = await api.post(`/system/prompts/${id}/test`, request, {
    timeout: 120000,
  });
  return data;
}

/**
 * Stream rescue suggestion preview for an unsaved prompt draft
 * POST /system/prompts/preview-rescue-suggestion/stream
 */
export function streamPromptRescueSuggestionPreview(
  request: PreviewPromptRescueSuggestionRequest,
  callbacks: {
    onStatus: (message: string) => void;
    onChunk: (text: string) => void;
    onResult: (result: ClusterRescueSuggestionResponse) => void;
    onError: (error: string) => void;
    onDone: () => void;
  },
): AbortController {
  const abortController = new AbortController();
  const token = useAuthStore.getState().accessToken;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");

  (async () => {
    try {
      const response = await fetch(
        `${baseUrl}/system/prompts/preview-rescue-suggestion/stream`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        callbacks.onError(
          errorBody || response.statusText || "Preview thất bại.",
        );
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError("Không nhận được luồng phản hồi từ server.");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let nlIdx = buffer.indexOf("\n");
        while (nlIdx !== -1) {
          const line = buffer.slice(0, nlIdx).trim();
          buffer = buffer.slice(nlIdx + 1);

          if (!line.startsWith("data: ")) {
            nlIdx = buffer.indexOf("\n");
            continue;
          }

          const jsonStr = line.slice(6).trim();
          if (!jsonStr) {
            nlIdx = buffer.indexOf("\n");
            continue;
          }

          let event: SseMissionEvent;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            nlIdx = buffer.indexOf("\n");
            continue;
          }

          switch (event.eventType) {
            case "status":
              if (event.data === "done") {
                callbacks.onDone();
                return;
              }
              callbacks.onStatus(event.data || "");
              break;
            case "chunk":
              callbacks.onChunk(event.data || "");
              break;
            case "result":
              if (event.result) {
                callbacks.onResult(event.result);
              }
              break;
            case "error":
              callbacks.onError(event.data || "Preview thất bại.");
              return;
          }

          nlIdx = buffer.indexOf("\n");
        }
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        return;
      }

      callbacks.onError(
        error instanceof Error ? error.message : "Preview thất bại.",
      );
    }
  })();

  return abortController;
}
