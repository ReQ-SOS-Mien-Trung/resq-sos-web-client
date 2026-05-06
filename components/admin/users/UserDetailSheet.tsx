"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  useAdminUserById,
  useUpdateAdminUser,
  useDocumentFileTypes,
  useAbilities,
  useUpdateUserAbilities,
  useCreateRescuerDocuments,
  useUpdateRescuerDocuments,
  ADMIN_USERS_QUERY_KEY,
} from "@/services/user/hooks";
import { useAuthStore } from "@/stores/auth.store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  uploadImageToCloudinary,
  uploadRawToCloudinary,
} from "@/utils/uploadFile";
import { ROLES, ROLE_NAMES } from "@/lib/roles";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  EnvelopeSimple,
  PencilSimple,
  X,
  CaretDown,
  UploadSimple,
  Trash,
  Image as ImageIcon,
  FloppyDisk,
  FileText,
  ArrowSquareOut,
  ArrowsInSimple,
  ArrowsOutSimple,
  Eye,
} from "@phosphor-icons/react";

interface UserDetailSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "view" | "edit";
}

type DocumentEditRow = {
  localId: string;
  fileTypeId: string;
  fileUrl: string;
  fileName: string;
  file: File | null;
};

type DocumentPreview = {
  src: string;
  name: string;
  objectUrl?: string;
};

const ROLE_STYLE: Record<number, string> = {
  [ROLES.ADMIN]:
    "bg-red-500/10 text-red-700 text-[13px] tracking-tighter font-medium",
  [ROLES.COORDINATOR]:
    "bg-yellow-500/10 text-yellow-700 text-[13px] tracking-tighter font-medium",
  [ROLES.RESCUER]:
    "bg-emerald-500/10 text-emerald-700 text-[13px] tracking-tighter font-medium",
  [ROLES.MANAGER]:
    "bg-orange-500/10 text-orange-700 text-[13px] tracking-tighter font-medium",
  [ROLES.VICTIM]:
    "bg-blue-500/10 text-blue-700 text-[13px] tracking-tighter font-medium",
};

const ROLE_MAP: Record<number, { label: string; className: string }> =
  Object.fromEntries(
    Object.entries(ROLE_NAMES).map(([id, label]) => [
      Number(id),
      {
        label,
        className:
          ROLE_STYLE[Number(id)] ??
          "bg-blue-500/10 text-blue-700 text-[13px] tracking-tighter font-medium",
      },
    ]),
  );

const DEFAULT_ROLE = {
  label: "Công dân",
  className:
    "bg-blue-500/10 text-blue-700 text-[13px] tracking-tighter font-medium",
};

const ABILITY_CATEGORIES = [
  {
    code: "RESCUE",
    label: "Cứu hộ",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    code: "MEDICAL",
    label: "Y tế",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    code: "TRANSPORTATION",
    label: "Vận chuyển",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    code: "EXPERIENCE",
    label: "Kinh nghiệm",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
  },
] as const;

const PROFESSIONAL_MEDICAL_ABILITY_CODES = [
  "MEDICAL_STAFF",
  "NURSE",
  "DOCTOR",
  "PREHOSPITAL_EMERGENCY",
] as const;

const PROFESSIONAL_MEDICAL_ABILITY_CODE_SET = new Set<string>(
  PROFESSIONAL_MEDICAL_ABILITY_CODES,
);

const SKILL_CONFLICT_RULES: { dominant: number; implies: number[] }[] = [
  { dominant: 3, implies: [1, 2] },
  { dominant: 2, implies: [1] },
  { dominant: 6, implies: [1] },
  { dominant: 5, implies: [4] },
  {
    dominant: 34,
    implies: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
  },
  {
    dominant: 35,
    implies: [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
  },
  { dominant: 33, implies: [17, 18, 19, 20, 21, 22, 23, 27, 31] },
  { dominant: 32, implies: [17, 18, 19, 20, 21, 22] },
  { dominant: 37, implies: [36] },
  { dominant: 39, implies: [38] },
  { dominant: 47, implies: [46] },
];

const VEHICLE_SKILL_IDS = [36, 37, 38, 39, 40, 41, 42] as const;
const VEHICLE_CONDITION_SKILL_IDS = [43, 44] as const;

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const createEmptyDocumentRow = (): DocumentEditRow => ({
  localId:
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
  fileTypeId: "",
  fileUrl: "",
  fileName: "",
  file: null,
});

const getFileNameFromUrl = (url: string) => {
  if (!url) return "";

  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split("/").pop() ?? "");
  } catch {
    return url.split("/").pop() ?? "";
  }
};

const isImageUrl = (url: string) => /\.(avif|gif|jpe?g|png|webp)$/i.test(url);

const canPreviewDocumentRow = (row: DocumentEditRow) => {
  if (row.file) return row.file.type.startsWith("image/");
  return isImageUrl(row.fileUrl);
};

const buildSelectedAbilityLevels = (
  abilities?: { abilityId: number; level: number }[],
) =>
  Object.fromEntries(
    (abilities ?? []).map((ability) => [ability.abilityId, ability.level || 1]),
  ) as Record<number, number>;

const uploadDocumentToCloudinary = (file: File) => {
  if (file.type.startsWith("image/")) {
    return uploadImageToCloudinary(
      file,
      "resq/rescuer-documents",
      "resq/rescuer-documents",
    );
  }

  return uploadRawToCloudinary(file, "resq/rescuer-documents");
};

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
}

