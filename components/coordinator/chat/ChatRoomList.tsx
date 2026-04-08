import { CoordinatorChatRoomViewModel } from "@/services/chat/type";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatRoomListProps {
  rooms: CoordinatorChatRoomViewModel[];
  activeConversationId: number | null;
  unreadByConversation: Record<number, number>;
  isLoading: boolean;
  isRefreshing?: boolean;
  onSelectRoom: (conversationId: number) => void;
}

function getConversationStatusLabel(
  status: "WaitingCoordinator" | "CoordinatorActive",
) {
  return status === "CoordinatorActive"
    ? "Điều phối viên đang hỗ trợ"
    : "Đang chờ điều phối viên";
}

function getTopicDisplayLabel(topicLabel: string) {
  const normalized = topicLabel.trim().toLowerCase();

  if (!normalized) {
    return "Chưa chọn chủ đề";
  }

  if (normalized === "medicalhelp") {
    return "Hỗ trợ y tế";
  }

  if (normalized === "sosrequestsupport") {
    return "Hỗ trợ yêu cầu SOS";
  }

  if (normalized === "general support" || normalized === "general_support") {
    return "Hỗ trợ chung";
  }

  return topicLabel;
}

function RoomTime({ updatedAt }: { updatedAt: string }) {
  return (
    <span className="text-xs text-muted-foreground">
      {new Date(updatedAt).toLocaleString("vi-VN")}
    </span>
  );
}

export default function ChatRoomList({
  rooms,
  activeConversationId,
  unreadByConversation,
  isLoading,
  isRefreshing,
  onSelectRoom,
}: ChatRoomListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (!rooms.length) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Không có cuộc trò chuyện đang chờ.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {isRefreshing ? (
          <p className="px-1 text-[11px] text-muted-foreground">
            Đang cập nhật danh sách...
          </p>
        ) : null}

        {rooms.map((room) => {
          const isActive = room.conversationId === activeConversationId;
          const unreadCount = unreadByConversation[room.conversationId] ?? 0;

          return (
            <Button
              key={room.conversationId}
              type="button"
              variant="ghost"
              className={cn(
                "h-auto w-full justify-start rounded-xl border p-3 text-left transition-all",
                isActive
                  ? "border-primary/30 bg-primary/10 shadow-sm"
                  : "border-border bg-white/60 hover:border-primary/25 hover:bg-muted/40",
              )}
              onClick={() => onSelectRoom(room.conversationId)}
            >
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm truncate">
                    {room.participantLabel}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {unreadCount > 0 ? (
                      <Badge
                        variant="destructive"
                        className="px-2 py-0.5 text-xs"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="shrink-0">
                      {getConversationStatusLabel(
                        isActive ? "CoordinatorActive" : room.statusLabel,
                      )}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground truncate">
                    Chủ đề: {getTopicDisplayLabel(room.topicLabel)}
                  </p>
                  <RoomTime updatedAt={room.updatedAt} />
                </div>

                {room.linkedSosRequestId ? (
                  <p className="text-[11px] text-muted-foreground">
                    SOS #{room.linkedSosRequestId}
                  </p>
                ) : null}
              </div>
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
