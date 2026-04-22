"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MagnifyingGlass,
  FloppyDisk,
  CaretDown,
  CaretRight,
  CheckCircle,
  PencilSimple,
  User as UserIcon,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ROLE_NAMES, ROLES, RoleId } from "@/lib/roles";
import {
  useAllPermissions,
  useUserPermissions,
  useUpdateUserPermissions,
} from "@/services/permissions";
import { PermissionEntity } from "@/services/permissions/type";
import { useUsersForPermission } from "@/services/user/hooks";
import { UserEntity } from "@/services/user/type";
import { Icon } from "@iconify/react";

// ── Permission group labels ──────────────────────────────
const PERMISSION_GROUP_LABELS: Record<string, string> = {
  system: "Hệ thống",
  inventory: "Kho vật phẩm",
  personnel: "Nhân sự",
  mission: "Nhiệm vụ",
  activity: "Hoạt động",
  sos: "SOS",
};

const PERMISSION_GROUP_ORDER = [
  "system",
  "inventory",
  "personnel",
  "mission",
  "activity",
  "sos",
];

function areSetsEqual<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function groupPermissions(
  permissions: PermissionEntity[],
): Record<string, PermissionEntity[]> {
  const groups: Record<string, PermissionEntity[]> = {};
  for (const perm of permissions) {
    const domain = perm.code.split(".")[0];
    if (!groups[domain]) groups[domain] = [];
    groups[domain].push(perm);
  }
  return groups;
}

