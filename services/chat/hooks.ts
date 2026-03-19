"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getConversationMessages,
  getWaitingConversations,
  joinConversation,
  toCoordinatorChatRoomViewModel,
} from "./api";
import {
  CHAT_EVENTS,
  ConversationMessageEntity,
  CoordinatorChatConnectionState,
  JoinedConversationEvent,
  CoordinatorJoinedEvent,
  GetConversationMessagesResponse,
  JoinConversationResponse,
  LeftConversationEvent,
  MessageQueryParams,
  ReceiveMessageEvent,
  WaitingConversationEntity,
} from "./type";
import { coordinatorChatTransport } from "./transport";

export const WAITING_CONVERSATIONS_QUERY_KEY = [
  "chat",
  "waiting-conversations",
] as const;

export const CONVERSATION_MESSAGES_QUERY_KEY = [
  "chat",
  "conversation-messages",
] as const;

export interface UseConversationMessagesOptions {
  enabled?: boolean;
}

export function useWaitingConversations() {
  return useQuery<WaitingConversationEntity[]>({
    queryKey: WAITING_CONVERSATIONS_QUERY_KEY,
    queryFn: getWaitingConversations,
    refetchInterval: 15000,
  });
}

export function useJoinConversation() {
  return useMutation<JoinConversationResponse, Error, number>({
    mutationFn: (conversationId: number) => joinConversation(conversationId),
  });
}

export function useConversationMessages(
  conversationId: number | null,
  params?: MessageQueryParams,
  options?: UseConversationMessagesOptions,
) {
  return useQuery<GetConversationMessagesResponse>({
    queryKey: [
      ...CONVERSATION_MESSAGES_QUERY_KEY,
      conversationId,
      params?.page ?? 1,
      params?.pageSize ?? 50,
    ],
    queryFn: () => getConversationMessages(conversationId as number, params),
    enabled:
      (options?.enabled ?? true) &&
      conversationId !== null &&
      conversationId > 0,
  });
}

export interface UseCoordinatorChatConnectionOptions {
  enabled?: boolean;
  activeConversationId: number | null;
  onJoinedConversation?: (event: JoinedConversationEvent) => void;
  onReceiveMessage?: (message: ReceiveMessageEvent) => void;
  onCoordinatorJoined?: (event: CoordinatorJoinedEvent) => void;
  onLeftConversation?: (event: LeftConversationEvent) => void;
  onError?: (errorMessage: string) => void;
  onResyncRequested?: () => void;
}

