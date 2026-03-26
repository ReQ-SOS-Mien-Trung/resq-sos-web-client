"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  ArrowCounterClockwise,
  Crosshair,
  FirstAid,
  MagnifyingGlass,
  MapPin,
  Package,
  PaperPlaneTilt,
  PencilSimple,
  ShieldWarning,
  User,
  Users,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSOSRequest } from "@/services/sos_request/hooks";
import type {
  ClothingGenderType,
  CreateSOSRequestPayload,
  MedicalIssueType,
  SupplyType,
} from "@/services/sos_request/type";
import { useAuthStore } from "@/stores/auth.store";
import {
  buildGeneratedSOSMessage,
  buildSharedPeople,
  buildStructuredDataFromForm,
  CLOTHING_GENDER_OPTIONS,
  createEmptyReliefState,
  createEmptyRescueState,
  emptyPeopleCount,
  FOOD_DURATION_OPTIONS,
  getClothingGenderLabel,
  getMedicalIssueLabel,
  getPersonDisplayName,
  getPersonIcon,
  getPersonTypeLabel,
  getSosTypeLabel,
  getSupplyLabel,
  groupedMedicalIssuesForPersonType,
  isReliefSOSType,
  isRescueSOSType,
  MEDICAL_SUPPORT_OPTIONS,
  peopleCountTotal,
  RESCUE_SITUATION_OPTIONS,
  SOS_TYPE_OPTIONS,
  SUPPLY_OPTIONS,
  syncReliefStateToPeople,
  syncRescueStateToPeople,
  WATER_DURATION_OPTIONS,
  WATER_REMAINING_OPTIONS,
  type ClothingInfoState,
  type CoordinatorSOSType,
  type PeopleCountValue,
  type ReliefFormState,
  type RescueFormState,
  type RescueMedicalInfoState,
  type SharedPerson,
  type SpecialDietInfoState,
} from "@/lib/sos";

const EDITORIAL_CARD =
  "rounded-none border-2 border-black bg-white shadow-[4px_4px_0_0_#000]";
const EDITORIAL_INPUT =
  "rounded-none border-black focus-visible:ring-2 focus-visible:ring-[#FF5722]";
const SECTION_TITLE =
  "text-sm font-extrabold flex items-center gap-2 uppercase tracking-wide text-black";

const LocationPickerMap = dynamic<{
  lat?: number;
  lng?: number;
  onPick: (lat: number, lng: number) => void;
}>(() => import("@/app/dashboard/coordinator/create-sos/LocationPickerMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full rounded-none" />,
});

interface CoordinatorSOSFormProps {
  mode?: "page" | "dialog";
  initialCoordinates?: {
    lat?: string | number | null;
    lng?: string | number | null;
  };
  pickedLocation?: { lat: number; lng: number } | null;
  onPickLocationMode?: () => void;
  onCancel?: () => void;
  onSuccess?: () => void;
}

type EditorState =
  | { mode: "medical"; personId: string }
  | { mode: "specialDiet"; personId: string }
  | { mode: "clothing"; personId: string }
  | null;

