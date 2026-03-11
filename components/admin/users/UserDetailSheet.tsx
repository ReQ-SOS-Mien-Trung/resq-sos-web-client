"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUserById } from "@/services/user/hooks";
import {
  Phone,
  EnvelopeSimple,
} from "@phosphor-icons/react";

interface UserDetailSheetProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
    <span className="text-sm text-muted-foreground leading-5">{label}</span>
    <span className="text-sm text-foreground leading-5">{value ?? "—"}</span>
  </div>
);

interface StatusDotProps {
  active: boolean;
  label: string;
}

const StatusDot = ({ active, label }: StatusDotProps) => (
  <div className="flex items-center gap-2">
    <span
      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
        active ? "bg-emerald-500" : "bg-muted-foreground/30"
      }`}
    />
    <span className="text-sm text-foreground">{label}</span>
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
}: UserDetailSheetProps) => {
  const { data: user, isLoading } = useAdminUserById(userId!, {
    enabled: !!userId && open,
  });

  const role = user ? (ROLE_MAP[user.roleId] ?? DEFAULT_ROLE) : DEFAULT_ROLE;
  const fullName = user ? `${user.lastName} ${user.firstName}` : "";
  const initials = user
    ? `${user.lastName?.[0] ?? ""}${user.firstName?.[0] ?? ""}`.toUpperCase()
    : "??";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-115 overflow-y-auto p-0 flex flex-col">
        {/* ── header ── */}
        <div className="px-6 pt-7 pb-6 border-b border-border/30">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-xl sm:text-2xl font-black tracking-tight">
              Chi tiết người dùng
            </SheetTitle>
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
              <Avatar className="size-20 aspect-square border border-border/40 shrink-0">
                <AvatarImage src={user?.avatarUrl ?? undefined} alt={fullName} className="object-cover" />
                <AvatarFallback className="text-sm font-medium bg-muted text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                  {fullName}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  @{user?.username}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Badge
                    className={`${role.className} text-xs font-medium px-2 py-0.5`}
                  >
                    {role.label}
                  </Badge>
                  {user?.isBanned && (
                    <Badge className="bg-rose-500/10 text-rose-600 border border-rose-200/60 text-xs font-medium px-2 py-0.5">
                      Bị cấm
                    </Badge>
                  )}
                </div>
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
          ) : (
            <>
              <FieldRow
                label="Địa chỉ"
                value={
                  user?.address ? (
                    <span className="flex items-center gap-1.5">
                      
                      {user.address}
                    </span>
                  ) : null
                }
              />
              <FieldRow label="Phường / Xã" value={user?.ward} />
              <FieldRow label="Tỉnh / Thành phố" value={user?.province} />
            </>
          )}
        </div>

        {/* ── trạng thái tài khoản ── */}
        <div className="px-6 py-3 border-b border-border/30">
          <SectionLabel>TRẠNG THÁI TÀI KHOẢN</SectionLabel>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-5 rounded" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <StatusDot
                active={user?.isEmailVerified ?? false}
                label="Email xác minh"
              />
              <StatusDot
                active={user?.isOnboarded ?? false}
                label="Đã onboarded"
              />
              <StatusDot
                active={user?.isEligibleRescuer ?? false}
                label="Đủ điều kiện cứu hộ"
              />
              <StatusDot
                active={!(user?.isBanned ?? false)}
                label={user?.isBanned ? "Tài khoản bị cấm" : "Đang hoạt động"}
              />
            </div>
          )}

          {!isLoading && user?.isBanned && (
            <div className="mt-3 p-3 bg-rose-500/5 border border-rose-200/40 rounded">
              <p className="text-[11px] text-muted-foreground mb-0.5">
                Lý do cấm
              </p>
              <p className="text-sm text-rose-600">
                {user.banReason ?? "Không có lý do"}
              </p>
            </div>
          )}
        </div>

        {/* ── thời gian ── */}
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
                label="Tạo lúc"
                value={
                  <span className="flex items-center gap-1.5">
                    
                    {user?.createdAt ? formatDateTime(user.createdAt) : "—"}
                  </span>
                }
              />
              <FieldRow
                label="Cập nhật"
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
      </SheetContent>
    </Sheet>
  );
};

export default UserDetailSheet;
