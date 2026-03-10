"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  WarningCircle,
  FirstAid,
  Users,
  Package,
  X,
  PaperPlaneTilt,
  Crosshair,
} from "@phosphor-icons/react";
import { useCreateSOSRequest } from "@/services/sos_request/hooks";
import type { CreateSOSRequestPayload } from "@/services/sos_request/type";
import { useAuthStore } from "@/stores/auth.store";

// ── Dynamic Map Picker (SSR disabled) ──

const LocationPickerMap = dynamic<{
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
}>(() => import("@/app/dashboard/coordinator/create-sos/LocationPickerMap"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[300px] rounded-lg" />,
});

// ── Option Constants ──

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

// ── Toggle Chip Component ──

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
      className="cursor-pointer select-none transition-colors text-sm py-1.5 px-3"
      onClick={onClick}
    >
      {label}
      {selected && <X size={10} className="ml-1" />}
    </Badge>
  );
}

// ── Selectable Card for Situation ──

function SituationCard({
  label,
  value,
  selected,
  onClick,
}: {
  label: string;
  value: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all text-left ${
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border hover:border-muted-foreground/40 text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ── Main Page ──

function CreateSOSContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutate: createSOS, isPending } = useCreateSOSRequest();
  const user = useAuthStore((state) => state.user);

  // ── Sender info ──
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // ── Core ──
  const [msg, setMsg] = useState("");
  const [lat, setLat] = useState(searchParams.get("lat") ?? "");
  const [lng, setLng] = useState(searchParams.get("lng") ?? "");

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

  const toggleItem = (
    arr: string[],
    setArr: (v: string[]) => void,
    val: string,
  ) => {
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone (Vietnamese format)
    const phoneRegex = /^(0[2-9]\d{8}|84[2-9]\d{8}|\+84[2-9]\d{8})$/;
    if (phone.trim() && !phoneRegex.test(phone.trim().replace(/[\s.-]/g, ""))) {
      toast.error("Số điện thoại không hợp lệ (VD: 0901234567)");
      return;
    }

    if (!msg.trim()) {
      toast.error("Vui lòng nhập nội dung SOS");
      return;
    }

    if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
      toast.error("Vui lòng nhập toạ độ hợp lệ");
      return;
    }

    // Validate lat/lng range
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (latNum < -90 || latNum > 90) {
      toast.error("Vĩ độ phải nằm trong khoảng -90 đến 90");
      return;
    }
    if (lngNum < -180 || lngNum > 180) {
      toast.error("Kinh độ phải nằm trong khoảng -180 đến 180");
      return;
    }

    if (!situation) {
      toast.error("Vui lòng chọn tình huống");
      return;
    }

    // Validate people count > 0
    const totalPeople =
      Math.max(0, parseInt(adultCount) || 0) +
      Math.max(0, parseInt(childCount) || 0) +
      Math.max(0, parseInt(elderlyCount) || 0);
    if (totalPeople <= 0) {
      toast.error("Tổng số người phải lớn hơn 0");
      return;
    }

    const payload: CreateSOSRequestPayload = {
      msg: msg.trim(),
      location: {
        lat: latNum,
        lng: lngNum,
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
        user_id: user?.userId,
        user_name: name.trim() || undefined,
        user_phone: phone.trim() || undefined,
        is_online: true,
      },
    };

    createSOS(payload, {
      onSuccess: () => {
        toast.success("Tạo yêu cầu SOS thành công!");
        router.push("/dashboard/coordinator");
      },
      onError: (err: any) => {
        console.error(err);
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          err?.message ||
          "Tạo SOS thất bại, vui lòng thử lại.";
        toast.error(message);
      },
    });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/coordinator")}
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-base font-semibold">Tạo yêu cầu SOS</h1>
            <p className="text-xs text-muted-foreground">
              Nhập thông tin từ cuộc gọi cầu cứu
            </p>
          </div>
        </div>
      </header>

      {/* ── Form ── */}
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-3xl p-4 space-y-6 pb-28"
      >
        {/* ─── 1. Sender Info ─── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <User size={16} /> Thông tin người gọi
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên người gọi</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Phone size={14} /> Số điện thoại
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901 234 567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── 2. Location ─── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <MapPin size={16} /> Toạ độ vị trí{" "}
              <span className="text-red-500">*</span>
            </p>

            {/* Mini Map Picker */}
            <div className="rounded-lg overflow-hidden border">
              <LocationPickerMap
                lat={lat ? Number(lat) : undefined}
                lng={lng ? Number(lng) : undefined}
                onPick={(pickedLat, pickedLng) => {
                  setLat(pickedLat.toFixed(6));
                  setLng(pickedLng.toFixed(6));
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Crosshair size={12} />
              Click trên bản đồ để chọn vị trí, hoặc nhập toạ độ thủ công bên
              dưới
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vĩ độ (Latitude)</Label>
                <Input
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="16.047079"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Kinh độ (Longitude)</Label>
                <Input
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="108.206230"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── 3. Message ─── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <WarningCircle size={16} /> Lời gọi cứu{" "}
              <span className="text-red-500">*</span>
            </p>
            <Textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Nước ngập ngang ngực, cần thuyền cứu hộ gấp..."
              rows={3}
              required
            />
          </CardContent>
        </Card>

        {/* ─── 4. Situation ─── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">
              Tình huống <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SITUATION_OPTIONS.map((opt) => (
                <SituationCard
                  key={opt.value}
                  label={opt.label}
                  value={opt.value}
                  selected={situation === opt.value}
                  onClick={() => setSituation(opt.value)}
                />
              ))}
            </div>
            {situation === "OTHER" && (
              <Input
                value={otherSituation}
                onChange={(e) => setOtherSituation(e.target.value)}
                placeholder="Mô tả tình huống khác..."
                className="mt-2"
              />
            )}
          </CardContent>
        </Card>

        {/* ─── 5. People Count ─── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Users size={16} /> Số người
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Người lớn</Label>
                <Input
                  type="number"
                  min={0}
                  value={adultCount}
                  onChange={(e) => setAdultCount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Trẻ em</Label>
                <Input
                  type="number"
                  min={0}
                  value={childCount}
                  onChange={(e) => setChildCount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Người già</Label>
                <Input
                  type="number"
                  min={0}
                  value={elderlyCount}
                  onChange={(e) => setElderlyCount(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── 6. Medical / Injury ─── */}
        <Card>
          <CardContent className="pt-6 space-y-5">
            <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <FirstAid size={16} /> Tình trạng y tế
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
              <div className="space-y-2 pt-1">
                <Label className="text-muted-foreground">
                  Vấn đề y tế cụ thể
                </Label>
                <div className="flex flex-wrap gap-2">
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
          </CardContent>
        </Card>

        {/* ─── 7. Supplies ─── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Package size={16} /> Nhu yếu phẩm cần thiết
            </p>
            <div className="flex flex-wrap gap-2">
              {SUPPLY_OPTIONS.map((opt) => (
                <ToggleChip
                  key={opt.value}
                  label={opt.label}
                  selected={supplies.includes(opt.value)}
                  onClick={() => toggleItem(supplies, setSupplies, opt.value)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── 8. Additional ─── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm font-semibold text-muted-foreground">
              Ghi chú thêm
            </p>
            <Textarea
              value={additionalDescription}
              onChange={(e) => setAdditionalDescription(e.target.value)}
              placeholder="Thông tin bổ sung từ cuộc gọi (nếu có)..."
              rows={3}
            />
          </CardContent>
        </Card>
      </form>

      {/* ── Sticky Footer ── */}
      <div className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur-sm z-50">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-4 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/coordinator")}
            disabled={isPending}
          >
            Huỷ bỏ
          </Button>
          <Button
            type="submit"
            form="create-sos-form"
            disabled={isPending}
            className="gap-2"
            onClick={(e) => {
              // Submit the form by dispatching a submit event
              e.preventDefault();
              const form = document.querySelector("form");
              form?.requestSubmit();
            }}
          >
            {isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Đang tạo...
              </>
            ) : (
              <>
                <PaperPlaneTilt size={16} weight="fill" />
                Xác nhận tạo SOS
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CreateSOSPage() {
  return (
    <Suspense>
      <CreateSOSContent />
    </Suspense>
  );
}
