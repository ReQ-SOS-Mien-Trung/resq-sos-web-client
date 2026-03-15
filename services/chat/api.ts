import api from "@/config/axios";
import {
  GetConversationMessagesResponse,
  JoinConversationResponse,
  MessageQueryParams,
  WaitingConversationEntity,
  CoordinatorChatRoomViewModel,
} from "./type";

/**
 * GET /operations/conversations/waiting
 */
export async function getWaitingConversations(): Promise<
  WaitingConversationEntity[]
> {
  const { data } = await api.get<WaitingConversationEntity[]>(
    "/operations/conversations/waiting",
  );
  return data;
}

/**
 * POST /operations/conversations/{conversationId}/join
 */
export async function joinConversation(
  conversationId: number,
): Promise<JoinConversationResponse> {
  const { data } = await api.post<JoinConversationResponse>(
    `/operations/conversations/${conversationId}/join`,
  );
  return data;
}

/**
 * GET /operations/conversations/{conversationId}/messages?page=1&pageSize=50
 */
export async function getConversationMessages(
  conversationId: number,
  params?: MessageQueryParams,
): Promise<GetConversationMessagesResponse> {
  const { data } = await api.get<GetConversationMessagesResponse>(
    `/operations/conversations/${conversationId}/messages`,
    {
      params: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 50,
      },
    },
  );
  return data;
}

export function toCoordinatorChatRoomViewModel(
  item: WaitingConversationEntity,
): CoordinatorChatRoomViewModel {
  const fallbackVictimLabel = item.victimId
    ? `Victim ${item.victimId.slice(0, 8)}`
    : "Victim Unknown";

  return {
    conversationId: item.conversationId,
    participantLabel: item.victimName?.trim() || fallbackVictimLabel,
    topicLabel: item.selectedTopic?.trim() || "General Support",
    linkedSosRequestId: item.linkedSosRequestId,
    updatedAt: item.updatedAt,
    statusLabel: "WaitingCoordinator",
  };
}
