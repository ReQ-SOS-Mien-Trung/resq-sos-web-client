"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  MinusCircle,
  Info,
} from "@phosphor-icons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_NAMES, RoleId } from "@/lib/roles";
import {
  useAllPermissions,
  useRolePermissions,
} from "@/services/permissions";
import { PermissionEntity } from "@/services/permissions/type";

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

// ── All viewable roles ────────────────────────────────────
const ALL_ROLES: { roleId: RoleId; label: string; short: string }[] = [
  { roleId: ROLES.ADMIN, label: ROLE_NAMES[ROLES.ADMIN], short: "QTV" },
  { roleId: ROLES.COORDINATOR, label: ROLE_NAMES[ROLES.COORDINATOR], short: "ĐPV" },
  { roleId: ROLES.RESCUER, label: ROLE_NAMES[ROLES.RESCUER], short: "CHV" },
  { roleId: ROLES.MANAGER, label: ROLE_NAMES[ROLES.MANAGER], short: "QLK" },
  { roleId: ROLES.VICTIM, label: ROLE_NAMES[ROLES.VICTIM], short: "Công dân" },
];

const RolePermissionPanel = () => {
  const [hoveredPerm, setHoveredPerm] = useState<number | null>(null);

  // ── Fetch all permissions ────────────────────────────────
  const { data: allPermissions, isLoading: loadingAll } = useAllPermissions();

  // ── Fetch permissions for every role in parallel ─────────
  const adminPerms = useRolePermissions(ROLES.ADMIN);
  const coordPerms = useRolePermissions(ROLES.COORDINATOR);
  const rescuerPerms = useRolePermissions(ROLES.RESCUER);
  const managerPerms = useRolePermissions(ROLES.MANAGER);
  const victimPerms = useRolePermissions(ROLES.VICTIM);

  const roleQueries = useMemo(
    () => ({
      [ROLES.ADMIN]: adminPerms,
      [ROLES.COORDINATOR]: coordPerms,
      [ROLES.RESCUER]: rescuerPerms,
      [ROLES.MANAGER]: managerPerms,
      [ROLES.VICTIM]: victimPerms,
    }),
    [adminPerms, coordPerms, rescuerPerms, managerPerms, victimPerms],
  );

  // ── Build lookup: roleId → Set<permId> ───────────────────
  const roleSets = useMemo(() => {
    const map: Record<number, Set<number>> = {};
    for (const { roleId } of ALL_ROLES) {
      const q = roleQueries[roleId];
      map[roleId] = new Set(
        q.data?.permissions?.map((p) => p.id) ?? [],
      );
    }
    return map;
  }, [roleQueries]);

  // ── Grouped permissions ──────────────────────────────────
  const grouped = useMemo(
    () => groupPermissions(allPermissions ?? []),
    [allPermissions],
  );

  const isLoading =
    loadingAll ||
    Object.values(roleQueries).some((q) => q.isLoading);

  // ── Summary stats per role ───────────────────────────────
  const totalPerms = allPermissions?.length ?? 0;

  if (isLoading) return <MatrixSkeleton />;

  return (
    <div className="space-y-5">
      {/* Role summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ALL_ROLES.map(({ roleId, label }) => {
          const count = roleSets[roleId]?.size ?? 0;
          const pct = totalPerms ? Math.round((count / totalPerms) * 100) : 0;
          return (
            <div
              key={roleId}
              className="rounded-xl border border-border/60 bg-card p-4 space-y-2"
            >
              <p className="text-sm font-semibold uppercase tracking-tight text-muted-foreground">
                {label}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tighter">
                  {count}
                </span>
                <span className="text-sm tracking-tighter text-muted-foreground">
                  / {totalPerms}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-5 text-sm tracking-tighter text-muted-foreground px-1">
        <div className="flex items-center gap-1.5">
          <CheckCircle size={16} weight="fill" className="text-green-500" />
          <span>Có quyền</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MinusCircle size={16} className="text-muted-foreground/30" />
          <span>Không có quyền</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-base bg-card">
            {/* Header */}
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left px-5 py-3.5 text-[16px] font-semibold tracking-tighter min-w-65">
                  Quyền hạn
                </th>
                {ALL_ROLES.map(({ roleId, label, short }) => (
                  <th
                    key={roleId}
                    className="px-4 py-3.5 text-center text-[16px] font-semibold tracking-tighter w-32 whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{short}</span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body: grouped by domain */}
            <tbody>
              {PERMISSION_GROUP_ORDER.filter((d) => grouped[d]).map(
                (domain) => {
                  const groupPerms = grouped[domain];
                  return (
                    <GroupRows
                      key={domain}
                      domain={domain}
                      permissions={groupPerms}
                      roleSets={roleSets}
                      hoveredPerm={hoveredPerm}
                      onHover={setHoveredPerm}
                    />
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </div>

      
    </div>
  );
};

// ── Group Rows sub-component ────────────────────────────────
function GroupRows({
  domain,
  permissions,
  roleSets,
  hoveredPerm,
  onHover,
}: {
  domain: string;
  permissions: PermissionEntity[];
  roleSets: Record<number, Set<number>>;
  hoveredPerm: number | null;
  onHover: (id: number | null) => void;
}) {
  return (
    <>
      {/* Group header row */}
      <tr className="bg-muted/20 border-t border-border/40">
        <td
          colSpan={ALL_ROLES.length + 1}
          className="px-5 py-3"
        >
          <span className="text-sm font-semibold uppercase tracking-tight text-muted-foreground">
            {PERMISSION_GROUP_LABELS[domain] ?? domain}
          </span>
          <Badge
            variant="success"
            className="ml-2 text-xs font-medium tracking-tighter rounded-4xl px-2 py-1.5"
          >
            {permissions.length}
          </Badge>
        </td>
      </tr>

      {/* Permission rows */}
      {permissions.map((perm, idx) => (
        <tr
          key={perm.id}
          onMouseEnter={() => onHover(perm.id)}
          onMouseLeave={() => onHover(null)}
          className={cn(
            "transition-colors duration-100",
            hoveredPerm === perm.id
              ? "bg-primary/5"
              : idx % 2 === 0
                ? "bg-card"
                : "bg-muted/20",
            idx < permissions.length - 1 && "border-b border-border/20",
          )}
        >
          {/* Permission info cell */}
          <td className="px-5 py-3">
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                {perm.code}
              </code>
              {perm.description && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="shrink-0 text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                      <Info size={15} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    className="w-72 text-sm p-4"
                  >
                    <p className="font-semibold tracking-tighter mb-1">{perm.name}</p>
                    <p className="text-muted-foreground tracking-tighter">{perm.description}</p>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <p className="text-sm font-medium tracking-tighter text-foreground/80 mt-1.5 truncate">
              {perm.name}
            </p>
          </td>

          {/* Role check cells */}
          {ALL_ROLES.map(({ roleId }) => {
            const has = roleSets[roleId]?.has(perm.id);
            return (
              <td key={roleId} className="px-4 py-3 text-center">
                {has ? (
                  <CheckCircle
                    size={22}
                    weight="fill"
                    className="inline-block text-emerald-500"
                  />
                ) : (
                  <MinusCircle
                    size={22}
                    className="inline-block text-muted-foreground/20"
                  />
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

// ── Loading skeleton ────────────────────────────────────────
function MatrixSkeleton() {
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-12" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="border-b bg-muted/30 px-4 py-3 flex gap-6">
          <Skeleton className="h-4 w-48" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="border-b last:border-0 px-4 py-3 flex gap-6 items-center"
          >
            <Skeleton className="h-4 w-48" />
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-5 w-5 rounded-full mx-auto" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RolePermissionPanel;
