"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Warning,
  BellRinging,
  WaveSine,
  Spinner,
  Lightning,
} from "@phosphor-icons/react";
import {
  BroadcastNotificationType,
  useBroadcastNotification,
} from "@/services/noti_alert";
import { toast } from "sonner";

const PRESET_TYPES: Array<{
  value: BroadcastNotificationType;
  label: string;
  icon: ReactNode;
}> = [
  { value: "FLOOD_WARNING", label: "Cảnh báo lũ", icon: <WaveSine size={14} /> },
  { value: "FLOOD_EMERGENCY", label: "Khẩn cấp lũ", icon: <Lightning size={14} /> },
  { value: "EVACUATION", label: "Sơ tán", icon: <BellRinging size={14} /> },
];

const PRESETS: Array<{
  title: string;
  body: string;
  type: BroadcastNotificationType;
}> = [
  {
    title: "🌊 CẢNH BÁO LŨ LỤT",
    body: "Mực nước sông đang tăng cao. Người dân vùng ven sông cần di chuyển đến nơi an toàn ngay lập tức.",
    type: "FLOOD_WARNING",
  },
  {
    title: "🚨 KHẨN CẤP: LŨ LỚN",
    body: "Lũ lớn bất thường đang xảy ra. Toàn bộ cư dân khu vực thấp trũng cần sơ tán khẩn cấp. Liên hệ 114 nếu cần hỗ trợ.",
    type: "FLOOD_EMERGENCY",
  },
  {
    title: "⚠️ LỆNH SƠ TÁN",
    body: "Chính quyền địa phương ban hành lệnh sơ tán bắt buộc. Vui lòng rời khỏi khu vực ngập lụt ngay lập tức.",
    type: "EVACUATION",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FloodAlertModal({ open, onOpenChange }: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<BroadcastNotificationType>("FLOOD_WARNING");
  const [confirmed, setConfirmed] = useState(false);

  const { mutate: broadcast, isPending } = useBroadcastNotification();

  const reset = () => {
    setTitle("");
    setBody("");
    setType("FLOOD_WARNING");
    setConfirmed(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setTitle(preset.title);
    setBody(preset.body);
    setType(preset.type);
  };

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Vui lòng điền đầy đủ tiêu đề và nội dung");
      return;
    }
    broadcast(
      { title: title.trim(), body: body.trim(), type },
      {
        onSuccess: () => {
          toast.success("Đã phát cảnh báo đến toàn bộ người dùng!");
          handleClose(false);
        },
        onError: () => {
          toast.error("Phát cảnh báo thất bại. Vui lòng thử lại.");
        },
      },
    );
  };

  const canSend = title.trim().length > 0 && body.trim().length > 0 && confirmed;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        {/* Header */}
        <div className="bg-linear-to-r from-red-600 to-orange-500 px-6 py-5 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Warning size={22} weight="fill" className="text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold tracking-tight">
                  Phát cảnh báo lũ
                </DialogTitle>
                <DialogDescription className="text-white/80 text-xs mt-0.5 tracking-tight">
                  Thông báo sẽ được gửi đến toàn bộ người dùng trong hệ thống
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Preset templates */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 block">
              Mẫu nhanh
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "text-xs rounded-lg border p-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm tracking-tight leading-snug",
                    type === preset.type && title === preset.title
                      ? "border-orange-400 bg-orange-50 text-orange-700 font-medium"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:border-orange-300 hover:bg-orange-50/50",
                  )}
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* Type selector */}
          <div>
            <Label className="text-sm font-medium tracking-tight mb-2 block">
              Loại cảnh báo
            </Label>
            <div className="flex gap-2">
              {PRESET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg border py-2 transition-all tracking-tight",
                    type === t.value
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:border-red-300",
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="alert-title" className="text-sm font-medium tracking-tight mb-1.5 block">
              Tiêu đề <span className="text-red-500">*</span>
            </Label>
            <Input
              id="alert-title"
              placeholder="Nhập tiêu đề cảnh báo..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="tracking-tight"
              maxLength={100}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{title.length}/100</p>
          </div>

          {/* Body */}
          <div>
            <Label htmlFor="alert-body" className="text-sm font-medium tracking-tight mb-1.5 block">
              Nội dung <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="alert-body"
              placeholder="Nhập nội dung chi tiết của cảnh báo..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="tracking-tight resize-none min-h-24"
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{body.length}/500</p>
          </div>

          {/* Confirm checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-red-600 cursor-pointer"
              />
            </div>
            <p className="text-xs text-muted-foreground tracking-tight leading-relaxed group-hover:text-foreground transition-colors">
              Tôi xác nhận phát thông báo này đến <span className="font-semibold text-foreground">toàn bộ người dùng</span> trong hệ thống. Hành động này không thể hoàn tác.
            </p>
          </label>

          {/* Warning banner */}
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <Warning size={16} className="text-amber-600 mt-0.5 shrink-0" weight="fill" />
            <p className="text-xs text-amber-800 tracking-tight leading-relaxed">
              Cảnh báo sẽ được đẩy thông báo ngay lập tức. Đảm bảo thông tin chính xác trước khi gửi.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 tracking-tight"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button
              className={cn(
                "flex-1 gap-2 tracking-tight font-semibold transition-all",
                canSend
                  ? "bg-linear-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-lg shadow-red-500/25"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
              onClick={handleSend}
              disabled={!canSend || isPending}
            >
              {isPending ? (
                <Spinner size={16} className="animate-spin" />
              ) : (
                <BellRinging size={16} weight="fill" />
              )}
              {isPending ? "Đang gửi..." : "Phát cảnh báo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
