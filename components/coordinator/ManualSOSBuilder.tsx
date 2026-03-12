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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Phone,
  User,
  WarningCircle,
  FirstAid,
  Users,
  Package,
  X,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useCreateSOSRequest } from "@/services/sos_request/hooks";
import type { CreateSOSRequestPayload } from "@/services/sos_request/type";

const SITUATION_OPTIONS = [
  { value: "TRAPPED", label: "Mắc kẹt" },
  { value: "ISOLATED", label: "Bị cô lập" },
  { value: "STRANDED", label: "Mắc cạn" },
  { value: "OTHER", label: "Khác" },
] as const;

const MEDICAL_ISSUE_OPTIONS = [
  { value: "FRACTURE", label: "Gãy xương" },
  { value: "BLEEDING", label: "Chảy máu" },
  { value: "CHRONIC_DISEASE", label: "Bệnh mãn tính" },
  { value: "PREGNANCY", label: "Thai phụ" },
  { value: "BREATHING_DIFFICULTY", label: "Khó thở" },
  { value: "MOBILITY_IMPAIRMENT", label: "Hạn chế vận động" },
] as const;

const SUPPLY_OPTIONS = [
  { value: "MEDICINE", label: "Thuốc" },
  { value: "FOOD", label: "Thực phẩm" },
  { value: "WATER", label: "Nước uống" },
  { value: "RESCUE_EQUIPMENT", label: "Thiết bị cứu hộ" },
  { value: "TRANSPORTATION", label: "Phương tiện" },
] as const;

interface ManualSOSBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickedLocation: { lat: number; lng: number } | null;
  onPickLocationMode: () => void;
  onSuccess?: () => void;
}

function ToggleChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Badge
      variant={selected ? "default" : "outline"}
      className="cursor-pointer select-none transition-colors"
      onClick={onClick}
    >
      {label}
      {selected && <X size={10} className="ml-1" />}
    </Badge>
  );
}

