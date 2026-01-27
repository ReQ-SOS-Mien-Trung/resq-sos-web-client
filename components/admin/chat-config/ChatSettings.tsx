"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ChatRoom } from "@/types/admin-pages";

interface ChatSettingsProps {
  room: ChatRoom;
  onSave: (settings: ChatRoom["settings"]) => void;
  onCancel: () => void;
}

export function ChatSettings({
  room,
  onSave,
  onCancel,
}: ChatSettingsProps) {
  const [settings, setSettings] = useState(room.settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle>Cài đặt phòng: {room.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoReply"
              checked={settings.autoReply}
              onChange={(e) =>
                setSettings({ ...settings, autoReply: e.target.checked })
              }
              className="rounded"
            />
            <Label htmlFor="autoReply" className="cursor-pointer">
              Tự động trả lời
            </Label>
          </div>

          {settings.maxParticipants !== undefined && (
            <div>
              <Label htmlFor="maxParticipants">
                Số người tham gia tối đa
              </Label>
              <Input
                id="maxParticipants"
                type="number"
                value={settings.maxParticipants}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxParticipants: parseInt(e.target.value) || undefined,
                  })
                }
                className="mt-1"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allowFileUpload"
              checked={settings.allowFileUpload}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  allowFileUpload: e.target.checked,
                })
              }
              className="rounded"
            />
            <Label htmlFor="allowFileUpload" className="cursor-pointer">
              Cho phép tải file
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="moderation"
              checked={settings.moderation}
              onChange={(e) =>
                setSettings({ ...settings, moderation: e.target.checked })
              }
              className="rounded"
            />
            <Label htmlFor="moderation" className="cursor-pointer">
              Kiểm duyệt tin nhắn
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
            <Button type="submit">Lưu</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
