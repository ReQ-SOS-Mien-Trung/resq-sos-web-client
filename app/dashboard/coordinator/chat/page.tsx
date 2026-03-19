"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowClockwise,
  ArrowLeft,
  MagnifyingGlass,
  SignOut,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useLeaveConversation,
  useSendConversationMessage,
} from "@/services/chat/hooks";
import { ReceiveMessageEvent } from "@/services/chat/type";

const ACTIVE_CONVERSATION_STORAGE_KEY =
  "coordinator-chat-active-conversation-id";
const ACTIVE_PARTNER_LABEL_STORAGE_KEY =
  "coordinator-chat-active-partner-label";

function getConversationStatusLabel(
  status: "WaitingCoordinator" | "CoordinatorActive",
) {
  return status === "CoordinatorActive"
    ? "Điều phối viên đang hỗ trợ"
    : "Đang chờ điều phối viên";
}

function isVictimFacingCoordinatorJoinNotice(message: ReceiveMessageEvent) {
  if (message.messageType !== "SystemMessage") {
    return false;
  }

  const normalized = message.content.toLowerCase();

  return (
    normalized.includes("coordinator đã tham gia hỗ trợ bạn") ||
    normalized.includes("đã tham gia hỗ trợ bạn") ||
    normalized.includes("bạn có thể mô tả thêm nhu cầu và trao đổi trực tiếp")
  );
}