export default function CoordinatorSOSForm({
  mode = "page",
  initialCoordinates,
  pickedLocation,
  onPickLocationMode,
  onCancel,
  onSuccess,
}: CoordinatorSOSFormProps) {
  const isDialog = mode === "dialog";
  const { mutate: createSOS, isPending } = useCreateSOSRequest();
  const user = useAuthStore((state) => state.user);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [lat, setLat] = useState(toCoordinateString(initialCoordinates?.lat));
  const [lng, setLng] = useState(toCoordinateString(initialCoordinates?.lng));

  const [sosType, setSosType] = useState<CoordinatorSOSType | "">("");
  const [peopleCount, setPeopleCount] =
    useState<PeopleCountValue>(emptyPeopleCount());
  const [sharedPeople, setSharedPeople] = useState<SharedPerson[]>([]);
  const [rescue, setRescue] = useState<RescueFormState>(createEmptyRescueState);
  const [relief, setRelief] = useState<ReliefFormState>(createEmptyReliefState);
  const [additionalDescription, setAdditionalDescription] = useState("");
  const [activeEditor, setActiveEditor] = useState<EditorState>(null);

  const totalPeople = peopleCountTotal(peopleCount);

  useEffect(() => {
    setSharedPeople((current) => buildSharedPeople(peopleCount, current));
  }, [peopleCount]);

  useEffect(() => {
    const validIds = sharedPeople.map((person) => person.id);
    setRescue((current) => syncRescueStateToPeople(current, validIds));
    setRelief((current) =>
      syncReliefStateToPeople(current, validIds, totalPeople),
    );
  }, [sharedPeople, totalPeople]);

  useEffect(() => {
    if (pickedLocation) {
      setLat(pickedLocation.lat.toFixed(6));
      setLng(pickedLocation.lng.toFixed(6));
    }
  }, [pickedLocation]);

  const selectedPerson = useMemo(
    () =>
      activeEditor
        ? (sharedPeople.find((person) => person.id === activeEditor.personId) ??
          null)
        : null,
    [activeEditor, sharedPeople],
  );

  const generatedMessage = useMemo(() => {
    if (!sosType) return "";

    return buildGeneratedSOSMessage({
      sosType,
      peopleCount,
      sharedPeople,
      rescue,
      relief,
      additionalDescription,
    });
  }, [
    additionalDescription,
    peopleCount,
    relief,
    rescue,
    sharedPeople,
    sosType,
  ]);

  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (!sosType) {
      warnings.push("Chọn loại SOS.");
    }

    if (
      !lat ||
      !lng ||
      Number.isNaN(Number(lat)) ||
      Number.isNaN(Number(lng))
    ) {
      warnings.push("Chưa có tọa độ hợp lệ.");
    }

    if (totalPeople <= 0) {
      warnings.push("Tổng số người phải lớn hơn 0.");
    }

    if (sosType && isRescueSOSType(sosType) && !rescue.situation) {
      warnings.push("Phần cứu hộ cần chọn tình trạng hiện tại.");
    }

    if (sosType && isRescueSOSType(sosType)) {
      const injuredWithoutInfo = rescue.injuredPersonIds.some((personId) => {
        const info = rescue.medicalInfoByPerson[personId];
        return !info || info.medicalIssues.length === 0;
      });

      if (injuredWithoutInfo) {
        warnings.push("Có người bị thương chưa nhập chi tiết y tế.");
      }
    }

    if (sosType && isReliefSOSType(sosType) && relief.supplies.length === 0) {
      warnings.push("Phần cứu trợ cần ít nhất một nhu yếu phẩm.");
    }

    if (
      sosType &&
      isReliefSOSType(sosType) &&
      relief.supplies.includes("BLANKET") &&
      relief.areBlanketsEnough === undefined
    ) {
      warnings.push("Cần xác nhận chăn mền còn đủ hay không.");
    }

    if (
      sosType &&
      isReliefSOSType(sosType) &&
      relief.specialDietPersonIds.some((personId) => {
        const description =
          relief.specialDietInfoByPerson[personId]?.dietDescription?.trim() ??
          "";
        return !description;
      })
    ) {
      warnings.push("Có người cần chế độ ăn đặc biệt chưa mô tả rõ.");
    }

    if (
      sosType &&
      isReliefSOSType(sosType) &&
      relief.clothingPersonIds.some(
        (personId) => !relief.clothingInfoByPerson[personId]?.gender,
      )
    ) {
      warnings.push("Có người cần quần áo chưa chọn giới tính.");
    }

    return warnings;
  }, [lat, lng, relief, rescue, sosType, totalPeople]);

  const geocodeAddress = async () => {
    const query = address.trim();
    if (!query) {
      toast.error("Vui lòng nhập địa chỉ cần tìm");
      return;
    }

    setIsGeocoding(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error("Geocode request failed");
      }

      const payload = (await res.json()) as {
        results?: Array<{ lat: string; lon: string; display_name: string }>;
      };
      const results = payload.results ?? [];

      if (!results.length) {
        toast.error("Không tìm thấy địa chỉ, hãy thử từ khoá khác");
        return;
      }

      const firstResult = results[0];
      setLat(Number(firstResult.lat).toFixed(6));
      setLng(Number(firstResult.lon).toFixed(6));
      toast.success(`Đã xác định: ${firstResult.display_name}`);
    } catch {
      toast.error("Lỗi tra cứu địa chỉ, vui lòng thử lại");
    } finally {
      setIsGeocoding(false);
    }
  };

  const updatePersonName = (personId: string, nextName: string) => {
    setSharedPeople((current) =>
      current.map((person) =>
        person.id === personId
          ? { ...person, customName: nextName.trim() }
          : person,
      ),
    );
  };

  const toggleSupply = (supply: SupplyType) => {
    setRelief((current) => {
      const exists = current.supplies.includes(supply);
      if (!exists) {
        return { ...current, supplies: [...current.supplies, supply] };
      }

      const nextSupplies = current.supplies.filter((item) => item !== supply);
      return clearReliefFollowUp(
        { ...current, supplies: nextSupplies },
        supply,
      );
    });
  };

  const toggleInjuredPerson = (personId: string) => {
    const isSelected = rescue.injuredPersonIds.includes(personId);
    setRescue((current) => {
      if (current.injuredPersonIds.includes(personId)) {
        const nextMedicalInfo = { ...current.medicalInfoByPerson };
        delete nextMedicalInfo[personId];
        return {
          ...current,
          injuredPersonIds: current.injuredPersonIds.filter(
            (id) => id !== personId,
          ),
          medicalInfoByPerson: nextMedicalInfo,
        };
      }

      return {
        ...current,
        injuredPersonIds: [...current.injuredPersonIds, personId],
      };
    });

    setActiveEditor(isSelected ? null : { mode: "medical", personId });
  };

  const toggleSpecialDietPerson = (personId: string) => {
    const isSelected = relief.specialDietPersonIds.includes(personId);
    setRelief((current) => {
      if (current.specialDietPersonIds.includes(personId)) {
        const nextInfo = { ...current.specialDietInfoByPerson };
        delete nextInfo[personId];
        return {
          ...current,
          specialDietPersonIds: current.specialDietPersonIds.filter(
            (id) => id !== personId,
          ),
          specialDietInfoByPerson: nextInfo,
        };
      }

      return {
        ...current,
        specialDietPersonIds: [...current.specialDietPersonIds, personId],
        specialDietInfoByPerson: {
          ...current.specialDietInfoByPerson,
          [personId]: current.specialDietInfoByPerson[personId] ?? {
            dietDescription: "",
          },
        },
      };
    });

    setActiveEditor(isSelected ? null : { mode: "specialDiet", personId });
  };

  const toggleClothingPerson = (personId: string) => {
    const isSelected = relief.clothingPersonIds.includes(personId);
    setRelief((current) => {
      if (current.clothingPersonIds.includes(personId)) {
        const nextInfo = { ...current.clothingInfoByPerson };
        delete nextInfo[personId];
        return {
          ...current,
          clothingPersonIds: current.clothingPersonIds.filter(
            (id) => id !== personId,
          ),
          clothingInfoByPerson: nextInfo,
        };
      }

      return {
        ...current,
        clothingPersonIds: [...current.clothingPersonIds, personId],
        clothingInfoByPerson: {
          ...current.clothingInfoByPerson,
          [personId]: current.clothingInfoByPerson[personId] ?? {
            gender: undefined,
          },
        },
      };
    });

    setActiveEditor(isSelected ? null : { mode: "clothing", personId });
  };

  const handleReset = () => {
    setAddress("");
    setLat(toCoordinateString(initialCoordinates?.lat));
    setLng(toCoordinateString(initialCoordinates?.lng));
    setSosType("");
    setPeopleCount(emptyPeopleCount());
    setSharedPeople([]);
    setRescue(createEmptyRescueState());
    setRelief(createEmptyReliefState());
    setAdditionalDescription("");
    setActiveEditor(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedPhone = phone.trim().replace(/[\s.-]/g, "");
    const phoneRegex = /^(0[2-9]\d{8}|84[2-9]\d{8}|\+84[2-9]\d{8})$/;

    if (normalizedPhone && !phoneRegex.test(normalizedPhone)) {
      toast.error("Số điện thoại không hợp lệ (VD: 0901234567)");
      return;
    }

    if (!sosType) {
      toast.error("Vui lòng chọn loại SOS");
      return;
    }

    if (
      !lat ||
      !lng ||
      Number.isNaN(Number(lat)) ||
      Number.isNaN(Number(lng))
    ) {
      toast.error("Vui lòng chọn vị trí hợp lệ");
      return;
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      toast.error("Tọa độ không hợp lệ");
      return;
    }

    if (totalPeople <= 0) {
      toast.error("Tổng số người phải lớn hơn 0");
      return;
    }

    if (isRescueSOSType(sosType) && !rescue.situation) {
      toast.error("Vui lòng chọn tình trạng hiện tại cho phần cứu hộ");
      return;
    }

    if (isReliefSOSType(sosType) && relief.supplies.length === 0) {
      toast.error("Vui lòng chọn ít nhất một nhu yếu phẩm");
      return;
    }

    if (
      isReliefSOSType(sosType) &&
      relief.supplies.includes("BLANKET") &&
      relief.areBlanketsEnough === undefined
    ) {
      toast.error("Vui lòng cho biết chăn mền còn đủ hay không");
      return;
    }

    const payload: CreateSOSRequestPayload = {
      sos_type: sosType,
      msg: generatedMessage,
      location: {
        lat: latNum,
        lng: lngNum,
      },
      structured_data: buildStructuredDataFromForm({
        sosType,
        peopleCount,
        sharedPeople,
        rescue,
        relief,
        additionalDescription,
      }),
      sender_info: {
        user_id: user?.userId,
        user_name: name.trim() || undefined,
        user_phone: normalizedPhone || undefined,
        is_online: true,
      },
    };

    createSOS(payload, {
      onSuccess: () => {
        toast.success("Tạo yêu cầu SOS thành công");
        onSuccess?.();
      },
      onError: (err: any) => {
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
    <>
      <form id="coordinator-sos-form" onSubmit={handleSubmit}>
        <div
          className={cn(
            "grid grid-cols-1 gap-4",
            isDialog ? "lg:grid-cols-12" : "xl:grid-cols-12",
          )}
        >
          <section
            className={cn(
              "space-y-4",
              isDialog
                ? "lg:col-span-8 lg:border-r-2 lg:border-black lg:pr-4"
                : "xl:col-span-8 xl:border-r-2 xl:border-black xl:pr-4",
            )}
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className={EDITORIAL_CARD}>
                <CardContent className="space-y-3 pt-5">
                  <p className={SECTION_TITLE}>
                    <User size={16} /> Thông tin người gọi
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wide text-black/80">
                        Tên người gọi
                      </Label>
                      <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Nguyễn Văn A"
                        className={EDITORIAL_INPUT}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wide text-black/80">
                        Số điện thoại
                      </Label>
                      <Input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="0901 234 567"
                        className={EDITORIAL_INPUT}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={EDITORIAL_CARD}>
                <CardContent className="space-y-3 pt-5">
                  <p className={SECTION_TITLE}>
                    <WarningCircle size={16} /> Loại SOS
                    <span className="text-red-500">*</span>
                  </p>
                  <div className="grid gap-2">
                    {SOS_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSosType(option.value)}
                        className={cn(
                          "border-2 px-4 py-3 text-left transition-colors",
                          sosType === option.value
                            ? "border-[#FF5722] bg-[#FF5722] text-white"
                            : "border-black bg-white hover:bg-black hover:text-white",
                        )}
                      >
                        <div className="text-sm font-black uppercase">
                          {option.label}
                        </div>
                        <div
                          className={cn(
                            "mt-1 text-xs",
                            sosType === option.value
                              ? "text-white/80"
                              : "text-black/65",
                          )}
                        >
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className={EDITORIAL_CARD}>
              <CardContent className="space-y-4 pt-5">
                <p className={SECTION_TITLE}>
                  <MapPin size={16} /> Vị trí cần hỗ trợ
                  <span className="text-red-500">*</span>
                </p>

                <div className="grid grid-cols-1 items-stretch gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Tìm nhanh địa chỉ: số nhà, đường, xã/phường..."
                    className={`${EDITORIAL_INPUT} h-14 text-[20px]`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        geocodeAddress();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={geocodeAddress}
                    disabled={isGeocoding}
                    className="h-14 gap-1.5 rounded-none border-black bg-white px-7 text-[20px] font-semibold hover:bg-black hover:text-white"
                  >
                    <MagnifyingGlass size={14} />
                    {isGeocoding ? "Đang tìm..." : "Tìm vị trí"}
                  </Button>
                </div>

                {isDialog && onPickLocationMode ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onPickLocationMode}
                    className="rounded-none border-black hover:bg-black hover:text-white"
                  >
                    <Crosshair size={16} />
                    Chọn vị trí trên bản đồ dashboard
                  </Button>
                ) : (
                  <div className="h-[280px] overflow-hidden border-2 border-black">
                    <LocationPickerMap
                      lat={lat ? Number(lat) : undefined}
                      lng={lng ? Number(lng) : undefined}
                      onPick={(pickedLat, pickedLng) => {
                        setLat(pickedLat.toFixed(6));
                        setLng(pickedLng.toFixed(6));
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 text-xs text-black/70 sm:grid-cols-2">
                  <div className="border border-black/15 bg-black/[0.03] px-3 py-2">
                    <span className="font-semibold uppercase tracking-wide">
                      Vĩ độ
                    </span>
                    <div className="mt-1 font-mono text-sm text-black">
                      {lat || "Chưa chọn"}
                    </div>
                  </div>
                  <div className="border border-black/15 bg-black/[0.03] px-3 py-2">
                    <span className="font-semibold uppercase tracking-wide">
                      Kinh độ
                    </span>
                    <div className="mt-1 font-mono text-sm text-black">
                      {lng || "Chưa chọn"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={EDITORIAL_CARD}>
              <CardContent className="space-y-4 pt-5">
                <p className={SECTION_TITLE}>
                  <Users size={16} /> Số người cần hỗ trợ
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <PeopleCountInput
                    label="Người lớn"
                    value={peopleCount.adult}
                    min={0}
                    onChange={(value) =>
                      setPeopleCount((current) => ({
                        ...current,
                        adult: value,
                      }))
                    }
                  />
                  <PeopleCountInput
                    label="Trẻ em"
                    value={peopleCount.child}
                    min={0}
                    onChange={(value) =>
                      setPeopleCount((current) => ({
                        ...current,
                        child: value,
                      }))
                    }
                  />
                  <PeopleCountInput
                    label="Người già"
                    value={peopleCount.elderly}
                    min={0}
                    onChange={(value) =>
                      setPeopleCount((current) => ({
                        ...current,
                        elderly: value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <SummaryMiniCard label="Tổng" value={String(totalPeople)} />
                  <SummaryMiniCard
                    label="Người lớn"
                    value={String(peopleCount.adult)}
                  />
                  <SummaryMiniCard
                    label="Trẻ em"
                    value={String(peopleCount.child)}
                  />
                  <SummaryMiniCard
                    label="Người già"
                    value={String(peopleCount.elderly)}
                  />
                </div>
              </CardContent>
            </Card>

            {sosType && isRescueSOSType(sosType) && (
              <Card className={EDITORIAL_CARD}>
                <CardContent className="space-y-4 pt-5">
                  <p className={SECTION_TITLE}>
                    <FirstAid size={16} /> Chi tiết cứu hộ
                  </p>

                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-black uppercase tracking-wide text-black">
                        Ai bị thương?
                      </div>
                      <div className="mt-1 text-xs text-black/65">
                        Chọn người bị thương, sau đó nhập tình trạng y tế cho
                        từng người.
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {sharedPeople.map((person) => {
                        const selected = rescue.injuredPersonIds.includes(
                          person.id,
                        );
                        const issues =
                          rescue.medicalInfoByPerson[person.id]
                            ?.medicalIssues ?? [];

                        return (
                          <PersonSelectionCard
                            key={person.id}
                            person={person}
                            selected={selected}
                            accentClass="border-red-500 bg-red-50"
                            badge={
                              issues.length ? `${issues.length} vấn đề` : null
                            }
                            detail={
                              issues.length
                                ? issues
                                    .slice(0, 2)
                                    .map((issue) => getMedicalIssueLabel(issue))
                                    .join(", ")
                                : "Nhập tình trạng y tế"
                            }
                            onToggle={() => toggleInjuredPerson(person.id)}
                            onEdit={() =>
                              setActiveEditor({
                                mode: "medical",
                                personId: person.id,
                              })
                            }
                          />
                        );
                      })}
                    </div>
                    {rescue.injuredPersonIds.length > 0 &&
                      rescue.injuredPersonIds.length < sharedPeople.length && (
                        <label className="flex items-center gap-2 text-sm font-medium">
                          <Checkbox
                            checked={rescue.othersAreStable}
                            onCheckedChange={(checked) =>
                              setRescue((current) => ({
                                ...current,
                                othersAreStable: checked === true,
                              }))
                            }
                          />
                          Những người còn lại ổn định
                        </label>
                      )}
                  </div>

                  <div className="space-y-3 border-t border-black/10 pt-4">
                    <div>
                      <div className="text-sm font-black uppercase tracking-wide text-black">
                        Tình trạng hiện tại
                      </div>
                      <div className="mt-1 text-xs text-black/65">
                        Chọn tình huống gần nhất với hiện trạng thực tế.
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {RESCUE_SITUATION_OPTIONS.map((option) => (
                        <ChoiceButton
                          key={option.value}
                          label={option.label}
                          selected={rescue.situation === option.value}
                          onClick={() =>
                            setRescue((current) => ({
                              ...current,
                              situation: option.value,
                            }))
                          }
                        />
                      ))}
                    </div>
                    {rescue.situation === "OTHER" && (
                      <Input
                        value={rescue.otherSituationDescription}
                        onChange={(event) =>
                          setRescue((current) => ({
                            ...current,
                            otherSituationDescription: event.target.value,
                          }))
                        }
                        placeholder="Mô tả tình trạng khác..."
                        className={EDITORIAL_INPUT}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {sosType && isReliefSOSType(sosType) && (
              <Card className={EDITORIAL_CARD}>
                <CardContent className="space-y-4 pt-5">
                  <p className={SECTION_TITLE}>
                    <Package size={16} /> Chi tiết cứu trợ
                  </p>

                  <div className="space-y-3">
                    <div className="text-sm font-black uppercase tracking-wide text-black">
                      Nhu yếu phẩm cần thiết
                    </div>
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                      {SUPPLY_OPTIONS.map((option) => (
                        <ChoiceButton
                          key={option.value}
                          label={option.label}
                          selected={relief.supplies.includes(option.value)}
                          onClick={() => toggleSupply(option.value)}
                        />
                      ))}
                    </div>
                  </div>

                  {relief.supplies.includes("WATER") && (
                    <FollowUpCard icon="💧" title="Nước uống" accent="blue">
                      <RadioChoiceGroup
                        title={`Lượng nước uống hiện tại có thể duy trì thêm bao lâu với ${totalPeople} người?`}
                        options={WATER_DURATION_OPTIONS}
                        value={relief.waterDuration}
                        onChange={(value) =>
                          setRelief((current) => ({
                            ...current,
                            waterDuration: value,
                          }))
                        }
                      />
                      <RadioChoiceGroup
                        title="Bạn còn khoảng bao nhiêu nước uống?"
                        options={WATER_REMAINING_OPTIONS}
                        value={relief.waterRemaining}
                        onChange={(value) =>
                          setRelief((current) => ({
                            ...current,
                            waterRemaining: value,
                          }))
                        }
                      />
                    </FollowUpCard>
                  )}

                  {relief.supplies.includes("FOOD") && (
                    <FollowUpCard icon="🍚" title="Thực phẩm" accent="orange">
                      <RadioChoiceGroup
                        title={`Lượng thực phẩm hiện tại có thể duy trì thêm bao lâu với ${totalPeople} người?`}
                        options={FOOD_DURATION_OPTIONS}
                        value={relief.foodDuration}
                        onChange={(value) =>
                          setRelief((current) => ({
                            ...current,
                            foodDuration: value,
                          }))
                        }
                      />

                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-black uppercase tracking-wide text-black">
                            Ai cần chế độ ăn đặc biệt?
                          </div>
                          <div className="mt-1 text-xs text-black/65">
                            Chọn người rồi nhập tên và mô tả chế độ ăn của họ.
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {sharedPeople.map((person) => (
                            <PersonSelectionCard
                              key={person.id}
                              person={person}
                              selected={relief.specialDietPersonIds.includes(
                                person.id,
                              )}
                              accentClass="border-orange-400 bg-orange-50"
                              badge={
                                relief.specialDietInfoByPerson[
                                  person.id
                                ]?.dietDescription?.trim()
                                  ? "Đã mô tả"
                                  : null
                              }
                              detail={
                                relief.specialDietInfoByPerson[
                                  person.id
                                ]?.dietDescription?.trim() ||
                                "Nhập mô tả chế độ ăn đặc biệt"
                              }
                              onToggle={() =>
                                toggleSpecialDietPerson(person.id)
                              }
                              onEdit={() =>
                                setActiveEditor({
                                  mode: "specialDiet",
                                  personId: person.id,
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </FollowUpCard>
                  )}

                  {relief.supplies.includes("MEDICINE") && (
                    <FollowUpCard icon="🏥" title="Y tế" accent="red">
                      <div className="space-y-2">
                        <div className="text-sm font-black uppercase tracking-wide text-black">
                          Loại hỗ trợ y tế
                        </div>
                        <div className="space-y-2">
                          {MEDICAL_SUPPORT_OPTIONS.map((option) => {
                            const checked = relief.medicalNeeds.includes(
                              option.value,
                            );
                            return (
                              <label
                                key={option.value}
                                className="flex items-start gap-3 border border-black/10 px-3 py-3"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(nextChecked) =>
                                    setRelief((current) => ({
                                      ...current,
                                      medicalNeeds:
                                        nextChecked === true
                                          ? Array.from(
                                              new Set([
                                                ...current.medicalNeeds,
                                                option.value,
                                              ]),
                                            )
                                          : current.medicalNeeds.filter(
                                              (item) => item !== option.value,
                                            ),
                                    }))
                                  }
                                />
                                <span className="text-sm leading-snug">
                                  {option.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <Textarea
                          value={relief.medicalDescription}
                          onChange={(event) =>
                            setRelief((current) => ({
                              ...current,
                              medicalDescription: event.target.value,
                            }))
                          }
                          placeholder="Mô tả rõ hơn về tình trạng y tế..."
                          rows={3}
                          className={EDITORIAL_INPUT}
                        />
                      </div>
                    </FollowUpCard>
                  )}

                  {relief.supplies.includes("BLANKET") && (
                    <FollowUpCard icon="🛏️" title="Chăn mền" accent="purple">
                      <RadioChoiceGroup
                        title="Chăn mền của bạn còn đủ không?"
                        options={[
                          { value: "ENOUGH", label: "Có" },
                          { value: "NOT_ENOUGH", label: "Không" },
                        ]}
                        value={
                          relief.areBlanketsEnough === undefined
                            ? undefined
                            : relief.areBlanketsEnough
                              ? "ENOUGH"
                              : "NOT_ENOUGH"
                        }
                        onChange={(value) =>
                          setRelief((current) => ({
                            ...current,
                            areBlanketsEnough: value === "ENOUGH",
                            blanketRequestCount:
                              value === "NOT_ENOUGH"
                                ? (current.blanketRequestCount ?? 1)
                                : undefined,
                          }))
                        }
                      />

                      {relief.areBlanketsEnough === false && (
                        <div className="space-y-2">
                          <div className="text-sm font-black uppercase tracking-wide text-black">
                            Số lượng chăn mền cần thêm
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                setRelief((current) => ({
                                  ...current,
                                  blanketRequestCount: Math.max(
                                    1,
                                    (current.blanketRequestCount ?? 1) - 1,
                                  ),
                                }))
                              }
                              className="rounded-none border-black hover:bg-black hover:text-white"
                            >
                              -
                            </Button>
                            <div className="min-w-16 border border-black/20 px-4 py-2 text-center text-xl font-black">
                              {relief.blanketRequestCount ?? 1}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                setRelief((current) => ({
                                  ...current,
                                  blanketRequestCount: Math.min(
                                    Math.max(1, totalPeople),
                                    (current.blanketRequestCount ?? 1) + 1,
                                  ),
                                }))
                              }
                              className="rounded-none border-black hover:bg-black hover:text-white"
                            >
                              +
                            </Button>
                          </div>
                          <div className="text-xs text-black/65">
                            Tối đa {Math.max(1, totalPeople)} chăn mền theo số
                            người cần hỗ trợ.
                          </div>
                        </div>
                      )}
                    </FollowUpCard>
                  )}

                  {relief.supplies.includes("CLOTHES") && (
                    <FollowUpCard icon="👕" title="Quần áo" accent="teal">
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-black uppercase tracking-wide text-black">
                            Ai cần quần áo?
                          </div>
                          <div className="mt-1 text-xs text-black/65">
                            Chọn người rồi nhập tên và giới tính của họ.
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {sharedPeople.map((person) => (
                            <PersonSelectionCard
                              key={person.id}
                              person={person}
                              selected={relief.clothingPersonIds.includes(
                                person.id,
                              )}
                              accentClass="border-teal-400 bg-teal-50"
                              badge={getClothingGenderLabel(
                                relief.clothingInfoByPerson[person.id]?.gender,
                              )}
                              detail={
                                relief.clothingInfoByPerson[person.id]?.gender
                                  ? `Giới tính: ${getClothingGenderLabel(
                                      relief.clothingInfoByPerson[person.id]
                                        ?.gender,
                                    )}`
                                  : "Nhập tên và giới tính người cần quần áo"
                              }
                              onToggle={() => toggleClothingPerson(person.id)}
                              onEdit={() =>
                                setActiveEditor({
                                  mode: "clothing",
                                  personId: person.id,
                                })
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </FollowUpCard>
                  )}

                  {relief.supplies.includes("OTHER") && (
                    <FollowUpCard icon="📦" title="Khác" accent="gray">
                      <Textarea
                        value={relief.otherSupplyDescription}
                        onChange={(event) =>
                          setRelief((current) => ({
                            ...current,
                            otherSupplyDescription: event.target.value,
                          }))
                        }
                        placeholder="Mô tả nhu yếu phẩm khác..."
                        rows={3}
                        className={EDITORIAL_INPUT}
                      />
                    </FollowUpCard>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className={EDITORIAL_CARD}>
              <CardContent className="space-y-3 pt-5">
                <p className={SECTION_TITLE}>
                  <PaperPlaneTilt size={16} /> Ghi chú thêm
                </p>
                <Textarea
                  value={additionalDescription}
                  onChange={(event) =>
                    setAdditionalDescription(event.target.value)
                  }
                  placeholder="Thông tin bổ sung từ cuộc gọi / điều phối viên..."
                  rows={4}
                  className={EDITORIAL_INPUT}
                />
              </CardContent>
            </Card>
          </section>

          <aside
            className={cn(
              "space-y-4",
              isDialog
                ? "lg:col-span-4 lg:sticky lg:top-6 lg:self-start lg:pl-4"
                : "xl:col-span-4 xl:sticky xl:top-20 xl:self-start xl:pl-4",
            )}
          >
            <Card className={EDITORIAL_CARD}>
              <CardContent className="space-y-4 pt-5">
                <p className={SECTION_TITLE}>
                  <ShieldWarning size={16} /> Tổng quan
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <SummaryMiniCard
                    label="Loại SOS"
                    value={sosType ? getSosTypeLabel(sosType) : "Chưa chọn"}
                    className="col-span-2"
                  />
                  <SummaryMiniCard
                    label="Tổng người"
                    value={String(totalPeople)}
                  />
                  <SummaryMiniCard
                    label="Người lớn"
                    value={String(peopleCount.adult)}
                  />
                  <SummaryMiniCard
                    label="Trẻ em"
                    value={String(peopleCount.child)}
                  />
                  <SummaryMiniCard
                    label="Người già"
                    value={String(peopleCount.elderly)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-black uppercase tracking-wide text-black/75">
                    Nhu yếu phẩm đã chọn
                  </div>
                  {relief.supplies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {relief.supplies.map((supply) => (
                        <Badge
                          key={supply}
                          variant="outline"
                          className="rounded-none border-black px-2 py-1 text-[11px]"
                        >
                          {getSupplyLabel(supply)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-black/55">Chưa chọn.</div>
                  )}
                </div>

                <div className="space-y-2 border-t border-black/10 pt-4">
                  <div className="text-xs font-black uppercase tracking-wide text-black/75">
                    Kiểm tra trước khi gửi
                  </div>
                  {validationWarnings.length > 0 ? (
                    <ul className="space-y-2 text-sm text-black/70">
                      {validationWarnings.map((warning) => (
                        <li
                          key={warning}
                          className="border border-amber-300 bg-amber-50 px-3 py-2"
                        >
                          {warning}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      Cấu trúc SOS đã đủ để gửi.
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-black/10 pt-4">
                  <div className="text-xs font-black uppercase tracking-wide text-black/75">
                    Preview tin nhắn SOS
                  </div>
                  <Textarea
                    value={generatedMessage}
                    readOnly
                    rows={10}
                    className={cn(
                      EDITORIAL_INPUT,
                      "bg-black/[0.03] font-mono text-[12px] leading-relaxed",
                    )}
                    placeholder="Chọn loại SOS và nhập dữ liệu để xem preview..."
                  />
                </div>

                {isDialog && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isPending}
                    className="rounded-none border-black hover:bg-black hover:text-white"
                  >
                    Đóng
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>

        {isDialog ? (
          <div className="mt-5 flex items-center justify-between gap-3 border-t-2 border-black pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
              className="rounded-none border-black hover:bg-black hover:text-white"
            >
              Huỷ bỏ
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="gap-2 rounded-none border-2 border-[#FF5722] bg-[#FF5722] text-white hover:bg-[#e64a19]"
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
        ) : (
          <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-black bg-white/95 backdrop-blur-sm">
            <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isPending}
                className="rounded-none border-black hover:bg-black hover:text-white"
              >
                Huỷ bỏ
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="gap-2 rounded-none border-2 border-[#FF5722] bg-[#FF5722] text-white hover:bg-[#e64a19]"
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
        )}
      </form>

      <Dialog
        open={!!activeEditor}
        onOpenChange={(open) => !open && setActiveEditor(null)}
      >
        <DialogContent className="max-w-3xl rounded-none border-2 border-black p-0">
          {selectedPerson && activeEditor?.mode === "medical" && (
            <MedicalEditorDialog
              key={`${selectedPerson.id}-${activeEditor.mode}`}
              person={selectedPerson}
              initialInfo={rescue.medicalInfoByPerson[selectedPerson.id]}
              onCancel={() => setActiveEditor(null)}
              onSave={(payload) => {
                updatePersonName(selectedPerson.id, payload.name);
                setRescue((current) => ({
                  ...current,
                  injuredPersonIds: Array.from(
                    new Set([...current.injuredPersonIds, selectedPerson.id]),
                  ),
                  medicalInfoByPerson: {
                    ...current.medicalInfoByPerson,
                    [selectedPerson.id]: {
                      medicalIssues: payload.medicalIssues,
                      otherDescription: payload.otherDescription,
                    },
                  },
                }));
                setActiveEditor(null);
              }}
            />
          )}

          {selectedPerson && activeEditor?.mode === "specialDiet" && (
            <SpecialDietEditorDialog
              key={`${selectedPerson.id}-${activeEditor.mode}`}
              person={selectedPerson}
              initialInfo={relief.specialDietInfoByPerson[selectedPerson.id]}
              onCancel={() => setActiveEditor(null)}
              onSave={(payload) => {
                updatePersonName(selectedPerson.id, payload.name);
                setRelief((current) => ({
                  ...current,
                  specialDietPersonIds: Array.from(
                    new Set([
                      ...current.specialDietPersonIds,
                      selectedPerson.id,
                    ]),
                  ),
                  specialDietInfoByPerson: {
                    ...current.specialDietInfoByPerson,
                    [selectedPerson.id]: {
                      dietDescription: payload.dietDescription,
                    },
                  },
                }));
                setActiveEditor(null);
              }}
            />
          )}

          {selectedPerson && activeEditor?.mode === "clothing" && (
            <ClothingEditorDialog
              key={`${selectedPerson.id}-${activeEditor.mode}`}
              person={selectedPerson}
              initialInfo={relief.clothingInfoByPerson[selectedPerson.id]}
              onCancel={() => setActiveEditor(null)}
              onSave={(payload) => {
                updatePersonName(selectedPerson.id, payload.name);
                setRelief((current) => ({
                  ...current,
                  clothingPersonIds: Array.from(
                    new Set([...current.clothingPersonIds, selectedPerson.id]),
                  ),
                  clothingInfoByPerson: {
                    ...current.clothingInfoByPerson,
                    [selectedPerson.id]: {
                      gender: payload.gender,
                    },
                  },
                }));
                setActiveEditor(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PeopleCountInput({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-bold uppercase tracking-wide">
        {label}
      </Label>
      <Input
        type="number"
        min={min}
        value={value}
        onChange={(event) =>
          onChange(Math.max(min, Number(event.target.value) || 0))
        }
        className={EDITORIAL_INPUT}
      />
    </div>
  );
}

function SummaryMiniCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-black/15 bg-black/[0.03] px-3 py-2",
        className,
      )}
    >
      <div className="text-[11px] font-black uppercase tracking-wide text-black/60">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-black">{value}</div>
    </div>
  );
}

function ChoiceButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-2 px-3 py-2 text-left text-sm font-bold tracking-tight transition-colors",
        selected
          ? "border-[#FF5722] bg-[#FF5722] text-white"
          : "border-black bg-white hover:bg-black hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

function PersonSelectionCard({
  person,
  selected,
  accentClass,
  badge,
  detail,
  onToggle,
  onEdit,
}: {
  person: SharedPerson;
  selected: boolean;
  accentClass: string;
  badge: string | null;
  detail: string;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={cn(
        "border-2 px-3 py-3 transition-colors",
        selected ? accentClass : "border-black/10 bg-white",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={() => onToggle()} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-black text-black">
                <span>{getPersonIcon(person.type)}</span>
                <span className="truncate">{getPersonDisplayName(person)}</span>
              </div>
              <div className="mt-1 text-xs text-black/60">
                {getPersonTypeLabel(person.type)}
              </div>
            </div>
            {badge ? (
              <Badge
                variant="outline"
                className="rounded-none border-black/20 bg-white/80 px-2 py-0.5 text-[10px]"
              >
                {badge}
              </Badge>
            ) : null}
          </div>

          <div className="mt-3 text-sm leading-snug text-black/70">
            {detail}
          </div>

          {selected && (
            <Button
              type="button"
              variant="outline"
              onClick={onEdit}
              className="mt-3 rounded-none border-black hover:bg-black hover:text-white"
            >
              <PencilSimple size={14} />
              Chỉnh sửa
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FollowUpCard({
  icon,
  title,
  accent,
  children,
}: {
  icon: string;
  title: string;
  accent: "blue" | "orange" | "red" | "purple" | "teal" | "gray";
  children: React.ReactNode;
}) {
  const accentClass: Record<typeof accent, string> = {
    blue: "border-blue-300 bg-blue-50/50",
    orange: "border-orange-300 bg-orange-50/50",
    red: "border-red-300 bg-red-50/50",
    purple: "border-purple-300 bg-purple-50/50",
    teal: "border-teal-300 bg-teal-50/50",
    gray: "border-black/20 bg-black/[0.03]",
  };

  return (
    <div className={cn("space-y-4 border px-4 py-4", accentClass[accent])}>
      <div className="text-sm font-black uppercase tracking-wide text-black">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

function RadioChoiceGroup<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Array<{ value: T; label: string }>;
  value?: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-black uppercase tracking-wide text-black">
        {title}
      </div>
      <div className="space-y-2">
        {options.map((option) => (
          <ChoiceButton
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}

function MedicalEditorDialog({
  person,
  initialInfo,
  onCancel,
  onSave,
}: {
  person: SharedPerson;
  initialInfo?: RescueMedicalInfoState;
  onCancel: () => void;
  onSave: (payload: {
    name: string;
    medicalIssues: MedicalIssueType[];
    otherDescription: string;
  }) => void;
}) {
  const [name, setName] = useState(person.customName || "");
  const [medicalIssues, setMedicalIssues] = useState<MedicalIssueType[]>(
    initialInfo?.medicalIssues ?? [],
  );
  const [otherDescription, setOtherDescription] = useState(
    initialInfo?.otherDescription ?? "",
  );

  const groupedIssues = groupedMedicalIssuesForPersonType(person.type);

  return (
    <>
      <DialogHeader className="border-b-2 border-black px-6 py-5">
        <DialogTitle className="text-xl font-black uppercase tracking-tight">
          Tình trạng y tế
        </DialogTitle>
        <DialogDescription>
          Nhập tên và chọn tình trạng y tế cho {getPersonDisplayName(person)}.
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wide">
            Tên
          </Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={getPersonDisplayName(person)}
            className={EDITORIAL_INPUT}
          />
        </div>

        {groupedIssues.map((group) => (
          <div key={group.category} className="space-y-3">
            <div className="text-sm font-black uppercase tracking-wide text-black">
              {group.category}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.issues.map((issue) => {
                const selected = medicalIssues.includes(issue);
                return (
                  <button
                    key={issue}
                    type="button"
                    onClick={() =>
                      setMedicalIssues((current) =>
                        selected
                          ? current.filter((item) => item !== issue)
                          : [...current, issue],
                      )
                    }
                    className={cn(
                      "border-2 px-3 py-3 text-left text-sm transition-colors",
                      selected
                        ? "border-[#FF5722] bg-[#FF5722] text-white"
                        : "border-black/20 bg-white hover:border-black",
                    )}
                  >
                    {getMedicalIssueLabel(issue)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {medicalIssues.includes("OTHER") && (
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wide">
              Mô tả thêm
            </Label>
            <Textarea
              value={otherDescription}
              onChange={(event) => setOtherDescription(event.target.value)}
              placeholder="Mô tả vấn đề khác..."
              rows={3}
              className={EDITORIAL_INPUT}
            />
          </div>
        )}
      </div>
      <DialogFooter className="border-t-2 border-black px-6 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-none border-black hover:bg-black hover:text-white"
        >
          Huỷ
        </Button>
        <Button
          type="button"
          onClick={() =>
            onSave({
              name,
              medicalIssues,
              otherDescription,
            })
          }
          className="rounded-none border-2 border-[#FF5722] bg-[#FF5722] text-white hover:bg-[#e64a19]"
        >
          Lưu chi tiết
        </Button>
      </DialogFooter>
    </>
  );
}

function SpecialDietEditorDialog({
  person,
  initialInfo,
  onCancel,
  onSave,
}: {
  person: SharedPerson;
  initialInfo?: SpecialDietInfoState;
  onCancel: () => void;
  onSave: (payload: { name: string; dietDescription: string }) => void;
}) {
  const [name, setName] = useState(person.customName || "");
  const [dietDescription, setDietDescription] = useState(
    initialInfo?.dietDescription ?? "",
  );

  return (
    <>
      <DialogHeader className="border-b-2 border-black px-6 py-5">
        <DialogTitle className="text-xl font-black uppercase tracking-tight">
          Chế độ ăn đặc biệt
        </DialogTitle>
        <DialogDescription>
          Nhập tên và mô tả chế độ ăn của {getPersonDisplayName(person)}.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-5 px-6 py-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wide">
            Tên
          </Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={getPersonDisplayName(person)}
            className={EDITORIAL_INPUT}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wide">
            Mô tả chế độ ăn đặc biệt
          </Label>
          <Textarea
            value={dietDescription}
            onChange={(event) => setDietDescription(event.target.value)}
            placeholder="Ví dụ: ăn lỏng, cần sữa, dị ứng hải sản..."
            rows={4}
            className={EDITORIAL_INPUT}
          />
        </div>
      </div>
      <DialogFooter className="border-t-2 border-black px-6 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-none border-black hover:bg-black hover:text-white"
        >
          Huỷ
        </Button>
        <Button
          type="button"
          onClick={() => onSave({ name, dietDescription })}
          className="rounded-none border-2 border-[#FF5722] bg-[#FF5722] text-white hover:bg-[#e64a19]"
        >
          Lưu chi tiết
        </Button>
      </DialogFooter>
    </>
  );
}

function ClothingEditorDialog({
  person,
  initialInfo,
  onCancel,
  onSave,
}: {
  person: SharedPerson;
  initialInfo?: ClothingInfoState;
  onCancel: () => void;
  onSave: (payload: { name: string; gender?: ClothingGenderType }) => void;
}) {
  const [name, setName] = useState(person.customName || "");
  const [gender, setGender] = useState<ClothingGenderType | undefined>(
    initialInfo?.gender,
  );

  return (
    <>
      <DialogHeader className="border-b-2 border-black px-6 py-5">
        <DialogTitle className="text-xl font-black uppercase tracking-tight">
          Thông tin quần áo
        </DialogTitle>
        <DialogDescription>
          Nhập tên và giới tính cho {getPersonDisplayName(person)}.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-5 px-6 py-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wide">
            Tên
          </Label>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={getPersonDisplayName(person)}
            className={EDITORIAL_INPUT}
          />
        </div>
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-wide">
            Giới tính
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {CLOTHING_GENDER_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                label={option.label}
                selected={gender === option.value}
                onClick={() => setGender(option.value)}
              />
            ))}
          </div>
        </div>
      </div>
      <DialogFooter className="border-t-2 border-black px-6 py-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-none border-black hover:bg-black hover:text-white"
        >
          Huỷ
        </Button>
        <Button
          type="button"
          onClick={() => onSave({ name, gender })}
          className="rounded-none border-2 border-[#FF5722] bg-[#FF5722] text-white hover:bg-[#e64a19]"
        >
          Lưu chi tiết
        </Button>
      </DialogFooter>
    </>
  );
}

function clearReliefFollowUp(
  relief: ReliefFormState,
  supply: SupplyType,
): ReliefFormState {
  switch (supply) {
    case "WATER":
      return { ...relief, waterDuration: undefined, waterRemaining: undefined };
    case "FOOD":
      return {
        ...relief,
        foodDuration: undefined,
        specialDietPersonIds: [],
        specialDietInfoByPerson: {},
      };
    case "MEDICINE":
      return {
        ...relief,
        medicalNeeds: [],
        medicalDescription: "",
      };
    case "BLANKET":
      return {
        ...relief,
        areBlanketsEnough: undefined,
        blanketRequestCount: undefined,
      };
    case "CLOTHES":
      return {
        ...relief,
        clothingPersonIds: [],
        clothingInfoByPerson: {},
      };
    case "OTHER":
      return {
        ...relief,
        otherSupplyDescription: "",
      };
    default:
      return relief;
  }
}

function toCoordinateString(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "";
  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? "" : numericValue.toFixed(6);
}
