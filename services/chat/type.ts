import { HubConnectionState } from "@microsoft/signalr";

export interface WaitingConversationEntity {
  conversationId: number;
  victimId: string | null;
  victimName: string | null;
  selectedTopic: string | null;
  linkedSosRequestId: number | null;
  updatedAt: string;
}

export interface JoinConversationResponse {
  conversationId: number;
  coordinatorId: string;
  status: string;
  systemMessage: string;
}

export interface LeaveConversationResponse {
  conversationId: number;
  coordinatorId: string;
  status: string;
  systemMessage: string;
}

export interface ConversationMessageEntity {
  id: number;
  senderId: string | null;
  senderName: string | null;
  content: string;
  messageType: "UserMessage" | "AiMessage" | "SystemMessage";
  createdAt: string;
}

export interface GetConversationMessagesResponse {
  conversationId: number;
  page: number;
  pageSize: number;
  messages: ConversationMessageEntity[];
}

export interface JoinedConversationEvent {
  conversationId: number;
  message: string;
}

export interface LeftConversationEvent {
  conversationId: number;
}

export interface ReceiveMessageEvent extends ConversationMessageEntity {
  conversationId: number;
}

export interface CoordinatorJoinedEvent {
  conversationId: number;
  coordinatorId: string;
  status: string;
  systemMessage: string;
}

export interface CoordinatorLeftEvent {
  conversationId: number;
  coordinatorId: string;
  status: string;
  systemMessage: string;
}

export type ChatErrorEvent = string;

export interface CoordinatorChatRoomViewModel {
  conversationId: number;
  participantLabel: string;
  topicLabel: string;
  linkedSosRequestId: number | null;
  updatedAt: string;
  statusLabel: "WaitingCoordinator" | "CoordinatorActive";
}

export type CoordinatorChatConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

export interface MessageQueryParams {
  page?: number;
  pageSize?: number;
}

export interface MergeMessagesOptions {
  historyMessages: ConversationMessageEntity[];
  realtimeMessages: ReceiveMessageEvent[];
}

export interface ChatTransportSnapshot {
  state: HubConnectionState;
  stateLabel: CoordinatorChatConnectionState;
}

export const CHAT_METHODS = {
  JoinConversation: "JoinConversation",
  LeaveConversation: "LeaveConversation",
  SendMessage: "SendMessage",
  CoordinatorJoin: "CoordinatorJoin",
  CoordinatorLeave: "CoordinatorLeave",
} as const;

export const CHAT_EVENTS = {
  JoinedConversation: "JoinedConversation",
  LeftConversation: "LeftConversation",
  ReceiveMessage: "ReceiveMessage",
  CoordinatorJoined: "CoordinatorJoined",
  CoordinatorLeft: "CoordinatorLeft",
  Error: "Error",
} as const;
