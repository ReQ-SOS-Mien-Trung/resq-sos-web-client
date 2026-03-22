"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Spinner,
  NavigationArrow,
  UsersThree,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  useCreateAssemblyPoint,
  useUpdateAssemblyPoint,
} from "@/services/assembly_points";
import type { AssemblyPointEntity } from "@/services/assembly_points";

const LocationPickerMap = dynamic(
  () => import("@/components/admin/assembly-points/LocationPickerMap"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-70 rounded-lg" />,
  },
);

const CAPACITY_PRESETS = [5, 10, 20, 50, 100];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, the dialog is in edit mode */
  editItem?: AssemblyPointEntity | null;
}

export function AssemblyPointFormDialog({
  open,
  onOpenChange,
  editItem,
}: Props) {
  const isEdit = !!editItem;

  const [name, setName] = useState(editItem?.name ?? "");
  const [lat, setLat] = useState(editItem ? String(editItem.latitude) : "");
  const [lng, setLng] = useState(editItem ? String(editItem.longitude) : "");
  const [capacity, setCapacity] = useState(
    editItem ? String(editItem.maxCapacity) : "",
  );

  const { mutate: create, isPending: isCreating } = useCreateAssemblyPoint();
  const { mutate: update, isPending: isUpdating } = useUpdateAssemblyPoint();
  const isPending = isCreating || isUpdating;

  const handleClose = (val: boolean) => {
    if (!val) {
      setName("");
      setLat("");
      setLng("");
      setCapacity("");
    }
    onOpenChange(val);
  };

  const handleMapPick = (pickedLat: number, pickedLng: number) => {
    setLat(pickedLat.toFixed(6));
    setLng(pickedLng.toFixed(6));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên điểm tập kết");
      return;
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!lat || !lng || isNaN(latNum) || isNaN(lngNum)) {
      toast.error("Vui lòng chọn vị trí trên bản đồ hoặc nhập tọa độ hợp lệ");
      return;
    }
    if (latNum < -90 || latNum > 90) {
      toast.error("Vĩ độ phải nằm trong khoảng -90 đến 90");
      return;
    }
    if (lngNum < -180 || lngNum > 180) {
      toast.error("Kinh độ phải nằm trong khoảng -180 đến 180");
      return;
    }

    const capNum = Number(capacity);
    if (!capacity || isNaN(capNum) || capNum < 1) {
      toast.error("Sức chứa phải lớn hơn 0");
      return;
    }
    if (capNum > 10000) {
      toast.error("Sức chứa không được vượt quá 10.000 người");
      return;
    }

    const payload = {
      name: name.trim(),
      latitude: latNum,
      longitude: lngNum,
      maxCapacity: Math.floor(capNum),
    };

    if (isEdit && editItem) {
      update(
        { id: editItem.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Cập nhật điểm tập kết thành công!");
            handleClose(false);
          },
          onError: () => toast.error("Cập nhật thất bại. Vui lòng thử lại."),
        },
      );
    } else {
      create(payload, {
        onSuccess: () => {
          toast.success("Tạo điểm tập kết thành công!");
          handleClose(false);
        },
        onError: () => toast.error("Tạo điểm tập kết thất bại. Vui lòng thử lại."),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="tracking-tighter">
            {isEdit ? "Chỉnh sửa điểm tập kết" : "Tạo điểm tập kết mới"}
          </DialogTitle>
          <DialogDescription className="tracking-tight">
            {isEdit
              ? "Cập nhật thông tin điểm tập kết"
              : "Nhấn vào bản đồ để chọn vị trí, sau đó điền thông tin bên dưới"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="ap-name" className="text-base font-medium tracking-tight">
              Tên điểm tập kết <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ap-name"
              placeholder="VD: Điểm tập kết Sân vận động Hòa Xuân"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="tracking-tight"
              maxLength={200}
            />
          </div>

          {/* Map */}
          <div className="space-y-2">
            <Label className="text-base font-medium tracking-tight flex items-center gap-1.5">
              <MapPin size={14} className="text-red-500" />
              Chọn vị trí trên bản đồ <span className="text-red-500">*</span>
            </Label>
            <LocationPickerMap
              lat={lat ? Number(lat) : undefined}
              lng={lng ? Number(lng) : undefined}
              onPick={handleMapPick}
              height={280}
            />
          </div>

          {/* Lat / Lng manual input */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-lat" className="text-sm font-medium text-muted-foreground tracking-tight flex items-center gap-1">
                <NavigationArrow size={12} />
                Vĩ độ (Latitude)
              </Label>
              <Input
                id="ap-lat"
                type="number"
                step="any"
                placeholder="16.047079"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="font-mono text-base tracking-tight"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-lng" className="text-sm font-medium text-muted-foreground tracking-tight flex items-center gap-1">
                <NavigationArrow size={12} className="rotate-90" />
                Kinh độ (Longitude)
              </Label>
              <Input
                id="ap-lng"
                type="number"
                step="any"
                placeholder="108.20623"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="font-mono text-base tracking-tight"
              />
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-2">
            <Label htmlFor="ap-capacity" className="text-base font-medium tracking-tight flex items-center gap-1.5">
              <UsersThree size={14} className="text-blue-500" />
              Sức chứa người <span className="text-red-500">*</span>
              <span className="text-sm text-muted-foreground font-normal">(tối đa 10.000)</span>
            </Label>
            <div className="flex gap-2 flex-wrap">
              {CAPACITY_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={capacity === String(preset) ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-sm tracking-tight"
                  onClick={() => setCapacity(String(preset))}
                >
                  {preset} người
                </Button>
              ))}
            </div>
            <Input
              id="ap-capacity"
              type="number"
              min={1}
              max={10000}
              placeholder="Hoặc nhập số tùy chỉnh..."
              value={capacity}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || (Number(val) >= 0 && Number(val) <= 10000)) {
                  setCapacity(val);
                }
              }}
              className="tracking-tight"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isPending}
            className="tracking-tight"
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="gap-2 tracking-tight bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
          >
            {isPending ? (
              <Spinner size={16} className="animate-spin" />
            ) : null}
            {isEdit ? "Cập nhật" : "Tạo mới"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