const ROLE_FILTERS = [
  {
    id: ROLES.COORDINATOR,
    label: "Điều phối viên",
    activeClass: "bg-blue-500 text-white border-blue-500",
    baseClass: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  {
    id: ROLES.RESCUER,
    label: "Cứu hộ viên",
    activeClass: "bg-emerald-500 text-white border-emerald-500",
    baseClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  },
  {
    id: ROLES.MANAGER,
    label: "Quản lý kho",
    activeClass: "bg-orange-500 text-white border-orange-500",
    baseClass:
      "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100",
  },
  {
    id: ROLES.VICTIM,
    label: "Công dân",
    activeClass: "bg-violet-500 text-white border-violet-500",
    baseClass:
      "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100",
  },
];

const UserPermissionPanel = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserEntity | null>(null);
  const [localCheckedIds, setLocalCheckedIds] = useState<Set<number> | null>(
    null,
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(PERMISSION_GROUP_ORDER),
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // ── Debounce search 400ms ────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Queries ──────────────────────────────────────────────
  const { data: allPermissions, isLoading: loadingAll } = useAllPermissions();
  const { data: usersForPermission, isLoading: loadingUsers } =
    useUsersForPermission({
      pageNumber: page,
      search: debouncedSearch,
      pageSize,
      roleId: selectedRoleId ?? undefined,
    });
  const { data: userData, isLoading: loadingUserPerms } = useUserPermissions(
    selectedUser?.id ?? "",
  );
  const updateMutation = useUpdateUserPermissions(selectedUser?.id ?? "");
  const currentRoleId = userData?.roleId ?? selectedUser?.roleId ?? null;
  const isReadOnlyRole = currentRoleId === ROLES.MANAGER;
  const effectiveIsEditMode = isEditMode && !isReadOnlyRole;
  const canEditPermissions = effectiveIsEditMode;

  // ── Derive checked IDs: local edits or server data ───────
  const serverCheckedIds = useMemo(
    () =>
      new Set([
        ...(userData?.permissions ?? []).map((p) => p.id),
        ...(userData?.rolePermissions ?? []).map((p) => p.id),
      ]),
    [userData?.permissions, userData?.rolePermissions],
  );
  const checkedIds = localCheckedIds ?? serverCheckedIds;
  const hasChanges = useMemo(() => {
    if (!localCheckedIds) return false;
    return !areSetsEqual(localCheckedIds, serverCheckedIds);
  }, [localCheckedIds, serverCheckedIds]);

  // ── Server-filtered user list ──────────────────────────
  const filteredUsers = usersForPermission?.items ?? [];
  const totalPages = Math.max(1, usersForPermission?.totalPages ?? 1);
  const totalCount = usersForPermission?.totalCount ?? 0;

  // ── Grouped permissions ──────────────────────────────────
  const grouped = useMemo(
    () => groupPermissions(allPermissions ?? []),
    [allPermissions],
  );

  // ── Handlers ─────────────────────────────────────────────
  const handleSelectUser = useCallback((user: UserEntity) => {
    setSelectedUser(user);
    setSearchTerm("");
    setShowDropdown(false);
    setLocalCheckedIds(null);
    setIsEditMode(false);
    setIsConfirmOpen(false);
  }, []);

  const handleClearUser = useCallback(() => {
    setSelectedUser(null);
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedRoleId(null);
    setLocalCheckedIds(null);
    setIsEditMode(false);
    setIsConfirmOpen(false);
  }, []);

  const handleToggle = useCallback(
    (permId: number) => {
      if (!canEditPermissions) return;
      setLocalCheckedIds((prev) => {
        const base = prev ?? new Set(serverCheckedIds);
        const next = new Set(base);
        if (next.has(permId)) next.delete(permId);
        else next.add(permId);
        return next;
      });
    },
    [canEditPermissions, serverCheckedIds],
  );

  const handleToggleGroup = useCallback(
    (groupPerms: PermissionEntity[]) => {
      if (!canEditPermissions) return;
      setLocalCheckedIds((prev) => {
        const base = prev ?? new Set(serverCheckedIds);
        const next = new Set(base);
        const allChecked = groupPerms.every((p) => next.has(p.id));
        if (allChecked) {
          groupPerms.forEach((p) => next.delete(p.id));
        } else {
          groupPerms.forEach((p) => next.add(p.id));
        }
        return next;
      });
    },
    [canEditPermissions, serverCheckedIds],
  );

  const handleRevertAll = useCallback(() => {
    if (!canEditPermissions) return;
    setLocalCheckedIds(null);
  }, [canEditPermissions]);

  const handleRevertGroup = useCallback(
    (groupPerms: PermissionEntity[]) => {
      if (!canEditPermissions) return;
      setLocalCheckedIds((prev) => {
        const next = new Set(prev ?? serverCheckedIds);
        groupPerms.forEach((perm) => {
          if (serverCheckedIds.has(perm.id)) next.add(perm.id);
          else next.delete(perm.id);
        });
        return areSetsEqual(next, serverCheckedIds) ? null : next;
      });
    },
    [canEditPermissions, serverCheckedIds],
  );

  const toggleGroupExpand = useCallback((domain: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }, []);

  const handleSave = () => {
    if (!selectedUser) return;
    toast.loading("Đang lưu quyền...");
    updateMutation.mutate(
      { permissionIds: Array.from(checkedIds) },
      {
        onSuccess: () => {
          toast.dismiss();
          toast.success(
            `Đã cập nhật quyền cho ${selectedUser.lastName} ${selectedUser.firstName}`,
          );
          setLocalCheckedIds(null);
          setIsEditMode(false);
          setIsConfirmOpen(false);
        },
        onError: () => {
          toast.dismiss();
          toast.error("Có lỗi xảy ra khi lưu quyền");
        },
      },
    );
  };

  const handleCancelEdit = useCallback(() => {
    setLocalCheckedIds(null);
    setIsEditMode(false);
  }, []);

  const isLoading = loadingAll || loadingUserPerms;

  // ── Shared permission group list renderer ────────────────
  const renderPermissionGroups = (stopPropagation = false) => (
    <div className="grid grid-cols-2 gap-3">
      {PERMISSION_GROUP_ORDER.filter((d) => grouped[d]).map((domain) => {
        const groupPerms = grouped[domain];
        const isExpanded = expandedGroups.has(domain);
        const checkedCount = groupPerms.filter((p) =>
          checkedIds.has(p.id),
        ).length;
        const allGroupChecked = checkedCount === groupPerms.length;
        const groupHasChanges = groupPerms.some(
          (perm) => checkedIds.has(perm.id) !== serverCheckedIds.has(perm.id),
        );
        return (
          <Card
            key={domain}
            className={cn(
              "border-border/60 overflow-hidden transition-all duration-300 py-0",
              isExpanded ? "" : "self-start",
            )}
          >
            <button
              onClick={(e) => {
                if (stopPropagation) e.stopPropagation();
                toggleGroupExpand(domain);
              }}
              className="w-full flex items-center justify-between px-4 pt-4 pb-2 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <CaretDown
                    size={14}
                    className="text-muted-foreground tracking-tighter"
                  />
                ) : (
                  <CaretRight
                    size={14}
                    className="text-muted-foreground tracking-tighter"
                  />
                )}
                <span className="text-sm font-bold uppercase tracking-tighter">
                  {PERMISSION_GROUP_LABELS[domain] ?? domain}
                </span>
                <Badge
                  variant="secondary"
                  className="text-xs tracking-tighter font-medium px-1.5 py-0"
                >
                  {checkedCount}/{groupPerms.length}
                </Badge>
              </div>
              {isExpanded && (
                <div className="flex items-center gap-3">
                  {groupHasChanges && canEditPermissions && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRevertGroup(groupPerms);
                      }}
                      className="text-sm tracking-tighter text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Hoàn tác
                    </button>
                  )}
                  <div
                    onClick={(e) => {
                      if (!canEditPermissions) return;
                      e.stopPropagation();
                      handleToggleGroup(groupPerms);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 text-sm tracking-tighter transition-colors",
                      canEditPermissions
                        ? "cursor-pointer text-muted-foreground hover:text-foreground"
                        : "cursor-not-allowed text-muted-foreground/50",
                    )}
                  >
                    {allGroupChecked && (
                      <CheckCircle
                        size={14}
                        weight="fill"
                        className="text-green-500"
                      />
                    )}
                    <span>{allGroupChecked ? "Bỏ chọn" : "Chọn hết"}</span>
                  </div>
                </div>
              )}
            </button>
            {isExpanded && (
              <div className="border-t border-border/40">
                {groupPerms.map((perm, idx) => (
                  <label
                    key={perm.id}
                    onClick={
                      stopPropagation ? (e) => e.stopPropagation() : undefined
                    }
                    className={cn(
                      "flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors",
                      idx < groupPerms.length - 1 &&
                        "border-b border-border/20",
                    )}
                  >
                    <Checkbox
                      checked={checkedIds.has(perm.id)}
                      onCheckedChange={() => handleToggle(perm.id)}
                      disabled={!canEditPermissions || updateMutation.isPending}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium tracking-tighter leading-tight">
                        {perm.name}
                      </p>
                      {perm.description && (
                        <p className="text-[12px] text-muted-foreground tracking-tighter mt-0.5 leading-tight">
                          {perm.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Top bar: role badges + search ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm tracking-tighter text-muted-foreground font-medium shrink-0">
            Lọc theo vai trò:
          </span>
          {ROLE_FILTERS.map((role) => {
            const isActive = selectedRoleId === role.id;
            return (
              <button
                key={role.id}
                onClick={() => {
                  const next = isActive ? null : role.id;
                  setSelectedRoleId(next);
                  setPage(1);
                  if (!isActive) {
                    setSelectedUser(null);
                    setLocalCheckedIds(null);
                  }
                }}
                className={cn(
                  "text-sm px-3.5 py-1.5 rounded-full border tracking-tighter font-medium transition-all duration-200",
                  isActive ? role.activeClass : role.baseClass,
                )}
              >
                {role.label}
              </button>
            );
          })}
        </div>

        {/* Search box */}
        <div className="relative flex-1 min-w-50 max-w-xs">
          <Input
            placeholder="Tìm theo tên, username..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="pl-9 h-9 text-sm border-border/60"
          />
          <MagnifyingGlass
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          {showDropdown && debouncedSearch.trim() && !selectedRoleId && (
            <div className="absolute top-full left-0 mt-1 w-full min-w-72 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {loadingUsers ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center tracking-tighter text-sm text-muted-foreground">
                  Không tìm thấy người dùng
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onMouseDown={() => handleSelectUser(user)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left border-b border-border/20 last:border-0"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold tracking-tighter shrink-0 overflow-hidden border border-border/50">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          {user.lastName?.[0]}
                          {user.firstName?.[0]}
                        </>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm tracking-tighter font-medium truncate">
                        {user.lastName} {user.firstName}
                      </p>
                      <p className="text-xs tracking-tighter text-muted-foreground truncate">
                        @{user.username} · {user.phone}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {ROLE_NAMES[user.roleId as RoleId] ?? "Unknown"}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected user chip (search mode) */}
        {selectedUser && selectedRoleId === null && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-sm">
            {selectedUser.avatarUrl && (
              <img
                src={selectedUser.avatarUrl}
                alt="avatar"
                className="w-5 h-5 rounded-full object-cover border border-primary/20"
              />
            )}
            <span className="font-medium tracking-tighter text-primary">
              {selectedUser.lastName} {selectedUser.firstName}
            </span>
            <button
              onClick={handleClearUser}
              className="text-primary/60 hover:text-primary"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── User cards + permission panel (shown when role filter is active) ── */}
      {selectedRoleId !== null && (
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
          {/* Left: user list — shrinks to 2 cols when a user is selected */}
          <div
            className={cn(
              "w-full space-y-3 transition-all duration-500 ease-in-out",
              selectedUser && "xl:w-72 xl:shrink-0",
            )}
          >
            {loadingUsers ? (
              <div
                className={cn(
                  "grid gap-2.5",
                  selectedUser
                    ? "grid-cols-1"
                    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
                )}
              >
                {Array.from({ length: selectedUser ? 4 : 10 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-border/40 bg-card space-y-2"
                  >
                    <Skeleton className="h-10 w-10 rounded-full mx-auto" />
                    <Skeleton className="h-3.5 w-3/4 mx-auto" />
                    <Skeleton className="h-3 w-1/2 mx-auto" />
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UserIcon size={36} className="opacity-20 mb-2" />
                <p className="text-sm tracking-tighter">
                  Không có người dùng trong nhóm này
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  "grid gap-2.5 transition-all duration-500",
                  selectedUser
                    ? "grid-cols-1"
                    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
                )}
              >
                {filteredUsers.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() =>
                        isSelected
                          ? setSelectedUser(null)
                          : handleSelectUser(user)
                      }
                      className={cn(
                        "rounded-xl border bg-card text-center transition-all duration-300 group",
                        selectedUser ? "p-3" : "p-4",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                          : "border-border/50 hover:border-primary/40 hover:shadow-sm",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-full flex items-center justify-center font-bold tracking-tighter mx-auto transition-all duration-300 overflow-hidden",
                          selectedUser
                            ? "w-9 h-9 text-sm mb-1.5"
                            : "w-12 h-12 text-base mb-2.5",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                        )}
                      >
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            {user.lastName?.[0]}
                            {user.firstName?.[0]}
                          </>
                        )}
                      </div>
                      <p
                        className={cn(
                          "font-semibold tracking-tighter truncate transition-colors",
                          selectedUser ? "text-[14px]" : "text-sm",
                          isSelected && "text-primary",
                        )}
                      >
                        {user.lastName} {user.firstName}
                      </p>
                      <p
                        className={cn(
                          "text-muted-foreground tracking-tighter truncate",
                          selectedUser ? "text-[14px]" : "text-sm",
                        )}
                      >
                        @{user.username}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="border-t border-border/40 pt-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs tracking-tighter text-muted-foreground whitespace-nowrap">
                    {totalCount} người dùng
                  </p>
                  <div className="flex items-center gap-1.5 text-sm tracking-tighter text-muted-foreground whitespace-nowrap">
                    <span className="shrink-0">Hiển thị</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPage(1);
                        setPageSize(Number(value));
                      }}
                    >
                      <SelectTrigger className="h-8 w-18 text-sm tracking-tighter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[20, 50, 100].map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="shrink-0">/ trang</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-sm tracking-tighter"
                    disabled={page <= 1 || loadingUsers}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Trước
                  </Button>
                  <span className="min-w-10 text-center text-sm tracking-tighter text-muted-foreground whitespace-nowrap">
                    {page}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-sm tracking-tighter"
                    disabled={page >= totalPages || loadingUsers}
                    onClick={() =>
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: permission panel — slides in from right */}
          {selectedUser && (
            <div className="w-full min-w-0 flex-1">
              <div className="space-y-3">
                {/* Slim action bar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm text-muted-foreground tracking-tighter">
                      Đã chọn{" "}
                      <span className="font-semibold tracking-tighter text-foreground">
                        {checkedIds.size}
                      </span>
                      /{allPermissions?.length ?? 0} quyền
                    </p>
                    <p className="text-sm text-muted-foreground tracking-tighter">
                      Chế độ hiện tại:{" "}
                      <span className="font-semibold tracking-tighter text-foreground">
                        {effectiveIsEditMode ? "Chỉnh sửa" : "Chỉ xem"}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isReadOnlyRole ? (
                      <span className="text-sm tracking-tighter text-muted-foreground">
                        Quản lý kho chỉ được xem
                      </span>
                  ) : effectiveIsEditMode ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1"
                        onClick={handleRevertAll}
                        disabled={!hasChanges || updateMutation.isPending}
                      >
                        Hoàn tác tất cả
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1"
                          onClick={handleCancelEdit}
                          disabled={updateMutation.isPending}
                        >
                          Hủy
                        </Button>
                        <Button
                          onClick={() => setIsConfirmOpen(true)}
                          disabled={!hasChanges || updateMutation.isPending}
                          size="sm"
                          className="h-7 px-2.5 track text-xs gap-1"
                        >
                          <FloppyDisk size={13} weight="bold" />
                          {updateMutation.isPending
                            ? "Đang lưu..."
                            : "Lưu thay đổi"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1"
                        onClick={() => setIsEditMode(true)}
                      >
                        <PencilSimple size={13} weight="bold" />
                        Chỉnh sửa
                      </Button>
                    )}
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-1 hover:bg-muted rounded-md transition-colors"
                    >
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Permission groups — 2 col grid */}
                {isLoading ? (
                  <PermissionSkeleton />
                ) : (
                  renderPermissionGroups(true)
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Permission editor (user selected via search, no role filter) ── */}
      {selectedUser && selectedRoleId === null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm tracking-tighter text-muted-foreground">
                Đã chọn{" "}
                <span className="font-semibold tracking-tighter text-foreground">
                  {checkedIds.size}
                </span>
                /{allPermissions?.length ?? 0} quyền
              </p>
              <p className="text-sm text-muted-foreground tracking-tighter">
                Chế độ hiện tại:{" "}
                <span className="font-semibold tracking-tighter text-foreground">
                  {effectiveIsEditMode ? "Chỉnh sửa" : "Chỉ xem"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isReadOnlyRole ? (
                <span className="text-sm tracking-tighter text-muted-foreground">
                  Quản lý kho chỉ được xem
                </span>
              ) : effectiveIsEditMode ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                    onClick={handleRevertAll}
                    disabled={!hasChanges || updateMutation.isPending}
                  >
                    Hoàn tác tất cả
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                    onClick={handleCancelEdit}
                    disabled={updateMutation.isPending}
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={() => setIsConfirmOpen(true)}
                    disabled={!hasChanges || updateMutation.isPending}
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                  >
                    <FloppyDisk size={13} weight="bold" />
                    {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1"
                  onClick={() => setIsEditMode(true)}
                >
                  <PencilSimple size={13} weight="bold" />
                  Chỉnh sửa
                </Button>
              )}
              <button
                onClick={handleClearUser}
                className="p-1 hover:bg-muted rounded-md transition-colors"
              >
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
          {isLoading ? <PermissionSkeleton /> : renderPermissionGroups()}
        </div>
      )}

      {/* ── Empty state ── */}
      {selectedRoleId === null && !selectedUser && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserIcon size={44} className="text-muted-foreground/20 mb-3" />
          <p className="text-base font-semibold tracking-tighter text-muted-foreground">
            Chọn vai trò để xem danh sách người dùng
          </p>
          <p className="text-sm tracking-tighter text-muted-foreground/60 mt-1">
            hoặc tìm kiếm theo tên, username ở trên
          </p>
        </div>
      )}

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-500 font-medium gap-2 tracking-tighter">
              <Icon icon="ph:warning-diamond-fill" width="20" height="20" />
              Xác nhận lưu thay đổi quyền
            </DialogTitle>
            <DialogDescription className="pt-1 text-black font-medium text-base leading-relaxed">
              Lưu ý: Việc thay đổi quyền sẽ tác động trực tiếp đến an toàn dữ
              liệu của hệ thống. Quản trị viên hoàn toàn chịu trách nhiệm cho
              thao tác này.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <FloppyDisk size={14} weight="bold" className="mr-1.5" />
              {updateMutation.isPending ? "Đang lưu..." : "Xác nhận lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function PermissionSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="border-border/60">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-10 rounded-full" />
          </div>
          <div className="border-t border-border/40 px-4 py-2.5 space-y-2.5">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-start gap-3">
                <Skeleton className="h-3.5 w-3.5 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

export default UserPermissionPanel;
