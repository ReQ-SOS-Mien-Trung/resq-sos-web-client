"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  MinusCircle,
  Info,
  CaretRight,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ROLES, ROLE_NAMES, RoleId } from "@/lib/roles";
import { useAllPermissions, useRolePermissions } from "@/services/permissions";
import { PermissionEntity } from "@/services/permissions/type";

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
const ALL_ROLES: {
  roleId: RoleId;
  label: string;
  short: string;
  tone: string;
  badgeTone: string;
}[] = [
    {
      roleId: ROLES.ADMIN,
      label: ROLE_NAMES[ROLES.ADMIN],
      short: "QTV",
      tone: "bg-rose-500",
      badgeTone: "border-rose-200 bg-rose-50 text-rose-700",
    },
    {
      roleId: ROLES.COORDINATOR,
      label: ROLE_NAMES[ROLES.COORDINATOR],
      short: "ĐPV",
      tone: "bg-blue-500",
      badgeTone: "border-blue-200 bg-blue-50 text-blue-700",
    },
    {
      roleId: ROLES.RESCUER,
      label: ROLE_NAMES[ROLES.RESCUER],
      short: "CHV",
      tone: "bg-emerald-500",
      badgeTone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    {
      roleId: ROLES.MANAGER,
      label: ROLE_NAMES[ROLES.MANAGER],
      short: "QLK",
      tone: "bg-amber-500",
      badgeTone: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      roleId: ROLES.VICTIM,
      label: ROLE_NAMES[ROLES.VICTIM],
      short: "Công dân",
      tone: "bg-violet-500",
      badgeTone: "border-violet-200 bg-violet-50 text-violet-700",
    },
  ];

const RolePermissionPanel = () => {
  const [hoveredPerm, setHoveredPerm] = useState<number | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    () => new Set(),
  );

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
      map[roleId] = new Set(q.data?.permissions?.map((p) => p.id) ?? []);
    }
    return map;
  }, [roleQueries]);

  // ── Grouped permissions ──────────────────────────────────
  const grouped = useMemo(
    () => groupPermissions(allPermissions ?? []),
    [allPermissions],
  );

  const isLoading =
    loadingAll || Object.values(roleQueries).some((q) => q.isLoading);

  // ── Summary stats per role ───────────────────────────────
  const totalPerms = allPermissions?.length ?? 0;

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) {
        next.delete(domain);
      } else {
        next.add(domain);
      }
      return next;
    });
  };

  if (isLoading) return <MatrixSkeleton />;

  return (
    <div className="space-y-6">
      {/* Role summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {ALL_ROLES.map(({ roleId, label, badgeTone, tone }) => {
          const count = roleSets[roleId]?.size ?? 0;
          const pct = totalPerms ? Math.round((count / totalPerms) * 100) : 0;
          return (
            <div
              key={roleId}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold tracking-tighter text-foreground/80">
                    {label}
                  </p>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold tracking-tighter text-foreground/80">
                      {count}
                    </span>
                    <span className="pb-1 text-sm tracking-tighter text-foreground/80">
                      / {totalPerms}
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold tracking-tighter",
                    badgeTone,
                  )}
                >
                  {pct}%
                </Badge>
              </div>
              <div className="mt-4 h-2 rounded-full bg-muted/80 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    tone,
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Matrix Table */}
      <div className="rounded-2xl border border-border/60 overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-base bg-card">
            {/* Header */}
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th className="text-left px-6 py-4 text-[16px] font-semibold tracking-tighter min-w-[360px]">
                  <div className="flex items-center gap-2">
                    <span>Quyền hạn</span>
                    <LegendTooltip />
                  </div>
                </th>
                {ALL_ROLES.map(({ roleId, label, short, badgeTone }) => (
                  <th
                    key={roleId}
                    className="px-4 py-4 text-center text-[15px] font-semibold tracking-tighter w-[132px] whitespace-nowrap"
                  >
                    <span
                      className={cn(
                        "hidden rounded-full border px-3 py-1.5 text-sm font-semibold tracking-tighter sm:inline-flex",
                        badgeTone,
                      )}
                    >
                      {label}
                    </span>
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
                      isExpanded={expandedDomains.has(domain)}
                      onToggle={() => toggleDomain(domain)}
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
  isExpanded,
  onToggle,
}: {
  domain: string;
  permissions: PermissionEntity[];
  roleSets: Record<number, Set<number>>;
  hoveredPerm: number | null;
  onHover: (id: number | null) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {/* Group header row */}
      <tr className="bg-muted/20 border-t border-border/40">
        <td colSpan={ALL_ROLES.length + 1} className="px-6 py-3.5">
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-2.5">
              <motion.span
                className="text-muted-foreground"
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <CaretRight size={16} />
              </motion.span>
              <span className="text-base font-semibold tracking-tighter">
                {PERMISSION_GROUP_LABELS[domain] ?? domain}
              </span>
              <Badge
                variant="secondary"
                className="rounded-full px-2.5 py-1 text-sm font-semibold tracking-tighter"
              >
                {permissions.length} quyền
              </Badge>
            </div>
            <span className="text-sm tracking-tighter text-muted-foreground">
              {isExpanded ? "Thu gọn" : "Xem chi tiết"}
            </span>
          </button>
        </td>
      </tr>

      {/* Permission rows */}
      <AnimatePresence initial={false}>
        {isExpanded &&
          permissions.map((perm, idx) => (
            <motion.tr
              key={perm.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{
                duration: 0.18,
                ease: "easeOut",
                delay: idx * 0.02,
              }}
              onMouseEnter={() => onHover(perm.id)}
              onMouseLeave={() => onHover(null)}
              className={cn(
                "transition-colors duration-150",
                hoveredPerm === perm.id
                  ? "bg-primary/5"
                  : idx % 2 === 0
                    ? "bg-card"
                    : "bg-muted/[0.18]",
                idx < permissions.length - 1 && "border-b border-border/20",
              )}
            >
              {/* Permission info cell */}
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <code className="shrink-0 rounded-md bg-muted px-2 py-1 text-sm font-semibold tracking-tighter text-muted-foreground">
                    {perm.code}
                  </code>
                  {perm.description && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="shrink-0 text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                          <Info size={15} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="w-60 text-sm p-2">
                        <p className="font-semibold tracking-tighter mb-1">
                          {perm.name}
                        </p>
                        <p className="text-muted-foreground tracking-tighter">
                          {perm.description}
                        </p>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-semibold tracking-tighter text-foreground">
                  {perm.name}
                </p>
              </td>

              {/* Role check cells */}
              {ALL_ROLES.map(({ roleId }) => {
                const has = roleSets[roleId]?.has(perm.id);
                return (
                  <td key={roleId} className="px-4 py-4 text-center align-middle">
                    {has ? (
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 shadow-sm">
                        <CheckCircle
                          size={22}
                          weight="fill"
                          className="text-emerald-500"
                        />
                      </span>
                    ) : (
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/30">
                        <MinusCircle
                          size={22}
                          className="text-muted-foreground/30"
                        />
                      </span>
                    )}
                  </td>
                );
              })}
            </motion.tr>
          ))}
      </AnimatePresence>
    </>
  );
}

// ── Hover-based Popover for Legend ─────────────────────────
function LegendTooltip() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          aria-label="Giải thích ma trận quyền theo vai trò"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-blue-500 transition-colors hover:text-blue-600"
        >
          <WarningCircle size={16} weight="fill" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="center"
        sideOffset={12}
        className="max-w-[200px] p-3 shadow-lg z-[100] pointer-events-none"
      >
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm tracking-tighter text-foreground">
            <CheckCircle
              size={16}
              weight="fill"
              className="text-emerald-500"
            />
            <span>Có quyền</span>
          </div>
          <div className="flex items-center gap-2 text-sm tracking-tighter text-foreground">
            <MinusCircle
              size={16}
              className="text-muted-foreground/40"
            />
            <span>Không có quyền</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Loading skeleton ────────────────────────────────────────
function MatrixSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5 space-y-3 shadow-sm">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border overflow-hidden bg-card shadow-sm">
        <div className="border-b bg-muted/30 px-6 py-4 flex gap-6">
          <Skeleton className="h-4 w-48" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="border-b last:border-0 px-6 py-4 flex gap-6 items-center"
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