export default function CoordinatorChatPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [activePartnerLabel, setActivePartnerLabel] = useState<string | null>(
    null,
  );
  const [activeStatus, setActiveStatus] = useState<
    "WaitingCoordinator" | "CoordinatorActive"
  >("WaitingCoordinator");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
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
    if (typeof window === "undefined") return;

    const storedConversationId = window.localStorage.getItem(
      ACTIVE_CONVERSATION_STORAGE_KEY,
    );
    const parsedConversationId = Number(storedConversationId);

    if (Number.isFinite(parsedConversationId) && parsedConversationId > 0) {
      setActiveConversationId(parsedConversationId);
      setActiveStatus("CoordinatorActive");
    }

    const storedPartnerLabel = window.localStorage.getItem(
      ACTIVE_PARTNER_LABEL_STORAGE_KEY,
    );
    if (storedPartnerLabel?.trim()) {
      setActivePartnerLabel(storedPartnerLabel.trim());
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (activeConversationId && activeConversationId > 0) {
      window.localStorage.setItem(
        ACTIVE_CONVERSATION_STORAGE_KEY,
        String(activeConversationId),
      );
    } else {
      window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (activePartnerLabel?.trim()) {
      window.localStorage.setItem(
        ACTIVE_PARTNER_LABEL_STORAGE_KEY,
        activePartnerLabel.trim(),
      );
    } else {
      window.localStorage.removeItem(ACTIVE_PARTNER_LABEL_STORAGE_KEY);
    }
  }, [activePartnerLabel]);

  useEffect(() => {
    knownConversationIdsRef.current = new Set(
      rooms.map((room) => room.conversationId),
    );
  }, [rooms]);

  useEffect(() => {
    const roomForActiveConversation =
      activeConversationId !== null
        ? rooms.find((room) => room.conversationId === activeConversationId)
        : null;

    if (roomForActiveConversation?.participantLabel) {
      setActivePartnerLabel(roomForActiveConversation.participantLabel);
    }
  }, [activeConversationId, rooms]);

  const joinMutation = useJoinConversation();
  const leaveConversationMutation = useLeaveConversation();
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
    leaveConversationGroup,
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
    onCoordinatorLeft: (event) => {
      if (event.conversationId === activeConversationId) {
        setActiveStatus("WaitingCoordinator");
      }
      void refetchRooms();
    },
    onLeftConversation: () => {
      void refetchRooms();
    },
    onError: (errorMessage) => {
      const normalized = errorMessage.trim().toLowerCase();
      if (
        normalized.includes("victim chưa chọn chủ đề hỗ trợ") ||
        normalized.includes("vui lòng chờ victim xác nhận yêu cầu")
      ) {
        return;
      }
      toast.error(errorMessage);
    },
    onResyncRequested: handleResyncRequested,
  });

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  const roomsForView = rooms;

  useEffect(() => {
    if (!activeConversationId) return;

    const hasActiveInRooms = rooms.some(
      (room) => room.conversationId === activeConversationId,
    );

    if (hasActiveInRooms) return;
    if (waitingLoading || roomsRefreshing) return;
    if (messagesQuery.isLoading || messagesQuery.isFetching) return;
    if (!messagesQuery.isError) return;

    // Cached conversation is stale (exists in local storage but no longer valid on server).
    const staleConversationId = activeConversationId;
    setActiveConversationId(null);
    setActivePartnerLabel(null);
    setActiveStatus("WaitingCoordinator");
    setRealtimeMessages((prev) =>
      prev.filter((message) => message.conversationId !== staleConversationId),
    );
  }, [
    activeConversationId,
    messagesQuery.isError,
    messagesQuery.isFetching,
    messagesQuery.isLoading,
    rooms,
    roomsRefreshing,
    waitingLoading,
  ]);

  const filteredRooms = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return roomsForView;
    }

    return roomsForView.filter((room) => {
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
  }, [roomsForView, searchText]);

  const activeRoom = useMemo(
    () =>
      activeConversationId
        ? (roomsForView.find(
            (room) => room.conversationId === activeConversationId,
          ) ?? null)
        : null,
    [activeConversationId, roomsForView],
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

    return mergeConversationMessages(historyMessages, realtimeInRoom).filter(
      (message) => !isVictimFacingCoordinatorJoinNotice(message),
    );
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
    const selectedRoom = roomsForView.find(
      (room) => room.conversationId === conversationId,
    );

    try {
      const joinResult = await joinMutation.mutateAsync(conversationId);
      setActiveConversationId(conversationId);
      if (selectedRoom?.participantLabel) {
        setActivePartnerLabel(selectedRoom.participantLabel);
      }
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

  const handleLeaveConversation = async () => {
    if (!activeConversationId) {
      toast.error("Chưa có cuộc trò chuyện nào được chọn.");
      return;
    }

    const conversationId = activeConversationId;

    try {
      await leaveConversationMutation.mutateAsync(conversationId);
      try {
        await leaveConversationGroup(conversationId);
      } catch {
        // REST leave already succeeds even if client-side group cleanup fails.
      }

      setActiveConversationId(null);
      setActivePartnerLabel(null);
      setActiveStatus("WaitingCoordinator");
      setRealtimeMessages((prev) =>
        prev.filter((message) => message.conversationId !== conversationId),
      );
      markConversationAsRead(conversationId);
      setLeaveDialogOpen(false);
      void refetchRooms();
      toast.success("Đã rời cuộc trò chuyện.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể rời cuộc trò chuyện.",
      );
    }
  };

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
    <div className="flex h-screen flex-col overflow-hidden bg-white text-black tracking-tighter">
      <header className="shrink-0 border-b border-black bg-white px-4 py-3 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/coordinator")}
              className="rounded-none border border-black"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-sm font-semibold uppercase md:text-base">
                Coordinator - Victim Chat
              </p>
              <p className="text-xs text-black/70">
                Theo dõi hội thoại realtime giữa coordinator web và victim app
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="rounded-none border border-black bg-black text-white"
            >
              {getConversationStatusLabel(activeStatus)}
            </Badge>
            <ChatConnectionBadge state={connectionState} />
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 rounded-none bg-[#FF5722] text-white hover:bg-[#e64a19]"
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
        <div className="mx-4 mt-4 border border-[#FF5722] bg-[#FF5722]/10 p-3 text-[#9a3412] md:mx-5">
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
              variant="default"
              size="sm"
              onClick={() => {
                void retryConnection();
              }}
              disabled={
                !activeConversationId || connectionState === "connecting"
              }
              className="shrink-0 rounded-none bg-[#FF5722] text-white hover:bg-[#e64a19]"
            >
              <ArrowClockwise className="h-4 w-4" />
              Thử lại
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-[320px_minmax(0,1fr)] md:grid-rows-1 md:gap-0 md:p-5">
        <aside className="flex w-full flex-col overflow-hidden border border-black bg-white md:w-auto md:border-r-0">
          <div className="border-b border-black p-3">
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

        <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden border border-black bg-white before:absolute before:inset-0 before:-z-10 before:bg-[linear-gradient(to_right,rgba(0,0,0,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.07)_1px,transparent_1px)] before:bg-[size:28px_28px]">
          {waitingError ? (
            <div className="m-4 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
              Không thể tải danh sách cuộc trò chuyện.
            </div>
          ) : null}

          {activeConversationId ? (
            <>
              <div className="border-b border-black bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold uppercase">
                    Conversation #{activeConversationId}
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-none border-black text-black hover:bg-black hover:text-white"
                    onClick={() => {
                      setLeaveDialogOpen(true);
                    }}
                    disabled={leaveConversationMutation.isPending}
                  >
                    <SignOut className="h-4 w-4" />
                    {leaveConversationMutation.isPending
                      ? "Đang rời..."
                      : "Rời cuộc trò chuyện"}
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <ChatMessageThread
                  messages={mergedMessages}
                  isLoading={messagesQuery.isLoading}
                  conversationPartnerLabel={
                    activeRoom?.participantLabel ||
                    activePartnerLabel ||
                    undefined
                  }
                />
              </div>

              <ChatComposer
                disabled={
                  sendMessageMutation.isPending ||
                  leaveConversationMutation.isPending
                }
                onSend={(content) => {
                  void handleSendMessage(content);
                }}
              />
            </>
          ) : (
            <div className="grid h-full place-items-center text-sm text-black/70">
              Chọn một cuộc trò chuyện ở cột trái để bắt đầu.
            </div>
          )}
        </section>
      </div>

      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rời cuộc trò chuyện</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn rời cuộc trò chuyện này không? Sau khi rời, phòng
              sẽ quay về trạng thái chờ điều phối viên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLeaveDialogOpen(false)}
              disabled={leaveConversationMutation.isPending}
            >
              Ở lại
            </Button>
            <Button
              className="bg-[#FF5722] text-white hover:bg-[#e64a19]"
              onClick={() => {
                void handleLeaveConversation();
              }}
              disabled={leaveConversationMutation.isPending}
            >
              {leaveConversationMutation.isPending ? "Đang rời..." : "Rời chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
