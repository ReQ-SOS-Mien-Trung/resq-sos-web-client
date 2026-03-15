"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MagnifyingGlass,
  FloppyDisk,
  CaretDown,
  CaretRight,
  CheckCircle,
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

// ── Permission group labels ──────────────────────────────
const PERMISSION_GROUP_LABELS: Record<string, string> = {
  system: "Hệ thống",
  inventory: "Kho vật tư",
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
  { id: ROLES.COORDINATOR, label: "Điều phối viên", activeClass: "bg-blue-500 text-white border-blue-500", baseClass: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
  { id: ROLES.RESCUER,     label: "Cứu hộ viên",   activeClass: "bg-emerald-500 text-white border-emerald-500", baseClass: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  { id: ROLES.MANAGER,     label: "Quản lý kho",   activeClass: "bg-orange-500 text-white border-orange-500", baseClass: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100" },
  { id: ROLES.VICTIM,      label: "Công dân",       activeClass: "bg-violet-500 text-white border-violet-500", baseClass: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100" },
];

const UserPermissionPanel = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserEntity | null>(null);
  const [localCheckedIds, setLocalCheckedIds] = useState<Set<number> | null>(
    null,
  );
  const [prevUserId, setPrevUserId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(PERMISSION_GROUP_ORDER),
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  // ── Debounce search 400ms ────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Queries ──────────────────────────────────────────────
  const { data: allPermissions, isLoading: loadingAll } = useAllPermissions();
  const { data: usersForPermission, isLoading: loadingUsers } =
    useUsersForPermission({
      search: debouncedSearch,
      pageSize: 8,
      roleId: selectedRoleId ?? undefined,
    });
  const { data: userData, isLoading: loadingUserPerms } = useUserPermissions(
    selectedUser?.id ?? "",
  );
  const updateMutation = useUpdateUserPermissions(selectedUser?.id ?? "");

  // ── Reset local edits when user changes ─────────────────────
  const currentUserId = selectedUser?.id ?? null;
  if (currentUserId !== prevUserId) {
    setPrevUserId(currentUserId);
    setLocalCheckedIds(null);
    setHasChanges(false);
  }

  // ── Derive checked IDs: local edits or server data ───────
  const checkedIds =
    localCheckedIds ??
    new Set(userData?.permissions?.map((p) => p.id) ?? []);

  // ── Server-filtered user list ──────────────────────────
  const filteredUsers = usersForPermission?.items ?? [];

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
    setHasChanges(false);
  }, []);

  const handleClearUser = useCallback(() => {
    setSelectedUser(null);
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedRoleId(null);
    setLocalCheckedIds(null);
    setHasChanges(false);
  }, []);

  const handleToggle = useCallback(
    (permId: number) => {
      setLocalCheckedIds((prev) => {
        const base =
          prev ?? new Set(userData?.permissions?.map((p) => p.id) ?? []);
        const next = new Set(base);
        if (next.has(permId)) next.delete(permId);
        else next.add(permId);
        return next;
      });
      setHasChanges(true);
    },
    [userData],
  );

  const handleToggleGroup = useCallback(
    (groupPerms: PermissionEntity[]) => {
      setLocalCheckedIds((prev) => {
        const base =
          prev ?? new Set(userData?.permissions?.map((p) => p.id) ?? []);
        const next = new Set(base);
        const allChecked = groupPerms.every((p) => next.has(p.id));
        if (allChecked) {
          groupPerms.forEach((p) => next.delete(p.id));
        } else {
          groupPerms.forEach((p) => next.add(p.id));
        }
        return next;
      });
      setHasChanges(true);
    },
    [userData],
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
          setHasChanges(false);
          setLocalCheckedIds(null);
        },
        onError: () => {
          toast.dismiss();
          toast.error("Có lỗi xảy ra khi lưu quyền");
        },
      },
    );
  };

  const isLoading = loadingAll || loadingUserPerms;

  // ── Shared permission group list renderer ────────────────
  const renderPermissionGroups = (stopPropagation = false) => (
    <div className="grid grid-cols-2 gap-3">
      {PERMISSION_GROUP_ORDER.filter((d) => grouped[d]).map((domain) => {
        const groupPerms = grouped[domain];
        const isExpanded = expandedGroups.has(domain);
        const checkedCount = groupPerms.filter((p) => checkedIds.has(p.id)).length;
        const allGroupChecked = checkedCount === groupPerms.length;
        return (
          <Card
            key={domain}
            className={cn(
              "border-border/60 overflow-hidden transition-all duration-300",
              isExpanded ? "" : "self-start",
            )}
          >
            <button
              onClick={(e) => { if (stopPropagation) e.stopPropagation(); toggleGroupExpand(domain); }}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <CaretDown size={14} className="text-muted-foreground tracking-tighter" /> : <CaretRight size={14} className="text-muted-foreground tracking-tighter" />}
                <span className="text-sm font-bold uppercase tracking-tight">{PERMISSION_GROUP_LABELS[domain] ?? domain}</span>
                <Badge variant="secondary" className="text-xs tracking-tighter font-medium px-1.5 py-0">{checkedCount}/{groupPerms.length}</Badge>
              </div>
              {isExpanded && (
                <div
                  onClick={(e) => { e.stopPropagation(); handleToggleGroup(groupPerms); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground tracking-tighter cursor-pointer transition-colors"
                >
                  {allGroupChecked && <CheckCircle size={14} weight="fill" className="text-green-500" />}
                  <span>{allGroupChecked ? "Bỏ chọn" : "Chọn hết"}</span>
                </div>
              )}
            </button>
            {isExpanded && (
              <div className="border-t border-border/40">
                {groupPerms.map((perm, idx) => (
                  <label
                    key={perm.id}
                    onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
                    className={cn("flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors", idx < groupPerms.length - 1 && "border-b border-border/20")}
                  >
                    <Checkbox checked={checkedIds.has(perm.id)} onCheckedChange={() => handleToggle(perm.id)} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium tracking-tighter leading-tight">{perm.name}</p>
                      {perm.description && <p className="text-[12px] text-muted-foreground tracking-tighter mt-0.5 leading-tight">{perm.description}</p>}
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
          <span className="text-sm tracking-tighter text-muted-foreground font-medium shrink-0">Lọc theo vai trò:</span>
          {ROLE_FILTERS.map((role) => {
            const isActive = selectedRoleId === role.id;
            return (
              <button
                key={role.id}
                onClick={() => {
                  const next = isActive ? null : role.id;
                  setSelectedRoleId(next);
                  if (!isActive) {
                    setSelectedUser(null);
                    setLocalCheckedIds(null);
                    setHasChanges(false);
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
            onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="pl-9 h-9 text-sm border-border/60"
          />
          <MagnifyingGlass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
                <div className="p-4 text-center tracking-tighter text-sm text-muted-foreground">Không tìm thấy người dùng</div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onMouseDown={() => handleSelectUser(user)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left border-b border-border/20 last:border-0"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold tracking-tighter shrink-0">
                      {user.lastName?.[0]}{user.firstName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm tracking-tighter font-medium truncate">{user.lastName} {user.firstName}</p>
                      <p className="text-xs tracking-tighter text-muted-foreground truncate">@{user.username} · {user.phone}</p>
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
            <span className="font-medium tracking-tighter text-primary">{selectedUser.lastName} {selectedUser.firstName}</span>
            <button onClick={handleClearUser} className="text-primary/60 hover:text-primary">
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── User cards + permission panel (shown when role filter is active) ── */}
      {selectedRoleId !== null && (
        <div className="flex gap-5 items-start">
          {/* Left: user list — shrinks to 2 cols when a user is selected */}
          <div className={cn(
            "shrink-0 transition-all duration-500 ease-in-out",
            selectedUser ? "w-56" : "w-full",
          )}>
            {loadingUsers ? (
              <div className={cn("grid gap-2.5", selectedUser ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5")}>
                {Array.from({ length: selectedUser ? 4 : 10 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-xl border border-border/40 bg-card space-y-2">
                    <Skeleton className="h-10 w-10 rounded-full mx-auto" />
                    <Skeleton className="h-3.5 w-3/4 mx-auto" />
                    <Skeleton className="h-3 w-1/2 mx-auto" />
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UserIcon size={36} className="opacity-20 mb-2" />
                <p className="text-sm tracking-tighter">Không có người dùng trong nhóm này</p>
              </div>
            ) : (
              <div className={cn(
                "grid gap-2.5 transition-all duration-500",
                selectedUser ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
              )}>
                {filteredUsers.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => isSelected ? setSelectedUser(null) : handleSelectUser(user)}
                      className={cn(
                        "rounded-xl border bg-card text-center transition-all duration-300 group",
                        selectedUser ? "p-3" : "p-4",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                          : "border-border/50 hover:border-primary/40 hover:shadow-sm",
                      )}
                    >
                      <div className={cn(
                        "rounded-full flex items-center justify-center font-bold tracking-tighter mx-auto transition-all duration-300",
                        selectedUser ? "w-9 h-9 text-sm mb-1.5" : "w-12 h-12 text-base mb-2.5",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                      )}>
                        {user.lastName?.[0]}{user.firstName?.[0]}
                      </div>
                      <p className={cn(
                        "font-semibold tracking-tighter truncate transition-colors",
                        selectedUser ? "text-[14px]" : "text-sm",
                        isSelected && "text-primary",
                      )}>
                        {user.lastName} {user.firstName}
                      </p>
                      <p className={cn(
                        "text-muted-foreground tracking-tighter truncate",
                        selectedUser ? "text-[14px]" : "text-sm",
                      )}>
                        @{user.username}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: permission panel — slides in from right */}
          <div
            className="flex-1 min-w-0"
            style={{
              display: "grid",
              gridTemplateColumns: selectedUser ? "1fr" : "0fr",
              transition: "grid-template-columns 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <div className="overflow-hidden">
              {selectedUser && (
                <div className="space-y-3">
                  {/* Slim action bar */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground tracking-tighter">
                      Đã chọn <span className="font-semibold tracking-tighter text-foreground">{checkedIds.size}</span>/{allPermissions?.length ?? 0} quyền
                    </p>
                    <div className="flex items-center gap-2">
                      {hasChanges && (
                        <Button onClick={handleSave} disabled={updateMutation.isPending} size="sm" className="h-7 px-2.5 track text-xs gap-1">
                          <FloppyDisk size={13} weight="bold" />
                          {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                        </Button>
                      )}
                      <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-muted rounded-md transition-colors">
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Permission editor (user selected via search, no role filter) ── */}
      {selectedUser && selectedRoleId === null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs tracking-tighter text-muted-foreground">
              Đã chọn <span className="font-semibold tracking-tighter text-foreground">{checkedIds.size}</span>/{allPermissions?.length ?? 0} quyền
            </p>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Button onClick={handleSave} disabled={updateMutation.isPending} size="sm" className="h-7 px-2.5 text-xs gap-1">
                  <FloppyDisk size={13} weight="bold" />
                  {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              )}
              <button onClick={handleClearUser} className="p-1 hover:bg-muted rounded-md transition-colors">
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>
          </div>
          {isLoading ? (
            <PermissionSkeleton />
          ) : (
            renderPermissionGroups()
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {selectedRoleId === null && !selectedUser && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserIcon size={44} className="text-muted-foreground/20 mb-3" />
          <p className="text-base font-semibold tracking-tighter text-muted-foreground">Chọn vai trò để xem danh sách người dùng</p>
          <p className="text-sm tracking-tighter text-muted-foreground/60 mt-1">hoặc tìm kiếm theo tên, username ở trên</p>
        </div>
      )}
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
