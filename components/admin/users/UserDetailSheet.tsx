"use client";

import { useState, useEffect, useRef } from "react";
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
import { useAdminUserById, useUpdateAdminUser, ADMIN_USERS_QUERY_KEY } from "@/services/user/hooks";
import { useAuthStore } from "@/stores/auth.store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadImageToCloudinary } from "@/utils/uploadFile";
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
} from "@phosphor-icons/react";

interface UserDetailSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "view" | "edit";
}

const ROLE_MAP: Record<number, { label: string; className: string }> = {
  1: {
    label: "Quản trị viên",
    className: "bg-red-500/10 text-red-600 border border-red-200/60",
  },
  2: {
    label: "Điều phối viên",
    className: "bg-blue-500/10 text-blue-600 border border-blue-200/60",
  },
  3: {
    label: "Cứu hộ viên",
    className:
      "bg-emerald-500/10 text-emerald-600 border border-emerald-200/60",
  },
  4: {
    label: "Quản trị viên",
    className: "bg-red-500/10 text-red-600 border border-red-200/60",
  },
};

const DEFAULT_ROLE = {
  label: "Công dân",
  className: "bg-gray-500/10 text-gray-600 border border-gray-200/60",
};

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
}

const FieldRow = ({ label, value }: FieldRowProps) => (
  <div className="grid grid-cols-[130px_1fr] gap-3 items-start py-2.5 border-b border-border/25 last:border-0">
    <span className="text-sm tracking-tighter text-muted-foreground leading-5">{label}</span>
    <span className="text-sm tracking-tighter text-foreground leading-5">{value ?? "—"}</span>
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
  const updateMutation = useUpdateAdminUser();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuthStore();

  // ── edit mode state ──
  const [isEditing, setIsEditing] = useState(false);
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

  // province / ward
  const [provinces, setProvinces] = useState<{ code: number; name: string }[]>([]);
  const [wards, setWards] = useState<{ code: number; name: string }[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [wardOpen, setWardOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [wardSearch, setWardSearch] = useState("");
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const wardDropdownRef = useRef<HTMLDivElement>(null);

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
        setSelectedProvinceCode(null);
        setWards([]);
        setCitySearch("");
        setWardSearch("");
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
    }
  }, [open, initialMode]);

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
    fetch(`https://provinces.open-api.vn/api/v2/p/${selectedProvinceCode}?depth=2`)
      .then((r) => r.json())
      .then((d) => setWards(d.wards || []))
      .catch(() => {});
  }, [selectedProvinceCode]);

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) setCityOpen(false);
      if (wardDropdownRef.current && !wardDropdownRef.current.contains(e.target as Node)) setWardOpen(false);
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
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!userId) return;

    const proceed = (uploadedUrl?: string) => {
      toast.loading("Đang cập nhật...");
      updateMutation.mutate(
        {
          userId,
          data: {
            firstName: form.firstName,
            lastName: form.lastName,
            username: form.username,
            phone: form.phone,
            email: form.email || undefined,
            rescuerType: user?.roleId === 3 ? form.rescuerType || undefined : undefined,
            address: form.address || undefined,
            ward: form.ward || undefined,
            province: form.province || undefined,
            avatarUrl: uploadedUrl ?? user?.avatarUrl ?? undefined,
            approvedBy: authUser?.userId ?? undefined,
          },
        },
        {
          onSuccess: () => {
            toast.dismiss();
            toast.success("Cập nhật thành công!");
            queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY });
            setIsEditing(false);
            setAvatarFile(null);
            setAvatarPreview(null);
          },
          onError: (err: any) => {
            toast.dismiss();
            const msg = err?.response?.data?.message || err.message || "Đã xảy ra lỗi!";
            toast.error("Cập nhật thất bại: " + msg);
          },
        }
      );
    };

    if (avatarFile) {
      setIsUploading(true);
      toast.loading("Đang tải ảnh lên...");
      uploadImageToCloudinary(avatarFile)
        .then((url) => {
          toast.dismiss();
          setIsUploading(false);
          proceed(url);
        })
        .catch(() => {
          toast.dismiss();
          setIsUploading(false);
          toast.error("Tải ảnh thất bại!");
        });
    } else {
      proceed();
    }
  };

  const role = user ? (ROLE_MAP[user.roleId] ?? DEFAULT_ROLE) : DEFAULT_ROLE;
  const fullName = user ? `${user.lastName} ${user.firstName}` : "";
  const initials = user
    ? `${user.lastName?.[0] ?? ""}${user.firstName?.[0] ?? ""}`.toUpperCase()
    : "??";

  const currentAvatarSrc = avatarPreview ?? user?.avatarUrl ?? undefined;
  const isBusy = isUploading || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-115 overflow-y-auto p-0 flex flex-col">
        {/* ── header ── */}
        <div className="px-6 pt-10 pb-6 border-b border-border/30">
          <SheetHeader className="mb-5">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-xl sm:text-2xl font-black tracking-tight">
                {isEditing ? "Chỉnh sửa người dùng" : "Chi tiết người dùng"}
              </SheetTitle>
              {!isLoading && !isEditing && (
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
                  <AvatarImage src={currentAvatarSrc} alt={fullName} className="object-cover" />
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
                        onClick={() => { setAvatarFile(null); setAvatarPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
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
                        onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Tên"
                        value={form.firstName}
                        onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Input
                      placeholder="Username"
                      value={form.username}
                      onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <Badge className={`${role.className} text-sm tracking-tighter font-medium px-2 py-1 pointer-events-none`}>
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
                    <p className="text-sm tracking-tighter text-muted-foreground mt-0.5">@{user?.username}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge className={`${role.className} text-xs tracking-tighter font-medium px-2 py-0.5`}>
                        {role.label}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── liên hệ ── */}
        <div className="px-6 py-2 border-b border-border/30">
          <SectionLabel>THÔNG TIN LIÊN HỆ</SectionLabel>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm tracking-tighter text-muted-foreground">Số điện thoại</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  placeholder="0912345678"
                  className="h-8 mt-1.5 text-sm tracking-tighter"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm tracking-tighter text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="example@resq.com"
                  className="h-8 mt-1.5 text-sm tracking-tighter"
                />
              </div>
              {user?.roleId === 3 && (
                <div className="space-y-1">
                  <label className="text-sm tracking-tighter text-muted-foreground">Loại cứu hộ</label>
                  <div className="flex gap-2">
                    {(["Core", "Volunteer"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, rescuerType: t }))}
                        className={`flex-1 py-1.5 mt-1.5 text-sm tracking-tighter font-medium border transition-colors ${
                          form.rescuerType === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        {t === "Core" ? "Cứu hộ hệ thống" : "Tình nguyện viên"}
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
                    <Phone size={12} className="text-muted-foreground shrink-0" />
                    {user?.phone}
                  </span>
                }
              />
              <FieldRow
                label="Email"
                value={
                  <span className="flex items-center gap-1.5">
                    <EnvelopeSimple size={12} className="text-muted-foreground shrink-0" />
                    {user?.email ?? "—"}
                  </span>
                }
              />
              {user?.roleId === 3 && (
                <FieldRow
                  label="Loại cứu hộ"
                  value={
                    user.rescuerType === "Core"
                      ? "Cứu hộ hệ thống"
                      : user.rescuerType === "Volunteer"
                      ? "Tình nguyện viên"
                      : user.rescuerType ?? "—"
                  }
                />
              )}
            </>
          )}
        </div>

        {/* ── địa chỉ ── */}
        <div className="px-6 py-2 border-b border-border/30">
          <SectionLabel>ĐỊA CHỈ</SectionLabel>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : isEditing ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm tracking-tighter text-muted-foreground">Địa chỉ</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Số nhà, tên đường"
                  className="h-8 mt-1.5 text-sm"
                />
              </div>

              {/* Province dropdown */}
              <div className="space-y-1" ref={cityDropdownRef}>
                <label className="text-sm tracking-tighter text-muted-foreground">Tỉnh / Thành phố</label>
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
                    onFocus={() => { setCityOpen(true); setCitySearch(""); }}
                    readOnly={!!form.province && !cityOpen}
                    placeholder="Chọn tỉnh/thành phố"
                    className="h-8 mt-1.5 text-sm pr-7 cursor-pointer"
                  />
                  <CaretDown
                    size={13}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-transform ${cityOpen ? "rotate-180" : ""}`}
                  />
                  {cityOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border/60 shadow-xl overflow-y-auto rounded-md" style={{ maxHeight: 200 }}>
                      {provinces.length === 0 && <p className="text-xs tracking-tighter text-muted-foreground px-4 py-3 text-center">Đang tải...</p>}
                      {provinces
                        .filter((p) => p.name.toLowerCase().includes((citySearch || "").toLowerCase()))
                        .map((p) => (
                          <button
                            key={p.code}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, province: p.name, ward: "" }));
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
                <label className="text-sm tracking-tighter text-muted-foreground">Phường / Xã</label>
                <div className="relative">
                  <Input
                    value={wardSearch || form.ward}
                    disabled={!selectedProvinceCode}
                    onChange={(e) => {
                      setWardSearch(e.target.value);
                      setWardOpen(true);
                      setForm((p) => ({ ...p, ward: "" }));
                    }}
                    onFocus={() => { setWardOpen(true); setWardSearch(""); }}
                    readOnly={!!form.ward && !wardOpen}
                    placeholder={selectedProvinceCode ? "Chọn phường/xã" : "Chọn tỉnh trước"}
                    className="h-8 mt-1.5 text-sm pr-7 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <CaretDown
                    size={13}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-transform ${wardOpen ? "rotate-180" : ""}`}
                  />
                  {wardOpen && selectedProvinceCode && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border/60 shadow-xl overflow-y-auto rounded-md" style={{ maxHeight: 200 }}>
                      {wards
                        .filter((w) => w.name.toLowerCase().includes((wardSearch || "").toLowerCase()))
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
                      {wards.filter((w) => w.name.toLowerCase().includes((wardSearch || "").toLowerCase())).length === 0 && (
                        <p className="text-xs text-muted-foreground px-4 py-3 text-center">Không tìm thấy</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <FieldRow label="Địa chỉ" value={user?.address} />
              <FieldRow label="Phường / Xã" value={user?.ward} />
              <FieldRow label="Tỉnh / Thành phố" value={user?.province} />
            </>
          )}
        </div>



        {/* ── thời gian (view only) ── */}
        {!isEditing && (
          <div className="px-6 py-3">
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
                  value={user?.createdAt ? formatDateTime(user.createdAt) : "—"}
                />
                <FieldRow
                  label="Cập nhật lần cuối"
                  value={user?.updatedAt ? formatDateTime(user.updatedAt) : "—"}
                />
                {user?.approvedAt && (
                  <FieldRow label="Duyệt lúc" value={formatDateTime(user.approvedAt)} />
                )}
              </>
            )}
          </div>
        )}

        {/* ── edit action bar ── */}
        {isEditing && (
          <div className="sticky bottom-0 px-6 py-4 bg-background border-t border-border/40 flex items-center gap-3 mt-auto">
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
      </SheetContent>
    </Sheet>
  );
};

export default UserDetailSheet;