const FieldRow = ({ label, value }: FieldRowProps) => (
  <div className="grid grid-cols-[130px_1fr] gap-3 items-start py-2.5 border-b border-border/25 last:border-0">
    <span className="text-sm tracking-tighter text-muted-foreground leading-5">
      {label}
    </span>
    <span className="text-sm tracking-tighter text-foreground leading-5">
      {value ?? "—"}
    </span>
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[14px] font-bold text-primary tracking-tight mb-3">
    {children}
  </p>
);

const UserDetailSheet = ({
  userId,
  open,
  onOpenChange,
  initialMode = "view",
}: UserDetailSheetProps) => {
  const { data: user, isLoading } = useAdminUserById(userId!, {
    enabled: !!userId,
    staleTime: 30_000,
  });

  // ── edit mode state ──
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: documentFileTypesData, isLoading: isLoadingDocumentFileTypes } =
    useDocumentFileTypes({
      enabled: open && isEditing && user?.roleId === ROLES.RESCUER,
    });
  const { data: abilitiesData, isLoading: isLoadingAbilities } = useAbilities({
    enabled: open && isEditing && user?.roleId === ROLES.RESCUER,
  });
  const updateMutation = useUpdateAdminUser();
  const updateAbilitiesMutation = useUpdateUserAbilities();
  const createDocumentsMutation = useCreateRescuerDocuments();
  const updateDocumentsMutation = useUpdateRescuerDocuments();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuthStore();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    email: "",
    rescuerType: "",
    address: "",
    ward: "",
    province: "",
  });

  // avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentRows, setDocumentRows] = useState<DocumentEditRow[]>([]);
  const [selectedAbilityLevels, setSelectedAbilityLevels] = useState<
    Record<number, number>
  >({});
  const [documentPreview, setDocumentPreview] =
    useState<DocumentPreview | null>(null);
  const [replacingRowIds, setReplacingRowIds] = useState<Set<string>>(
    new Set(),
  );

  // province / ward
  const [provinces, setProvinces] = useState<{ code: number; name: string }[]>(
    [],
  );
  const [wards, setWards] = useState<{ code: number; name: string }[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<
    number | null
  >(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [wardOpen, setWardOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [wardSearch, setWardSearch] = useState("");
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const wardDropdownRef = useRef<HTMLDivElement>(null);

  const closeDocumentPreview = () => {
    setDocumentPreview((current) => {
      if (current?.objectUrl) {
        URL.revokeObjectURL(current.objectUrl);
      }

      return null;
    });
  };

  const openDocumentPreview = (row: DocumentEditRow) => {
    setDocumentPreview((current) => {
      if (current?.objectUrl) {
        URL.revokeObjectURL(current.objectUrl);
      }

      if (row.file) {
        const objectUrl = URL.createObjectURL(row.file);
        return {
          src: objectUrl,
          name: row.file.name,
          objectUrl,
        };
      }

      return {
        src: row.fileUrl,
        name: row.fileName || getFileNameFromUrl(row.fileUrl),
      };
    });
  };

  const documentFileTypes = useMemo(
    () => (documentFileTypesData?.items ?? []).filter((type) => type.isActive),
    [documentFileTypesData?.items],
  );

  const documentTypeGroups = useMemo(() => {
    const groups = new Map<
      number,
      {
        id: number;
        code: string;
        description: string;
        items: typeof documentFileTypes;
      }
    >();

    documentFileTypes.forEach((type) => {
      const category = type.documentFileTypeCategory;
      const existing = groups.get(type.documentFileTypeCategoryId);

      if (existing) {
        existing.items.push(type);
        return;
      }

      groups.set(type.documentFileTypeCategoryId, {
        id: category.id,
        code: category.code,
        description: category.description,
        items: [type],
      });
    });

    return Array.from(groups.values()).sort((a, b) => a.id - b.id);
  }, [documentFileTypes]);

  const abilities = useMemo(() => abilitiesData?.items ?? [], [abilitiesData]);

  const abilityByCode = useMemo(
    () => new Map(abilities.map((ability) => [ability.code, ability])),
    [abilities],
  );

  const professionalMedicalAbilities = useMemo(
    () =>
      PROFESSIONAL_MEDICAL_ABILITY_CODES.map((code) =>
        abilityByCode.get(code),
      ).filter((ability) => ability !== undefined),
    [abilityByCode],
  );

  const lockedAutoAbilityIds = useMemo(() => {
    const selectedIds = new Set(
      Object.keys(selectedAbilityLevels).map((abilityId) => Number(abilityId)),
    );
    const autoIds = new Set<number>();
    let didChange = true;

    while (didChange) {
      didChange = false;

      SKILL_CONFLICT_RULES.forEach((rule) => {
        if (!selectedIds.has(rule.dominant) && !autoIds.has(rule.dominant)) {
          return;
        }

        rule.implies.forEach((impliedId) => {
          if (!autoIds.has(impliedId)) {
            autoIds.add(impliedId);
            didChange = true;
          }
        });
      });
    }

    return autoIds;
  }, [selectedAbilityLevels]);

  const effectiveSelectedAbilityLevels = useMemo(() => {
    const next = { ...selectedAbilityLevels };

    lockedAutoAbilityIds.forEach((abilityId) => {
      if (next[abilityId] === undefined) {
        next[abilityId] = 1;
      }
    });

    const hasVehicleSkill = VEHICLE_SKILL_IDS.some(
      (abilityId) => next[abilityId] !== undefined,
    );

    if (!hasVehicleSkill) {
      VEHICLE_CONDITION_SKILL_IDS.forEach((abilityId) => {
        delete next[abilityId];
      });
    }

    return next;
  }, [lockedAutoAbilityIds, selectedAbilityLevels]);

  const hasVehicleSkillSelected = useMemo(
    () =>
      VEHICLE_SKILL_IDS.some(
        (abilityId) => effectiveSelectedAbilityLevels[abilityId] !== undefined,
      ),
    [effectiveSelectedAbilityLevels],
  );

  const abilityCategoryGroups = useMemo(() => {
    const groups = new Map<
      number,
      {
        id: number;
        code: string;
        description: string;
        items: typeof abilities;
      }
    >();

    abilities.forEach((ability) => {
      if (PROFESSIONAL_MEDICAL_ABILITY_CODE_SET.has(ability.code)) {
        return;
      }

      const category = ability.abilitySubgroup.abilityCategory;
      const existing = groups.get(category.id);

      if (existing) {
        existing.items.push(ability);
        return;
      }

      groups.set(category.id, {
        id: category.id,
        code: category.code,
        description: category.description,
        items: [ability],
      });
    });

    return Array.from(groups.values()).sort((a, b) => a.id - b.id);
  }, [abilities]);

  const toggleProfessionalMedicalAbility = (abilityId: number) => {
    setSelectedAbilityLevels((prev) => {
      const next = { ...prev };
      const isSelected = next[abilityId] !== undefined;

      professionalMedicalAbilities.forEach((ability) => {
        delete next[ability.id];
      });

      if (!isSelected) {
        next[abilityId] = prev[abilityId] ?? 1;
      }

      return next;
    });
  };

  const toggleAbility = (abilityId: number) => {
    setSelectedAbilityLevels((prev) => {
      if (prev[abilityId] !== undefined) {
        const next = { ...prev };
        delete next[abilityId];

        const hasRemainingVehicleSkill = VEHICLE_SKILL_IDS.some(
          (vehicleAbilityId) => next[vehicleAbilityId] !== undefined,
        );

        if (!hasRemainingVehicleSkill) {
          VEHICLE_CONDITION_SKILL_IDS.forEach((conditionAbilityId) => {
            delete next[conditionAbilityId];
          });
        }

        return next;
      }

      return { ...prev, [abilityId]: 1 };
    });
  };

  // reset edit state — delay until after sheet slide-in animation (350ms)
  useEffect(() => {
    if (user && open) {
      const timer = setTimeout(() => {
        setForm({
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          username: user.username ?? "",
          phone: user.phone ?? "",
          email: user.email ?? "",
          rescuerType: user.rescuerType ?? "",
          address: user.address ?? "",
          ward: user.ward ?? "",
          province: user.province ?? "",
        });
        setAvatarFile(null);
        setAvatarPreview(null);
        setDocumentRows(
          user.roleId === ROLES.RESCUER &&
            user.rescuerApplicationDocuments?.length
            ? user.rescuerApplicationDocuments.map((doc) => ({
                localId: String(doc.id),
                fileTypeId: String(doc.fileTypeId),
                fileUrl: doc.fileUrl,
                fileName:
                  doc.fileTypeName ??
                  doc.fileTypeCode ??
                  getFileNameFromUrl(doc.fileUrl),
                file: null,
              }))
            : [createEmptyDocumentRow()],
        );
        setSelectedAbilityLevels(
          user.roleId === ROLES.RESCUER
            ? buildSelectedAbilityLevels(user.abilities)
            : {},
        );
        setSelectedProvinceCode(null);
        setWards([]);
        setCitySearch("");
        setWardSearch("");
        setReplacingRowIds(new Set());
      }, 350);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, open]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setIsEditing(initialMode === "edit");
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setIsEditing(false);
      setIsExpanded(false);
    }
  }, [open, initialMode]);

  useEffect(
    () => () => {
      if (documentPreview?.objectUrl) {
        URL.revokeObjectURL(documentPreview.objectUrl);
      }
    },
    [documentPreview?.objectUrl],
  );

  // fetch provinces once when entering edit mode
  useEffect(() => {
    if (!isEditing || provinces.length > 0) return;
    fetch("https://provinces.open-api.vn/api/v2/")
      .then((r) => r.json())
      .then(setProvinces)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  // fetch wards when province code selected
  useEffect(() => {
    if (!selectedProvinceCode) {
      setWards([]);
      return;
    }
    fetch(
      `https://provinces.open-api.vn/api/v2/p/${selectedProvinceCode}?depth=2`,
    )
      .then((r) => r.json())
      .then((d) => setWards(d.wards || []))
      .catch(() => {});
  }, [selectedProvinceCode]);

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(e.target as Node)
      )
        setCityOpen(false);
      if (
        wardDropdownRef.current &&
        !wardDropdownRef.current.contains(e.target as Node)
      )
        setWardOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCancelEdit = () => {
    if (user) {
      setForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        username: user.username ?? "",
        phone: user.phone ?? "",
        email: user.email ?? "",
        rescuerType: user.rescuerType ?? "",
        address: user.address ?? "",
        ward: user.ward ?? "",
        province: user.province ?? "",
      });
    }
    setAvatarFile(null);
    setAvatarPreview(null);
    setDocumentRows(
      user?.roleId === ROLES.RESCUER && user.rescuerApplicationDocuments?.length
        ? user.rescuerApplicationDocuments.map((doc) => ({
            localId: String(doc.id),
            fileTypeId: String(doc.fileTypeId),
            fileUrl: doc.fileUrl,
            fileName:
              doc.fileTypeName ??
              doc.fileTypeCode ??
              getFileNameFromUrl(doc.fileUrl),
            file: null,
          }))
        : [createEmptyDocumentRow()],
    );
    setSelectedAbilityLevels(
      user?.roleId === ROLES.RESCUER
        ? buildSelectedAbilityLevels(user.abilities)
        : {},
    );
    setReplacingRowIds(new Set());
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!userId) return;

    const hasExistingDocuments =
      (user?.rescuerApplicationDocuments?.length ?? 0) > 0;
    const documentRowsWithData = documentRows.filter(
      (row) => row.fileTypeId || row.fileUrl || row.file,
    );

    const hasIncompleteDocument = documentRowsWithData.some(
      (row) => !row.fileTypeId || (!row.fileUrl && !row.file),
    );

    if (user?.roleId === ROLES.RESCUER && hasIncompleteDocument) {
      toast.error("Vui lòng chọn loại chứng chỉ và tải tệp chứng chỉ.");
      return;
    }

    try {
      setIsUploading(true);
      toast.loading("Đang cập nhật...");

      const uploadedAvatarUrl = avatarFile
        ? await uploadImageToCloudinary(avatarFile)
        : undefined;

      const updatedUser = await updateMutation.mutateAsync({
        userId,
        data: {
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          phone: form.phone,
          email: form.email || undefined,
          rescuerType:
            user?.roleId === ROLES.RESCUER
              ? form.rescuerType || undefined
              : undefined,
          address: form.address || undefined,
          ward: form.ward || undefined,
          province: form.province || undefined,
          avatarUrl: uploadedAvatarUrl ?? user?.avatarUrl ?? undefined,
          approvedBy: authUser?.userId ?? undefined,
        },
      });

      if (user?.roleId === ROLES.RESCUER && documentRowsWithData.length > 0) {
        const documents = await Promise.all(
          documentRowsWithData.map(async (row) => ({
            fileUrl: row.file
              ? await uploadDocumentToCloudinary(row.file)
              : row.fileUrl,
            fileTypeId: Number(row.fileTypeId),
          })),
        );

        if (hasExistingDocuments) {
          await updateDocumentsMutation.mutateAsync({
            userId,
            data: { documents },
          });
        } else {
          await createDocumentsMutation.mutateAsync({
            userId,
            data: { documents },
          });
        }
      }

      if (user?.roleId === ROLES.RESCUER) {
        await updateAbilitiesMutation.mutateAsync({
          userId,
          data: {
            abilities: Object.entries(effectiveSelectedAbilityLevels).map(
              ([abilityId, level]) => ({
                abilityId: Number(abilityId),
                level,
              }),
            ),
          },
        });
      }

      toast.dismiss();
      toast.success("Cập nhật thành công!");
      // Update cache trực tiếp từ response — UI cập nhật ngay, không cần chờ refetch
      queryClient.setQueryData([...ADMIN_USERS_QUERY_KEY, userId], updatedUser);
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err: any) {
      toast.dismiss();
      const msg =
        err?.response?.data?.message || err.message || "Đã xảy ra lỗi!";
      toast.error("Cập nhật thất bại: " + msg);
    } finally {
      setIsUploading(false);
    }
  };

  const role = user ? (ROLE_MAP[user.roleId] ?? DEFAULT_ROLE) : DEFAULT_ROLE;
  const fullName = user ? `${user.lastName} ${user.firstName}` : "";
  const initials = user
    ? `${user.lastName?.[0] ?? ""}${user.firstName?.[0] ?? ""}`.toUpperCase()
    : "??";

  const currentAvatarSrc = avatarPreview ?? user?.avatarUrl ?? undefined;
  const isBusy =
    isUploading ||
    updateMutation.isPending ||
    updateAbilitiesMutation.isPending ||
    createDocumentsMutation.isPending ||
    updateDocumentsMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "w-full overflow-hidden p-0 flex flex-col",
          isExpanded
            ? "sm:max-w-[calc(100vw-4rem)] lg:max-w-[960px] xl:max-w-[1120px]"
            : "sm:max-w-140",
        )}
      >
        <button
          type="button"
          aria-label={isExpanded ? "Thu nhỏ" : "Mở rộng"}
          title={isExpanded ? "Thu nhỏ" : "Mở rộng"}
          className="absolute right-10 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? (
            <ArrowsInSimple className="h-4 w-4" />
          ) : (
            <ArrowsOutSimple className="h-4 w-4" />
          )}
        </button>

        {/* ── header ── */}
        <div className="px-6 pt-10 pb-6 border-b border-border/30">
          <SheetHeader className="mb-5">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl sm:text-2xl font-black tracking-tight">
                {isEditing ? "Chỉnh sửa người dùng" : "Chi tiết người dùng"}
              </SheetTitle>
              {!isLoading && !isEditing && user?.roleId !== ROLES.VICTIM && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-sm"
                  onClick={() => setIsEditing(true)}
                >
                  <PencilSimple size={14} />
                  Chỉnh sửa
                </Button>
              )}
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-start gap-4">
              <Skeleton className="size-20 aspect-square rounded-full shrink-0" />
              <div className="space-y-2 flex-1 pt-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-5 w-20 rounded-full mt-1" />
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              {/* Avatar (editable in edit mode) */}
              <div className="relative shrink-0 group">
                <Avatar className="size-20 aspect-square border border-border/40">
                  <AvatarImage
                    src={currentAvatarSrc}
                    alt={fullName}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-sm font-medium bg-muted text-muted-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-white"
                      title="Đổi ảnh"
                    >
                      <UploadSimple size={16} />
                    </button>
                    {avatarFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                        className="text-rose-300"
                        title="Xóa ảnh mới"
                      >
                        <Trash size={14} />
                      </button>
                    )}
                  </div>
                )}
                {isEditing && !currentAvatarSrc && (
                  <div className="absolute inset-0 rounded-full bg-muted flex items-center justify-center">
                    <ImageIcon size={24} className="text-muted-foreground/40" />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setAvatarFile(e.target.files[0]);
                      setAvatarPreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                />
              </div>

              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Họ"
                        value={form.lastName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, lastName: e.target.value }))
                        }
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Tên"
                        value={form.firstName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, firstName: e.target.value }))
                        }
                        className="h-8 text-sm"
                      />
                    </div>
                    <Input
                      placeholder="Username"
                      value={form.username}
                      readOnly
                      disabled
                      className="h-8 text-sm opacity-60 cursor-not-allowed"
                    />
                    <Badge
                      className={`${role.className} text-sm tracking-tighter font-medium px-2 py-1 pointer-events-none`}
                    >
                      {role.label}
                    </Badge>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <h2 className="text-[15px] font-semibold tracking-tighter text-foreground">
                        {fullName}
                      </h2>
                      <span
                        className={`relative flex size-2.5 shrink-0`}
                        title={user?.isBanned ? "Bị cấm" : "Đang hoạt động"}
                      >
                        <span
                          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            user?.isBanned ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                        />
                        <span
                          className={`relative inline-flex rounded-full size-2.5 ${
                            user?.isBanned ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                        />
                      </span>
                    </div>
                    <p className="text-sm tracking-tighter text-muted-foreground mt-0.5">
                      @{user?.username}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge
                        className={`${role.className} text-xs tracking-tighter font-medium px-2 py-0.5`}
                      >
                        {role.label}
                      </Badge>
                      {user?.roleId === 3 && user?.rescuerType && (
                        <Badge className="bg-sky-500/10 text-sky-700 border border-sky-200/60 text-xs tracking-tighter font-medium px-2 py-0.5">
                          {user.rescuerType}
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* ── liên hệ ── */}
          <div className="px-6 pb-2 border-b border-border/30">
            <SectionLabel>THÔNG TIN LIÊN HỆ</SectionLabel>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : isEditing ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm tracking-tighter text-muted-foreground">
                    Số điện thoại
                  </label>
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                    placeholder="0912345678"
                    className="h-8 mt-1.5 text-sm tracking-tighter"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm tracking-tighter text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="example@resq.com"
                    className="h-8 mt-1.5 text-sm tracking-tighter"
                  />
                </div>
                {user?.roleId === 3 && (
                  <div className="space-y-1">
                    <label className="text-sm tracking-tighter text-muted-foreground">
                      Loại cứu hộ
                    </label>
                    <div className="flex gap-2">
                      {(["Core", "Volunteer"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setForm((p) => ({ ...p, rescuerType: t }))
                          }
                          className={`flex-1 py-1.5 mt-1.5 text-sm tracking-tighter font-medium border transition-colors ${
                            form.rescuerType === t
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          {t === "Core" ? "Core" : "Volunteer"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <FieldRow
                  label="Số điện thoại"
                  value={
                    <span className="flex items-center gap-1.5">
                      <Phone
                        size={12}
                        className="text-muted-foreground shrink-0"
                      />
                      {user?.phone}
                    </span>
                  }
                />
                <FieldRow
                  label="Email"
                  value={
                    <span className="flex items-center gap-1.5">
                      <EnvelopeSimple
                        size={12}
                        className="text-muted-foreground shrink-0"
                      />
                      {user?.email ?? "—"}
                    </span>
                  }
                />
                <FieldRow
                  label="Địa chỉ"
                  value={
                    [user?.address, user?.ward, user?.province]
                      .filter(Boolean)
                      .join(", ") || "—"
                  }
                />
              </>
            )}
          </div>

          {/* ── địa chỉ (edit only) ── */}
          {isEditing && (
            <div className="px-6 py-2 border-b border-border/30">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : isEditing ? (
                <div className="space-y-3">
                  <SectionLabel>ĐỊA CHỈ</SectionLabel>
                  <div className="space-y-1">
                    <label className="text-sm tracking-tighter text-muted-foreground">
                      Địa chỉ
                    </label>
                    <Input
                      value={form.address}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, address: e.target.value }))
                      }
                      placeholder="Số nhà, tên đường"
                      className="h-8 mt-1.5 text-sm"
                    />
                  </div>

                  {/* Province dropdown */}
                  <div className="space-y-1" ref={cityDropdownRef}>
                    <label className="text-sm tracking-tighter text-muted-foreground">
                      Tỉnh / Thành phố
                    </label>
                    <div className="relative">
                      <Input
                        value={citySearch || form.province}
                        onChange={(e) => {
                          setCitySearch(e.target.value);
                          setCityOpen(true);
                          setForm((p) => ({ ...p, province: "", ward: "" }));
                          setSelectedProvinceCode(null);
                          setWards([]);
                        }}
                        onFocus={() => {
                          setCityOpen(true);
                          setCitySearch("");
                        }}
                        readOnly={!!form.province && !cityOpen}
                        placeholder="Chọn tỉnh/thành phố"
                        className="h-8 mt-1.5 text-sm pr-7 cursor-pointer"
                      />
                      <CaretDown
                        size={13}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-transform ${cityOpen ? "rotate-180" : ""}`}
                      />
                      {cityOpen && (
                        <div
                          className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border/60 shadow-xl overflow-y-auto rounded-md"
                          style={{ maxHeight: 200 }}
                        >
                          {provinces.length === 0 && (
                            <p className="text-xs tracking-tighter text-muted-foreground px-4 py-3 text-center">
                              Đang tải...
                            </p>
                          )}
                          {provinces
                            .filter((p) =>
                              p.name
                                .toLowerCase()
                                .includes((citySearch || "").toLowerCase()),
                            )
                            .map((p) => (
                              <button
                                key={p.code}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setForm((prev) => ({
                                    ...prev,
                                    province: p.name,
                                    ward: "",
                                  }));
                                  setSelectedProvinceCode(p.code);
                                  setWards([]);
                                  setCityOpen(false);
                                  setCitySearch("");
                                }}
                                className={`w-full tracking-tighter text-left px-4 py-2 text-xs hover:bg-muted/50 transition-colors ${form.province === p.name ? "bg-primary/5 text-primary font-bold" : ""}`}
                              >
                                {p.name}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ward dropdown */}
                  <div className="space-y-1" ref={wardDropdownRef}>
                    <label className="text-sm tracking-tighter text-muted-foreground">
                      Phường / Xã
                    </label>
                    <div className="relative">
                      <Input
                        value={wardSearch || form.ward}
                        disabled={!selectedProvinceCode}
                        onChange={(e) => {
                          setWardSearch(e.target.value);
                          setWardOpen(true);
                          setForm((p) => ({ ...p, ward: "" }));
                        }}
                        onFocus={() => {
                          setWardOpen(true);
                          setWardSearch("");
                        }}
                        readOnly={!!form.ward && !wardOpen}
                        placeholder={
                          selectedProvinceCode
                            ? "Chọn phường/xã"
                            : "Chọn tỉnh trước"
                        }
                        className="h-8 mt-1.5 text-sm pr-7 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <CaretDown
                        size={13}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-transform ${wardOpen ? "rotate-180" : ""}`}
                      />
                      {wardOpen && selectedProvinceCode && (
                        <div
                          className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border/60 shadow-xl overflow-y-auto rounded-md"
                          style={{ maxHeight: 200 }}
                        >
                          {wards
                            .filter((w) =>
                              w.name
                                .toLowerCase()
                                .includes((wardSearch || "").toLowerCase()),
                            )
                            .map((w) => (
                              <button
                                key={w.code}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setForm((p) => ({ ...p, ward: w.name }));
                                  setWardOpen(false);
                                  setWardSearch("");
                                }}
                                className={`w-full tracking-tighter text-left px-4 py-2 text-xs hover:bg-muted/50 transition-colors ${form.ward === w.name ? "bg-primary/5 text-primary font-bold" : ""}`}
                              >
                                {w.name}
                              </button>
                            ))}
                          {wards.filter((w) =>
                            w.name
                              .toLowerCase()
                              .includes((wardSearch || "").toLowerCase()),
                          ).length === 0 && (
                            <p className="text-xs text-muted-foreground px-4 py-3 text-center">
                              Không tìm thấy
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── kỹ năng (edit only, rescuer only) ── */}
          {isEditing && user?.roleId === ROLES.RESCUER && (
            <div className="px-6 py-3 border-b border-border/30">
              <SectionLabel>KỸ NĂNG</SectionLabel>
              {isLoadingAbilities ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <Skeleton className="h-28 w-full rounded-lg" />
                  <Skeleton className="h-28 w-full rounded-lg" />
                </div>
              ) : abilityCategoryGroups.length === 0 &&
                professionalMedicalAbilities.length === 0 ? (
                <p className="text-sm tracking-tighter text-muted-foreground/60">
                  Không có danh sách kỹ năng
                </p>
              ) : (
                <div className="space-y-3">
                  {professionalMedicalAbilities.length > 0 && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="text-sm font-semibold tracking-tighter text-foreground">
                        Y tế chuyên môn
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                        {professionalMedicalAbilities.map((ability) => {
                          const isSelected =
                            selectedAbilityLevels[ability.id] !== undefined;

                          return (
                            <div
                              key={ability.id}
                              role="radio"
                              tabIndex={0}
                              aria-checked={isSelected}
                              onClick={() =>
                                toggleProfessionalMedicalAbility(ability.id)
                              }
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  toggleProfessionalMedicalAbility(ability.id);
                                }
                              }}
                              className={cn(
                                "flex min-h-12 cursor-pointer items-start gap-2 rounded-md border px-3 py-2 transition-colors",
                                isSelected
                                  ? "border-primary/60 bg-background text-primary"
                                  : "border-border/50 bg-background text-foreground hover:bg-muted/40",
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                tabIndex={-1}
                                aria-hidden="true"
                                className="pointer-events-none mt-0.5"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium tracking-tighter leading-4">
                                  {ability.description}
                                </span>
                                <span className="mt-1 block truncate text-xs tracking-tighter text-muted-foreground">
                                  Chỉ chọn 1 trong 4 nhóm chuyên môn
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {abilityCategoryGroups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-lg border border-border/50 p-3"
                    >
                      <p className="text-sm font-semibold tracking-tighter text-foreground">
                        {group.description}
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {group.items.map((ability) => {
                          const isSelected =
                            effectiveSelectedAbilityLevels[ability.id] !==
                            undefined;
                          const isLocked = lockedAutoAbilityIds.has(ability.id);
                          const isVehicleConditionLocked =
                            VEHICLE_CONDITION_SKILL_IDS.includes(
                              ability.id as 43 | 44,
                            ) && !hasVehicleSkillSelected;
                          const isDisabled =
                            isLocked || isVehicleConditionLocked;
                          const helperText = isVehicleConditionLocked
                            ? "Chọn kỹ năng phương tiện trước"
                            : ability.abilitySubgroup.description;
                          const helperClassName = isVehicleConditionLocked
                            ? "text-muted-foreground/60"
                            : "text-muted-foreground";
                          const toggleCurrentAbility = () => {
                            if (isDisabled) {
                              return;
                            }

                            toggleAbility(ability.id);
                          };

                          return (
                            <div
                              key={ability.id}
                              role="checkbox"
                              tabIndex={0}
                              aria-checked={isSelected}
                              aria-disabled={isDisabled}
                              onClick={toggleCurrentAbility}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  toggleCurrentAbility();
                                }
                              }}
                              className={cn(
                                "flex min-h-12 cursor-pointer items-start gap-2 rounded-md border px-3 py-2 transition-colors",
                                isSelected
                                  ? "border-primary/50 bg-primary/5 text-primary"
                                  : "border-border/50 text-foreground hover:bg-muted/40",
                                isDisabled &&
                                  "cursor-not-allowed opacity-70 hover:bg-transparent",
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                disabled={isDisabled}
                                tabIndex={-1}
                                aria-hidden="true"
                                className="pointer-events-none mt-0.5"
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium tracking-tighter leading-4">
                                  {ability.description}
                                </span>
                                <span
                                  className={cn(
                                    "mt-1 block truncate text-xs tracking-tighter",
                                    helperClassName,
                                  )}
                                >
                                  {helperText}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── chứng chỉ (edit only, rescuer only) ── */}
          {isEditing && user?.roleId === ROLES.RESCUER && (
            <div className="px-6 py-3 border-b border-border/30">
              <div className="flex items-center justify-between gap-3 mb-3">
                <SectionLabel>CHỨNG CHỈ</SectionLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs tracking-tighter"
                  onClick={() =>
                    setDocumentRows((prev) => [
                      ...prev,
                      createEmptyDocumentRow(),
                    ])
                  }
                >
                  Thêm chứng chỉ
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {documentRows.map((row, index) => (
                  <div
                    key={row.localId}
                    className="min-w-0 space-y-2 rounded-lg border border-border/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold tracking-tighter text-foreground">
                        Chứng chỉ {index + 1}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setDocumentRows((prev) =>
                            prev.length === 1
                              ? [createEmptyDocumentRow()]
                              : prev.filter(
                                  (item) => item.localId !== row.localId,
                                ),
                          )
                        }
                      >
                        <Trash size={14} />
                      </Button>
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <label className="text-sm tracking-tighter text-muted-foreground">
                        Loại chứng chỉ
                      </label>
                      <Select
                        value={row.fileTypeId}
                        onValueChange={(value) =>
                          setDocumentRows((prev) =>
                            prev.map((item) =>
                              item.localId === row.localId
                                ? { ...item, fileTypeId: value }
                                : item,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="h-9 w-full min-w-0 text-sm tracking-tighter [&>span]:min-w-0 [&>span]:truncate">
                          <SelectValue
                            className="truncate"
                            placeholder={
                              isLoadingDocumentFileTypes
                                ? "Đang tải loại chứng chỉ..."
                                : "Chọn loại chứng chỉ"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent
                          className="w-[min(720px,calc(100vw-4rem))] max-w-[min(720px,calc(100vw-4rem))]"
                          position="popper"
                          align="start"
                          style={{ maxHeight: 320 }}
                        >
                          {documentTypeGroups.map((group) => (
                            <SelectGroup key={group.id}>
                              <SelectLabel className="text-xs tracking-tighter text-muted-foreground">
                                {group.description}
                              </SelectLabel>
                              {group.items.map((type) => (
                                <SelectItem
                                  key={type.id}
                                  value={String(type.id)}
                                >
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <label className="text-sm tracking-tighter text-muted-foreground">
                        Tệp chứng chỉ
                      </label>

                      {/* Existing file — show preview row + Thay button, hide file input */}
                      {row.fileUrl &&
                      !row.file &&
                      !replacingRowIds.has(row.localId) ? (
                        <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2 text-xs tracking-tighter text-muted-foreground">
                            <FileText size={13} className="shrink-0" />
                            <span className="truncate">
                              {row.fileName || getFileNameFromUrl(row.fileUrl)}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {canPreviewDocumentRow(row) && (
                              <button
                                type="button"
                                className="inline-flex size-7 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                onClick={() => openDocumentPreview(row)}
                                title="Xem trước"
                                aria-label="Xem trước chứng chỉ"
                              >
                                <Eye size={15} />
                              </button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                setReplacingRowIds((prev) => {
                                  const next = new Set(prev);
                                  next.add(row.localId);
                                  return next;
                                })
                              }
                            >
                              Thay
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* No existing file OR user clicked Thay — show file input */
                        <>
                          <Input
                            type="file"
                            accept="image/*,application/pdf,.pdf"
                            className="h-12 w-full min-w-0 py-0 text-sm leading-[48px] tracking-tighter file:h-12 file:max-w-[45%] file:truncate file:py-0 file:text-sm file:leading-[48px] file:tracking-tighter"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              setDocumentRows((prev) =>
                                prev.map((item) =>
                                  item.localId === row.localId
                                    ? {
                                        ...item,
                                        file,
                                        fileName: file?.name ?? item.fileName,
                                      }
                                    : item,
                                ),
                              );
                            }}
                          />
                          {/* If replacing, allow cancelling back to existing file */}
                          {replacingRowIds.has(row.localId) &&
                            row.fileUrl &&
                            !row.file && (
                              <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                                onClick={() =>
                                  setReplacingRowIds((prev) => {
                                    const next = new Set(prev);
                                    next.delete(row.localId);
                                    return next;
                                  })
                                }
                              >
                                Hủy thay
                              </button>
                            )}
                          {row.file && (
                            <div className="flex items-center justify-between gap-2 text-xs tracking-tighter text-muted-foreground">
                              <div className="flex min-w-0 items-center gap-2">
                                <FileText size={13} className="shrink-0" />
                                <span className="truncate">{row.fileName}</span>
                              </div>
                              {canPreviewDocumentRow(row) && (
                                <button
                                  type="button"
                                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                  onClick={() => openDocumentPreview(row)}
                                  title="Xem trước"
                                  aria-label="Xem trước chứng chỉ"
                                >
                                  <Eye size={15} />
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── kỹ năng (view only, rescuer only) ── */}
          {!isEditing && user?.roleId === 3 && (
            <div className="px-6 pb-3 border-b border-border/30">
              <SectionLabel>KỸ NĂNG</SectionLabel>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  {ABILITY_CATEGORIES.map((cat) => {
                    const catAbilities = (user.abilities ?? []).filter(
                      (a) => a.categoryCode === cat.code,
                    );
                    return (
                      <div key={cat.code}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                          {cat.label}
                        </p>
                        {catAbilities.length === 0 ? (
                          <p className="text-sm tracking-tighter text-muted-foreground/50 italic">
                            Không có
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {catAbilities.map((ab) => (
                              <div
                                key={ab.abilityId}
                                className={`inline-flex font-medium items-center gap-1.5 px-2 py-1 rounded-md border text-xs tracking-tighter ${cat.badgeClass}`}
                              >
                                <span>{ab.description}</span>
                                <span className="opacity-60 font-semibold">
                                  Lv.{ab.level}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── chứng chỉ (view only, rescuer only) ── */}
          {!isEditing && user?.roleId === 3 && (
            <div className="px-6 pb-3 border-b border-border/30">
              <SectionLabel>CHỨNG CHỈ</SectionLabel>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !user?.rescuerApplicationDocuments?.length ? (
                <p className="text-sm tracking-tighter text-muted-foreground/50 italic">
                  Không có chứng chỉ
                </p>
              ) : (
                <div className="space-y-2">
                  {user.rescuerApplicationDocuments.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-muted/30 transition-colors group"
                    >
                      <FileText
                        size={16}
                        className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors"
                      />
                      <span className="text-sm tracking-tighter text-foreground truncate flex-1">
                        {doc.fileTypeName ?? "Tài liệu không xác định"}
                      </span>
                      <ArrowSquareOut
                        size={14}
                        className="text-muted-foreground shrink-0 group-hover:text-primary transition-colors"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── thời gian (view only) ── */}
          {!isEditing && (
            <div className="px-6 pb-3">
              <SectionLabel>THỜI GIAN</SectionLabel>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <FieldRow
                    label="Thời gian tạo"
                    value={
                      user?.createdAt ? formatDateTime(user.createdAt) : "—"
                    }
                  />
                  <FieldRow
                    label="Cập nhật lần cuối"
                    value={
                      user?.updatedAt ? formatDateTime(user.updatedAt) : "—"
                    }
                  />
                  {user?.approvedAt && (
                    <FieldRow
                      label="Duyệt lúc"
                      value={formatDateTime(user.approvedAt)}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── edit action bar ── */}
        {isEditing && (
          <div className="px-6 py-4 bg-background border-t border-border/40 flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleCancelEdit}
              disabled={isBusy}
            >
              <X size={14} />
              Hủy
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleSave}
              disabled={isBusy}
            >
              {isBusy ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Đang lưu...
                </span>
              ) : (
                <>
                  <FloppyDisk size={14} />
                  Cập nhật
                </>
              )}
            </Button>
          </div>
        )}

        {documentPreview &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-[10080] flex items-center justify-center bg-black/85 p-6"
              onClick={closeDocumentPreview}
            >
              <button
                type="button"
                className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
                onClick={closeDocumentPreview}
                aria-label="Đóng xem trước"
              >
                <X size={18} />
              </button>
              <div
                className="flex max-h-[90vh] max-w-[90vw] flex-col gap-3"
                onClick={(event) => event.stopPropagation()}
              >
                <img
                  src={documentPreview.src}
                  alt={documentPreview.name}
                  className="max-h-[82vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
                />
                <p className="max-w-[90vw] truncate text-center text-sm tracking-tighter text-white/80">
                  {documentPreview.name}
                </p>
              </div>
            </div>,
            document.body,
          )}
      </SheetContent>
    </Sheet>
  );
};

export default UserDetailSheet;