export function ManualSOSBuilder({
  open,
  onOpenChange,
  pickedLocation,
  onPickLocationMode,
  onSuccess,
}: ManualSOSBuilderProps) {
  // ── Sender info ──
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // ── Core ──
  const [msg, setMsg] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  // ── Address geocoding ──
  const [address, setAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  // ── Structured data ──
  const [situation, setSituation] = useState("");
  const [otherSituation, setOtherSituation] = useState("");
  const [adultCount, setAdultCount] = useState("1");
  const [childCount, setChildCount] = useState("0");
  const [elderlyCount, setElderlyCount] = useState("0");
  const [hasInjured, setHasInjured] = useState(false);
  const [needMedical, setNeedMedical] = useState(false);
  const [canMove, setCanMove] = useState(true);
  const [othersAreStable, setOthersAreStable] = useState(true);
  const [medicalIssues, setMedicalIssues] = useState<string[]>([]);
  const [supplies, setSupplies] = useState<string[]>([]);
  const [additionalDescription, setAdditionalDescription] = useState("");

  const { mutate: createSOS, isPending } = useCreateSOSRequest();

  const geocodeAddress = async () => {
    const query = address.trim();
    if (!query) {
      toast.error("Vui lòng nhập địa chỉ cần tìm");
      return;
    }
    setIsGeocoding(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        limit: "1",
        addressdetails: "1",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        {
          headers: {
            "Accept-Language": "vi,en",
            "User-Agent": "ResQ-SOS-WebClient/1.0",
          },
        },
      );
      if (!res.ok) throw new Error("Nominatim request failed");
      const data = await res.json();
      if (!data.length) {
        toast.error("Không tìm thấy địa chỉ, hãy thử từ khoá khác");
        return;
      }
      const { lat: resLat, lon: resLon, display_name } = data[0];
      setLat(parseFloat(resLat).toFixed(6));
      setLng(parseFloat(resLon).toFixed(6));
      toast.success(`Đã xác định: ${display_name}`);
    } catch {
      toast.error("Lỗi tra cứu địa chỉ, vui lòng thử lại");
    } finally {
      setIsGeocoding(false);
    }
  };

  const toggleItem = (
    arr: string[],
    setArr: (v: string[]) => void,
    val: string,
  ) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  // Update loc if new one picked
  useEffect(() => {
    if (pickedLocation) {
      setLat(pickedLocation.lat.toFixed(6));
      setLng(pickedLocation.lng.toFixed(6));
    }
  }, [pickedLocation]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setMsg("");
    setLat("");
    setLng("");
    setSituation("");
    setOtherSituation("");
    setAdultCount("1");
    setChildCount("0");
    setElderlyCount("0");
    setHasInjured(false);
    setNeedMedical(false);
    setCanMove(true);
    setOthersAreStable(true);
    setMedicalIssues([]);
    setSupplies([]);
    setAdditionalDescription("");
    setAddress("");
  };

  // Reset form when opened fresh
  useEffect(() => {
    if (open && !pickedLocation && !name && !phone && !msg && !lat && !lng) {
      resetForm();
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

    if (!situation) {
      toast.error("Vui lòng chọn tình huống");
      return;
    }

    const payload: CreateSOSRequestPayload = {
      msg: msg.trim(),
      location: {
        lat: Number(lat),
        lng: Number(lng),
      },
      structured_data: {
        situation,
        other_situation_description:
          situation === "OTHER" ? otherSituation.trim() : "",
        has_injured: hasInjured,
        medical_issues: medicalIssues,
        other_medical_description: "",
        others_are_stable: othersAreStable,
        people_count: {
          adult: Math.max(0, parseInt(adultCount) || 0),
          child: Math.max(0, parseInt(childCount) || 0),
          elderly: Math.max(0, parseInt(elderlyCount) || 0),
        },
        can_move: canMove,
        need_medical: needMedical,
        supplies,
        other_supply_description: "",
        additional_description: additionalDescription.trim(),
        injured_persons: [],
      },
      sender_info: {
        user_name: name.trim() || undefined,
        user_phone: phone.trim() || undefined,
      },
    };

    createSOS(payload, {
      onSuccess: () => {
        toast.success("Tạo yêu cầu SOS thành công!");
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (err) => {
        console.error(err);
        toast.error("Tạo SOS thất bại, vui lòng thử lại.");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Tạo SOS theo yêu cầu</DialogTitle>
          <DialogDescription>
            Nhập thông tin nạn nhân gọi tới. Toạ độ có thể nhập thủ công hoặc
            click để chọn trên bản đồ.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <form
            id="manual-sos-form"
            onSubmit={handleSubmit}
            className="space-y-5 pb-2"
          >
            {/* ── Sender Info ── */}
            <div className="space-y-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <User size={12} /> Thông tin người gọi
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tên</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    <Phone size={12} /> Số điện thoại
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="099..."
                  />
                </div>
              </div>
            </div>

            {/* ── Location ── */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin size={12} /> Toạ độ{" "}
                  <span className="text-red-500">*</span>
                </p>
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

              {/* Address → geocode */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Tra địa chỉ
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="VD: 123 Nguyễn Trãi, Q.1, TP.HCM"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        geocodeAddress();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={geocodeAddress}
                    disabled={isGeocoding}
                  >
                    <MagnifyingGlass size={14} className="mr-1" />
                    {isGeocoding ? "Đang tìm..." : "Tìm"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

            {/* ── Message ── */}
            <div className="space-y-1.5 text-sm">
              <Label className="flex items-center gap-1.5">
                <WarningCircle size={14} /> Lời gọi cứu{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Nước ngập ngang ngực, cần thuyền..."
                rows={2}
                required
              />
            </div>

            {/* ── Situation ── */}
            <div className="space-y-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tình huống <span className="text-red-500">*</span>
              </p>
              <Select value={situation} onValueChange={setSituation}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tình huống" />
                </SelectTrigger>
                <SelectContent>
                  {SITUATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {situation === "OTHER" && (
                <Input
                  value={otherSituation}
                  onChange={(e) => setOtherSituation(e.target.value)}
                  placeholder="Mô tả tình huống khác..."
                />
              )}
            </div>

            {/* ── People Count ── */}
            <div className="space-y-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Users size={12} /> Số người
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Người lớn</Label>
                  <Input
                    type="number"
                    min={0}
                    value={adultCount}
                    onChange={(e) => setAdultCount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Trẻ em</Label>
                  <Input
                    type="number"
                    min={0}
                    value={childCount}
                    onChange={(e) => setChildCount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Người già</Label>
                  <Input
                    type="number"
                    min={0}
                    value={elderlyCount}
                    onChange={(e) => setElderlyCount(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ── Medical / Injury Status ── */}
            <div className="space-y-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <FirstAid size={12} /> Tình trạng y tế
              </p>
              <div className="flex flex-wrap gap-2">
                <ToggleChip
                  label="Có người bị thương"
                  selected={hasInjured}
                  onClick={() => setHasInjured(!hasInjured)}
                />
                <ToggleChip
                  label="Cần hỗ trợ y tế"
                  selected={needMedical}
                  onClick={() => setNeedMedical(!needMedical)}
                />
                <ToggleChip
                  label="Có thể di chuyển"
                  selected={canMove}
                  onClick={() => setCanMove(!canMove)}
                />
                <ToggleChip
                  label="Người khác ổn định"
                  selected={othersAreStable}
                  onClick={() => setOthersAreStable(!othersAreStable)}
                />
              </div>

              {hasInjured && (
                <div className="space-y-1.5">
                  <Label>Vấn đề y tế</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {MEDICAL_ISSUE_OPTIONS.map((opt) => (
                      <ToggleChip
                        key={opt.value}
                        label={opt.label}
                        selected={medicalIssues.includes(opt.value)}
                        onClick={() =>
                          toggleItem(medicalIssues, setMedicalIssues, opt.value)
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Supplies Needed ── */}
            <div className="space-y-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Package size={12} /> Nhu yếu phẩm cần thiết
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUPPLY_OPTIONS.map((opt) => (
                  <ToggleChip
                    key={opt.value}
                    label={opt.label}
                    selected={supplies.includes(opt.value)}
                    onClick={() => toggleItem(supplies, setSupplies, opt.value)}
                  />
                ))}
              </div>
            </div>

            {/* ── Additional Description ── */}
            <div className="space-y-1.5 text-sm">
              <Label>Ghi chú thêm</Label>
              <Textarea
                value={additionalDescription}
                onChange={(e) => setAdditionalDescription(e.target.value)}
                placeholder="Thông tin bổ sung (nếu có)..."
                rows={2}
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Huỷ bỏ
          </Button>
          <Button type="submit" form="manual-sos-form" disabled={isPending}>
            {isPending ? "Đang tạo..." : "Xác nhận tạo SOS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
