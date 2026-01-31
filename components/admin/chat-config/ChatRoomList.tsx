"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChatCircle,
  Users,
  Gear,
  DotsThreeVertical,
} from "@phosphor-icons/react";
import type { ChatRoom } from "@/types/admin-pages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatRoomListProps {
  rooms: ChatRoom[];
  onEdit?: (room: ChatRoom) => void;
  onDelete?: (room: ChatRoom) => void;
}

export function ChatRoomList({ rooms, onEdit, onDelete }: ChatRoomListProps) {
  const getTypeBadge = (type: ChatRoom["type"]) => {
    const variants = {
      public: {
        label: "Công khai",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      },
      private: {
        label: "Riêng tư",
        className: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
      },
      support: {
        label: "Hỗ trợ",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      },
    };
    return variants[type];
  };

  const getStatusBadge = (status: ChatRoom["status"]) => {
    const variants = {
      active: {
        label: "Hoạt động",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      },
      inactive: {
        label: "Không hoạt động",
        className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
      },
      archived: {
        label: "Đã lưu trữ",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      },
    };
    return variants[status];
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChatCircle size={20} />
          Danh sách phòng chat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rooms.map((room) => {
            const typeBadge = getTypeBadge(room.type);
            const statusBadge = getStatusBadge(room.status);
            return (
              <div
                key={room.id}
                className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {room.name}
                      </h3>
                      <Badge className={typeBadge.className}>
                        {typeBadge.label}
                      </Badge>
                      <Badge className={statusBadge.className}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-foreground/70">
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        <span>{room.participants} người tham gia</span>
                      </div>
                      {room.lastMessage && (
                        <div className="flex items-center gap-1">
                          <ChatCircle size={16} />
                          <span className="truncate max-w-50">
                            {room.lastMessage}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <DotsThreeVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(room)}>
                        <Gear size={16} className="mr-2" />
                        Cài đặt
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete?.(room)}
                        className="text-destructive"
                      >
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
