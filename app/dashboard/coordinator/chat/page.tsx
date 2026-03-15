"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowClockwise,
  ArrowLeft,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChatComposer,
  ChatConnectionBadge,
  ChatMessageThread,
  ChatRoomList,
} from "@/components/coordinator/chat";
import {
  mergeConversationMessages,
  useConversationMessages,
  useCoordinatorChatConnection,
  useCoordinatorChatRooms,
  useJoinConversation,
  useSendConversationMessage,
} from "@/services/chat/hooks";
import { ReceiveMessageEvent } from "@/services/chat/type";

export default function CoordinatorChatPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [activeStatus, setActiveStatus] = useState<
    "WaitingCoordinator" | "CoordinatorActive"
  >("WaitingCoordinator");
  const [unreadByConversation, setUnreadByConversation] = useState<
    Record<number, number>
  >({});
  const [lastReadAtByConversation, setLastReadAtByConversation] = useState<
    Record<number, number>
  >({});
  const [realtimeMessages, setRealtimeMessages] = useState<
    ReceiveMessageEvent[]
  >([]);

  const {
    rooms,
    isLoading: waitingLoading,
    error: waitingError,
  } = useCoordinatorChatRooms();

  const joinMutation = useJoinConversation();
  const sendMessageMutation = useSendConversationMessage();

  const messagesQuery = useConversationMessages(
    activeConversationId,
    { page: 1, pageSize: 50 },
    { enabled: !!activeConversationId },
  );

  const markConversationAsRead = useCallback((conversationId: number) => {
    setUnreadByConversation((prev) => ({
      ...prev,
      [conversationId]: 0,
    }));
    setLastReadAtByConversation((prev) => ({
      ...prev,
      [conversationId]: Date.now(),
    }));
  }, []);

  const handleRealtimeMessage = useCallback(
    (message: ReceiveMessageEvent) => {
      setRealtimeMessages((prev) => [...prev, message]);
      if (
        !activeConversationId ||
        message.conversationId !== activeConversationId
      ) {
        setUnreadByConversation((prev) => ({
          ...prev,
          [message.conversationId]: (prev[message.conversationId] ?? 0) + 1,
        }));
      } else {
        markConversationAsRead(message.conversationId);
      }
    },
    [activeConversationId, markConversationAsRead],
  );

  const handleResyncRequested = useCallback(() => {
    void messagesQuery.refetch();
  }, [messagesQuery]);

  const {
    connectionState,
    transportError,
    retryAttempts,
    retryConnection,
    disconnect,
  } = useCoordinatorChatConnection({
    enabled: !!activeConversationId,
    activeConversationId,
    onReceiveMessage: handleRealtimeMessage,
    onCoordinatorJoined: () => {
      setActiveStatus("CoordinatorActive");
    },
    onResyncRequested: handleResyncRequested,
  });

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  const filteredRooms = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return rooms;
    }

    return rooms.filter((room) => {
      const participant = room.participantLabel.toLowerCase();
      const topic = room.topicLabel.toLowerCase();
      const sosText = room.linkedSosRequestId
        ? String(room.linkedSosRequestId)
        : "";

      return (
        participant.includes(keyword) ||
        topic.includes(keyword) ||
        sosText.includes(keyword)
      );
    });
  }, [rooms, searchText]);

  const mergedMessages = useMemo(() => {
    if (!activeConversationId) {
      return [];
    }

    const historyMessages = (messagesQuery.data?.messages ?? []).map(
      (message) => ({
        ...message,
        conversationId: activeConversationId,
      }),
    );

    const realtimeInRoom = realtimeMessages.filter(
      (message) => message.conversationId === activeConversationId,
    );

    return mergeConversationMessages(historyMessages, realtimeInRoom);
  }, [activeConversationId, messagesQuery.data?.messages, realtimeMessages]);

  const unreadByConversationView = useMemo(() => {
    const next: Record<number, number> = {};

    rooms.forEach((room) => {
      const currentUnread = unreadByConversation[room.conversationId] ?? 0;
      const updatedAt = new Date(room.updatedAt).getTime();
      const lastReadAt = lastReadAtByConversation[room.conversationId] ?? 0;

      if (room.conversationId === activeConversationId) {
        next[room.conversationId] = 0;
        return;
      }

      if (updatedAt > lastReadAt) {
        next[room.conversationId] = Math.max(currentUnread, 1);
        return;
      }

      next[room.conversationId] = currentUnread;
    });

    return next;
  }, [
    activeConversationId,
    lastReadAtByConversation,
    rooms,
    unreadByConversation,
  ]);

  const handleSelectRoom = async (conversationId: number) => {
    try {
      const joinResult = await joinMutation.mutateAsync(conversationId);
      setActiveConversationId(conversationId);
      markConversationAsRead(conversationId);
      setActiveStatus(
        joinResult.status === "CoordinatorActive"
          ? "CoordinatorActive"
          : "WaitingCoordinator",
      );
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể tham gia cuộc trò chuyện.",
      );
    }
  };

  const isConnectionHealthy =
    connectionState === "connected" && !transportError;

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) {
      toast.error("Vui lòng chọn một cuộc trò chuyện trước.");
      return;
    }

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: activeConversationId,
        content,
      });
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Không thể gửi tin nhắn.",
      );
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <header className="h-14 border-b bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/coordinator")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="font-semibold text-sm">Coordinator - Victim Chat</p>
            <p className="text-xs text-muted-foreground">
              Realtime conversation between coordinator website and victim
              mobile app
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {activeStatus === "CoordinatorActive"
              ? "CoordinatorActive"
              : "WaitingCoordinator"}
          </Badge>
          <ChatConnectionBadge state={connectionState} />
        </div>
      </header>

      {!isConnectionHealthy ? (
        <div className="mx-4 mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-100/60 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-400/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {connectionState === "reconnecting"
                  ? `Đang thử kết nối lại (${retryAttempts})`
                  : connectionState === "connecting"
                    ? "Đang thiết lập kết nối chat"
                    : "Mất kết nối realtime chat"}
              </p>
              <p className="text-xs opacity-90">
                {transportError ||
                  "Tin nhắn realtime có thể bị trễ. Bạn có thể bấm thử lại để kết nối ngay."}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void retryConnection();
              }}
              disabled={
                !activeConversationId || connectionState === "connecting"
              }
              className="shrink-0"
            >
              <ArrowClockwise className="h-4 w-4" />
              Thử lại
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        <aside className="w-full md:w-[360px] border-r bg-muted/20 flex flex-col">
          <div className="p-3 border-b">
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Tìm theo người báo, chủ đề, SOS ID"
              leftIcon={<MagnifyingGlass className="h-4 w-4" />}
            />
          </div>

          <div className="flex-1 min-h-0">
            <ChatRoomList
              rooms={filteredRooms}
              activeConversationId={activeConversationId}
              unreadByConversation={unreadByConversationView}
              isLoading={waitingLoading}
              onSelectRoom={(conversationId) => {
                void handleSelectRoom(conversationId);
              }}
            />
          </div>
        </aside>

        <section className="flex-1 flex flex-col min-h-0">
          {waitingError ? (
            <div className="m-4 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
              Không thể tải danh sách cuộc trò chuyện.
            </div>
          ) : null}

          {activeConversationId ? (
            <>
              <div className="px-4 py-3 border-b bg-background">
                <p className="text-sm font-medium">
                  Conversation #{activeConversationId}
                </p>
              </div>

              <div className="flex-1 min-h-0">
                <ChatMessageThread
                  messages={mergedMessages}
                  isLoading={messagesQuery.isLoading}
                />
              </div>

              <ChatComposer
                disabled={
                  sendMessageMutation.isPending ||
                  connectionState !== "connected"
                }
                onSend={(content) => {
                  void handleSendMessage(content);
                }}
              />
            </>
          ) : (
            <div className="h-full grid place-items-center text-sm text-muted-foreground">
              Chọn một cuộc trò chuyện ở cột trái để bắt đầu.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
