"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Phone, User, WarningCircle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useCreateSOSRequest } from "@/services/sos_request/hooks";

interface ManualSOSBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickedLocation: { lat: number; lng: number } | null;
  onPickLocationMode: () => void;
  onSuccess?: () => void;
}

export function ManualSOSBuilder({
  open,
  onOpenChange,
  pickedLocation,
  onPickLocationMode,
  onSuccess,
}: ManualSOSBuilderProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const { mutate: createSOS, isPending } = useCreateSOSRequest();

  // Update loc if new one picked
  useEffect(() => {
    if (pickedLocation) {
      setLat(pickedLocation.lat.toFixed(6));
      setLng(pickedLocation.lng.toFixed(6));
    }
  }, [pickedLocation]);

  // Reset form when opened fresh (no picked location)
  useEffect(() => {
    if (open && !pickedLocation && !name && !phone && !msg && !lat && !lng) {
      setName("");
      setPhone("");
      setMsg("");
      setLat("");
      setLng("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!msg.trim()) {
      toast.error("Vui lòng nhập nội dung SOS");
      return;
    }

    if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
      toast.error("Vui lòng nhập toạ độ hợp lệ hoặc chọn trên bản đồ");
      return;
    }

    createSOS(
      {
        msg: msg.trim(),
        latitude: Number(lat),
        longitude: Number(lng),
        senderInfo: {
          user_name: name.trim() || undefined,
          user_phone: phone.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Tạo yêu cầu SOS thành công!");
          setName("");
          setPhone("");
          setMsg("");
          setLat("");
          setLng("");
          onOpenChange(false);
          onSuccess?.();
        },
        onError: (err) => {
          console.error(err);
          toast.error("Tạo SOS thất bại, vui lòng thử lại.");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tạo SOS theo yêu cầu</DialogTitle>
          <DialogDescription>
            Nhập thông tin nạn nhân gọi tới. Toạ độ có thể nhập thủ công hoặc
            click để chọn trên bản đồ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User size={14} /> Tên người gọi
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone size={14} /> Số điện thoại
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="099..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <WarningCircle size={14} /> Tình trạng / Lời gọi cứu{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Nước ngập ngang ngực, cần thuyền..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <MapPin size={14} /> Toạ độ (Lat, Lng){" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={onPickLocationMode}
                >
                  <MapPin size={12} className="mr-1" />
                  Chọn trên bản đồ
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="Vĩ độ (Latitude)"
                  required
                />
                <Input
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="Kinh độ (Longitude)"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Huỷ bỏ
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang tạo..." : "Xác nhận tạo SOS"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
