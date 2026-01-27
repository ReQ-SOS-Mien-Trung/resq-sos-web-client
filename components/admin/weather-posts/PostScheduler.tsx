"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

interface PostSchedulerProps {
  onSchedule: (date: string, time: string) => void;
  onCancel: () => void;
}

export function PostScheduler({ onSchedule, onCancel }: PostSchedulerProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date && time) {
      const scheduledDateTime = `${date}T${time}:00`;
      onSchedule(date, time);
    }
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Lên lịch bài đăng
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Ngày xuất bản</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div>
            <Label htmlFor="time">Giờ xuất bản</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
            <Button type="submit">Lên lịch</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