export function useCoordinatorChatConnection(
  options: UseCoordinatorChatConnectionOptions,
) {
  const {
    enabled = true,
    activeConversationId,
    onJoinedConversation,
    onReceiveMessage,
    onCoordinatorJoined,
    onLeftConversation,
    onError,
    onResyncRequested,
  } = options;

  const [connectionState, setConnectionState] =
    useState<CoordinatorChatConnectionState>("disconnected");
  const [transportError, setTransportError] = useState<string | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const joinedConversationRef = useRef<number | null>(null);
  const onJoinedConversationRef = useRef(options.onJoinedConversation);
  const onReceiveMessageRef = useRef(options.onReceiveMessage);
  const onCoordinatorJoinedRef = useRef(options.onCoordinatorJoined);
  const onLeftConversationRef = useRef(options.onLeftConversation);
  const onErrorRef = useRef(options.onError);
  const onResyncRequestedRef = useRef(options.onResyncRequested);

  useEffect(() => {
    onJoinedConversationRef.current = onJoinedConversation;
  }, [onJoinedConversation]);

  useEffect(() => {
    onReceiveMessageRef.current = onReceiveMessage;
  }, [onReceiveMessage]);

  useEffect(() => {
    onCoordinatorJoinedRef.current = onCoordinatorJoined;
  }, [onCoordinatorJoined]);

  useEffect(() => {
    onLeftConversationRef.current = onLeftConversation;
  }, [onLeftConversation]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onResyncRequestedRef.current = onResyncRequested;
  }, [onResyncRequested]);

  const refreshConnectionState = useCallback(() => {
    setConnectionState(coordinatorChatTransport.getStateLabel());
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let mounted = true;

    const handleJoinedConversation = (event: JoinedConversationEvent) => {
      onJoinedConversationRef.current?.(event);
    };

    const handleReceiveMessage = (message: ReceiveMessageEvent) => {
      onReceiveMessageRef.current?.(message);
    };

    const handleCoordinatorJoined = (event: CoordinatorJoinedEvent) => {
      onCoordinatorJoinedRef.current?.(event);
    };

    const handleLeftConversation = (event: LeftConversationEvent) => {
      onLeftConversationRef.current?.(event);
    };

    const handleHubError = (errorMessage: string) => {
      setTransportError(errorMessage);
      onErrorRef.current?.(errorMessage);
    };

    coordinatorChatTransport.on<JoinedConversationEvent>(
      CHAT_EVENTS.JoinedConversation,
      handleJoinedConversation,
    );
    coordinatorChatTransport.on<ReceiveMessageEvent>(
      CHAT_EVENTS.ReceiveMessage,
      handleReceiveMessage,
    );
    coordinatorChatTransport.on<CoordinatorJoinedEvent>(
      CHAT_EVENTS.CoordinatorJoined,
      handleCoordinatorJoined,
    );
    coordinatorChatTransport.on<LeftConversationEvent>(
      CHAT_EVENTS.LeftConversation,
      handleLeftConversation,
    );
    coordinatorChatTransport.on<string>(CHAT_EVENTS.Error, handleHubError);

    coordinatorChatTransport.onReconnecting(() => {
      if (!mounted) return;
      setRetryAttempts((prev) => prev + 1);
      setConnectionState("reconnecting");
    });

    coordinatorChatTransport.onReconnected(async () => {
      if (!mounted) return;
      setRetryAttempts(0);
      setTransportError(null);
      refreshConnectionState();
      const currentConversationId = joinedConversationRef.current;
      if (currentConversationId) {
        await coordinatorChatTransport.coordinatorJoin(currentConversationId);
        await coordinatorChatTransport.joinConversation(currentConversationId);
        onResyncRequestedRef.current?.();
      }
    });

    coordinatorChatTransport.onClose((error) => {
      if (!mounted) return;
      setConnectionState("disconnected");
      if (error) {
        setTransportError(error.message);
      }
    });

    (async () => {
      try {
        setConnectionState("connecting");
        await coordinatorChatTransport.start();
        if (!mounted) return;
        refreshConnectionState();
      } catch (error: unknown) {
        if (!mounted) return;
        const message =
          error instanceof Error
            ? error.message
            : "Unable to connect to chat transport.";
        setConnectionState("disconnected");
        setTransportError(message);
        onErrorRef.current?.(message);
      }
    })();

    return () => {
      mounted = false;
      coordinatorChatTransport.off<JoinedConversationEvent>(
        CHAT_EVENTS.JoinedConversation,
        handleJoinedConversation,
      );
      coordinatorChatTransport.off<ReceiveMessageEvent>(
        CHAT_EVENTS.ReceiveMessage,
        handleReceiveMessage,
      );
      coordinatorChatTransport.off<CoordinatorJoinedEvent>(
        CHAT_EVENTS.CoordinatorJoined,
        handleCoordinatorJoined,
      );
      coordinatorChatTransport.off<LeftConversationEvent>(
        CHAT_EVENTS.LeftConversation,
        handleLeftConversation,
      );
      coordinatorChatTransport.off<string>(CHAT_EVENTS.Error, handleHubError);
      coordinatorChatTransport.onClose(() => undefined);
      coordinatorChatTransport.onReconnected(() => undefined);
      coordinatorChatTransport.onReconnecting(() => undefined);
    };
  }, [enabled, refreshConnectionState]);

  useEffect(() => {
    const syncConversation = async () => {
      if (!activeConversationId || activeConversationId < 1) {
        if (joinedConversationRef.current) {
          await coordinatorChatTransport.leaveConversation(
            joinedConversationRef.current,
          );
          joinedConversationRef.current = null;
        }
        return;
      }

      if (connectionState !== "connected") {
        return;
      }

      if (joinedConversationRef.current === activeConversationId) {
        return;
      }

      if (
        joinedConversationRef.current &&
        joinedConversationRef.current !== activeConversationId
      ) {
        await coordinatorChatTransport.leaveConversation(
          joinedConversationRef.current,
        );
      }

      await coordinatorChatTransport.coordinatorJoin(activeConversationId);
      await coordinatorChatTransport.joinConversation(activeConversationId);
      joinedConversationRef.current = activeConversationId;
    };

    void syncConversation();
  }, [activeConversationId, connectionState]);

  const disconnect = useCallback(async () => {
    await coordinatorChatTransport.stop();
    setConnectionState("disconnected");
  }, []);

  const retryConnection = useCallback(async () => {
    setTransportError(null);

    try {
      setConnectionState("connecting");
      await coordinatorChatTransport.stop();
      await coordinatorChatTransport.start();
      setRetryAttempts(0);
      refreshConnectionState();

      if (activeConversationId && activeConversationId > 0) {
        await coordinatorChatTransport.coordinatorJoin(activeConversationId);
        await coordinatorChatTransport.joinConversation(activeConversationId);
        joinedConversationRef.current = activeConversationId;
        onResyncRequestedRef.current?.();
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể kết nối lại hệ thống chat.";
      setConnectionState("disconnected");
      setTransportError(message);
      onErrorRef.current?.(message);
    }
  }, [activeConversationId, refreshConnectionState]);

  return {
    connectionState,
    transportError,
    retryAttempts,
    retryConnection,
    disconnect,
  };
}

export function useSendConversationMessage() {
  return useMutation<void, Error, { conversationId: number; content: string }>({
    mutationFn: ({ conversationId, content }) =>
      coordinatorChatTransport.sendMessage(conversationId, content),
  });
}

export function useCoordinatorChatRooms() {
  const waitingQuery = useWaitingConversations();

  const rooms = useMemo(
    () => (waitingQuery.data ?? []).map(toCoordinatorChatRoomViewModel),
    [waitingQuery.data],
  );

  return {
    ...waitingQuery,
    rooms,
  };
}

export function mergeConversationMessages(
  historyMessages: ConversationMessageEntity[],
  realtimeMessages: ReceiveMessageEvent[],
): ReceiveMessageEvent[] {
  const map = new Map<string, ReceiveMessageEvent>();

  const toKey = (message: ReceiveMessageEvent) => {
    if (message.id) {
      return `id:${message.id}`;
    }

    return [
      message.conversationId,
      message.senderId ?? "unknown",
      message.createdAt,
      message.content,
    ].join("|");
  };

  historyMessages.forEach((message) => {
    const normalized: ReceiveMessageEvent = {
      ...message,
      conversationId: (message as ReceiveMessageEvent).conversationId ?? 0,
    };
    map.set(toKey(normalized), normalized);
  });

  realtimeMessages.forEach((message) => {
    map.set(toKey(message), message);
  });

  return [...map.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
