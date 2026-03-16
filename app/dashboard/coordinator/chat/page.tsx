"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    isFetching: roomsRefreshing,
    error: waitingError,
    refetch: refetchRooms,
  } = useCoordinatorChatRooms();

  const knownConversationIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    knownConversationIdsRef.current = new Set(
      rooms.map((room) => room.conversationId),
    );
  }, [rooms]);

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

      if (!knownConversationIdsRef.current.has(message.conversationId)) {
        void refetchRooms();
      }

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
    [activeConversationId, markConversationAsRead, refetchRooms],
  );

  const handleResyncRequested = useCallback(() => {
    void refetchRooms();
    void messagesQuery.refetch();
  }, [messagesQuery, refetchRooms]);

  const {
    connectionState,
    transportError,
    retryAttempts,
    retryConnection,
    disconnect,
  } = useCoordinatorChatConnection({
    enabled: true,
    activeConversationId,
    onJoinedConversation: () => {
      void refetchRooms();
    },
    onReceiveMessage: handleRealtimeMessage,
    onCoordinatorJoined: () => {
      setActiveStatus("CoordinatorActive");
      void refetchRooms();
    },
    onLeftConversation: () => {
      void refetchRooms();
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

  const activeRoom = useMemo(
    () =>
      activeConversationId
        ? (rooms.find((room) => room.conversationId === activeConversationId) ??
          null)
        : null,
    [activeConversationId, rooms],
  );

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

    if (connectionState !== "connected") {
      toast.error("Kết nối realtime chưa sẵn sàng. Vui lòng thử lại sau.");
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
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-background">
      <header className="shrink-0 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/coordinator")}
              className="rounded-xl"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-sm font-semibold md:text-base">
                Coordinator - Victim Chat
              </p>
              <p className="text-xs text-muted-foreground">
                Theo dõi hội thoại realtime giữa coordinator web và victim app
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3">
              {activeStatus === "CoordinatorActive"
                ? "CoordinatorActive"
                : "WaitingCoordinator"}
            </Badge>
            <ChatConnectionBadge state={connectionState} />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => {
                void refetchRooms();
              }}
              disabled={waitingLoading || roomsRefreshing}
            >
              <ArrowClockwise className="h-4 w-4" />
              Làm mới
            </Button>
          </div>
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

      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-3 md:flex-row md:p-4">
        <aside className="flex w-full flex-col overflow-hidden rounded-2xl border bg-white/75 shadow-sm md:w-[320px] lg:w-[340px]">
          <div className="border-b p-3">
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
              isRefreshing={roomsRefreshing}
              onSelectRoom={(conversationId) => {
                void handleSelectRoom(conversationId);
              }}
            />
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
          {waitingError ? (
            <div className="m-4 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
              Không thể tải danh sách cuộc trò chuyện.
            </div>
          ) : null}

          {activeConversationId ? (
            <>
              <div className="border-b bg-slate-50/80 px-4 py-3">
                <p className="text-sm font-medium">
                  Conversation #{activeConversationId}
                </p>
              </div>

              <div className="flex-1 min-h-0">
                <ChatMessageThread
                  messages={mergedMessages}
                  isLoading={messagesQuery.isLoading}
                  conversationPartnerLabel={activeRoom?.participantLabel}
                />
              </div>

              <ChatComposer
                disabled={sendMessageMutation.isPending}
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
