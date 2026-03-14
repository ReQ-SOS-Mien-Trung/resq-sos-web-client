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
  User,
  WarningCircle,
  FirstAid,
  Users,
  Package,
  X,
  PaperPlaneTilt,
  Crosshair,
  MagnifyingGlass,
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
      className="cursor-pointer select-none transition-colors text-xs py-1 px-2 hover:opacity-80"
      onClick={onClick}
    >
      {label}
      {selected && <X size={12} className="ml-1" />}
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
      className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all text-center ${
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

  // ── Address geocoding ──
  const [address, setAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  const geocodeAddress = async () => {
    const query = address.trim();
    if (!query) {
      toast.error("Vui lòng nhập địa chỉ cần tìm");
      return;
    }
    setIsGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Geocode request failed");

      const payload = (await res.json()) as {
        results?: Array<{ lat: string; lon: string; display_name: string }>;
      };
      const data = payload.results ?? [];

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
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
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
              Giao diện nhập nhanh dành cho điều phối viên
            </p>
          </div>
        </div>
      </header>

      <form
        id="create-sos-form"
        onSubmit={handleSubmit}
        className="mx-auto max-w-7xl px-4 py-4 pb-24"
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <section className="space-y-4 xl:col-span-8">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardContent className="pt-5 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                    <User size={16} /> Thông tin người gọi
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-foreground/90">
                        Tên người gọi
                      </Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-foreground/90">
                        Số điện thoại
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

              <Card>
                <CardContent className="pt-5 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                    <WarningCircle size={16} /> Tình huống
                    <span className="text-red-500">*</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
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
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-5 space-y-4">
                <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <MapPin size={16} /> Vị trí cần cứu
                  <span className="text-red-500">*</span>
                </p>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Tìm nhanh địa chỉ: số nhà, đường, xã/phường..."
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
                    onClick={geocodeAddress}
                    disabled={isGeocoding}
                    className="gap-1.5"
                  >
                    <MagnifyingGlass size={14} />
                    {isGeocoding ? "Đang tìm..." : "Tìm vị trí"}
                  </Button>
                </div>

                <div className="rounded-lg overflow-hidden border h-[280px]">
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
                  <Crosshair size={12} /> Chạm vào bản đồ để chọn điểm chính xác
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <PaperPlaneTilt size={16} /> Mô tả tình trạng
                  <span className="text-red-500">*</span>
                </p>
                <Textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Ví dụ: Nước ngập nhanh, có người già và trẻ em, cần hỗ trợ khẩn cấp..."
                  rows={3}
                  required
                />
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4 xl:col-span-4 xl:sticky xl:top-20 xl:self-start">
            <Card>
              <CardContent className="pt-5 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <Users size={16} /> Số người cần hỗ trợ
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Người lớn</Label>
                    <Input
                      type="number"
                      min={0}
                      value={adultCount}
                      onChange={(e) => setAdultCount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Trẻ em</Label>
                    <Input
                      type="number"
                      min={0}
                      value={childCount}
                      onChange={(e) => setChildCount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Người già</Label>
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

            <Card>
              <CardContent className="pt-5 space-y-3">
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
                            toggleItem(
                              medicalIssues,
                              setMedicalIssues,
                              opt.value,
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <Package size={16} /> Nhu yếu phẩm
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUPPLY_OPTIONS.map((opt) => (
                    <ToggleChip
                      key={opt.value}
                      label={opt.label}
                      selected={supplies.includes(opt.value)}
                      onClick={() =>
                        toggleItem(supplies, setSupplies, opt.value)
                      }
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5 space-y-2">
                <Label className="text-sm font-semibold text-muted-foreground">
                  Ghi chú thêm
                </Label>
                <Textarea
                  value={additionalDescription}
                  onChange={(e) => setAdditionalDescription(e.target.value)}
                  placeholder="Thông tin bổ sung từ cuộc gọi (nếu có)..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </aside>
        </div>
      </form>

      <div className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur-sm z-50">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-3 px-4 py-3">
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
