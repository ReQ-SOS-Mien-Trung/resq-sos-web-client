"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Warehouse,
  Package,
  Truck,
  ClipboardText,
  Warning,
  MagnifyingGlass,
  ArrowLineDown,
  ArrowLineUp,
  Clock,
  CheckCircle,
  ArrowRight,
  ChartBar,
  ListBullets,
  Cube,
  ShieldWarning,
  ArrowFatLinesRight,
  BellRinging,
} from "@phosphor-icons/react";
import {
  DepotSidebarProps,
  InventoryItem,
  SupplyRequest,
} from "@/type";

// ── Main component ────────────────────────────────────────────────────────────
const DepotSidebar = ({
  depotInfo,
  inventoryItems,
  supplyRequests,
  onItemSelect,
  onRequestSelect,
  selectedItem,
  selectedRequest,
  selectedCategory,
  apiCategories,
  activeTab,
  onActiveTabChange,
}: DepotSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  // ── Derived data ─────────────────────────────────────────────────────────
  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory
      ? item.category === selectedCategory
      : true;
    return matchesSearch && matchesCategory;
  });

  const criticalItems = filteredItems.filter((i) => i.stockLevel === "CRITICAL");
  const lowStockItems = filteredItems.filter((i) => i.stockLevel === "LOW");
  const normalItems = filteredItems.filter(
    (i) => i.stockLevel === "NORMAL" || i.stockLevel === "OVERSTOCKED",
  );

  const pendingRequestsAll = supplyRequests.filter((r) => r.status === "PENDING");
  const inProgressRequestsAll = supplyRequests.filter((r) => r.status === "IN_TRANSIT");

  // "Tiếp nhận yêu cầu" dot — show when there are cards in that section
  // (Source role = all statuses, Requester+InTransit)
  const hasIncomingItems = supplyRequests.some(
    (r) => r.type === "OUTBOUND" || (r.type === "INBOUND" && r.status === "IN_TRANSIT"),
  );
  // "Theo dõi tiến trình" dot — show when any requests exist in the table
  const hasAnyRequests = supplyRequests.length > 0;

  const pendingRequests = [...pendingRequestsAll]
    .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
    .slice(0, 2);

  const inProgressRequests = [...inProgressRequestsAll]
    .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
    .slice(0, 2);

  const hasUrgent = criticalItems.length > 0 || lowStockItems.length > 0;
  const hasPendingReqs = pendingRequestsAll.length > 0;

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative px-4 pt-4 pb-3 border-b border-sidebar-border bg-sidebar shrink-0">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Warehouse className="h-4 w-4 text-primary" weight="fill" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold tracking-tighter text-sm leading-snug line-clamp-2">
              {depotInfo.name}
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-medium text-green-600 tracking-tight uppercase">
                Hệ thống hoạt động
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 shrink-0 border-b border-sidebar-border">
        <KpiCell
          value={depotInfo.criticalAlerts}
          label="Cảnh báo"
          valueClass="text-red-500"
          icon={<ShieldWarning className="h-3.5 w-3.5" weight="fill" />}
          iconClass="text-red-400"
          pulse={depotInfo.criticalAlerts > 0}
        />
        <KpiCell
          value={depotInfo.lowStockAlerts}
          label="Sắp hết"
          valueClass="text-orange-500"
          icon={<Warning className="h-3.5 w-3.5" weight="fill" />}
          iconClass="text-orange-400"
          border
        />
        <KpiCell
          value={depotInfo.pendingRequests}
          label="Chờ duyệt"
          valueClass="text-blue-500"
          icon={<Clock className="h-3.5 w-3.5" />}
          iconClass="text-blue-400"
          border
          pulse={depotInfo.pendingRequests > 0}
        />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={onActiveTabChange}
        className="flex-1 flex flex-col overflow-hidden min-h-0"
      >
        <TabsList className="w-full mt-2 flex flex-col h-auto bg-transparent p-0 px-3 rounded-none shrink-0 gap-0">
          <TabTriggerWithDot value="inventory" dot={hasUrgent} label="Kho hàng" icon={<ChartBar className="h-4 w-4" />} />
          <TabTriggerWithDot value="vattu" dot={false} label="Vật tư" icon={<Cube className="h-4 w-4" />} />
          <TabTriggerWithDot value="requests" dot={hasPendingReqs} label="Tạo yêu cầu" icon={<ClipboardText className="h-4 w-4" />} />
          <TabTriggerWithDot value="incoming" dot={hasIncomingItems} label="Tiếp nhận yêu cầu" icon={<BellRinging className="h-4 w-4" />} />
          <TabTriggerWithDot value="shipments" dot={hasAnyRequests} label="Theo dõi tiến trình" icon={<Truck className="h-4 w-4" />} />
        </TabsList>

        {/* ── Inventory Tab ─────────────────────────────────────────────── */}
        <TabsContent value="inventory" className="flex-1 overflow-hidden m-0 flex flex-col min-h-0">
          <div className="px-3 pt-2 pb-2 shrink-0">
            <div className="relative">
              <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm hàng hóa..."
                className="pl-8 h-8 text-xs bg-muted/30 border-border/50 focus-visible:ring-primary/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-3 pb-4 space-y-4">
              {(criticalItems.length > 0 || lowStockItems.length > 0) && (
                <div>
                  <SectionHeader
                    label={`Cần bổ sung (${criticalItems.length + lowStockItems.length})`}
                    color="text-red-500"
                    icon={<ShieldWarning className="h-3 w-3" weight="fill" />}
                  />
                  <div className="space-y-1.5 mt-2">
                    {[...criticalItems, ...lowStockItems].map((item) => (
                      <InventoryItemRow
                        key={item.id}
                        item={item}
                        isSelected={selectedItem?.id === item.id}
                        onClick={() => onItemSelect(item)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {normalItems.length > 0 && (
                <div>
                  <SectionHeader
                    label={`Bình thường (${normalItems.length})`}
                    color="text-muted-foreground"
                    icon={<CheckCircle className="h-3 w-3" weight="fill" />}
                  />
                  <div className="space-y-1.5 mt-2">
                    {normalItems.map((item) => (
                      <InventoryItemRow
                        key={item.id}
                        item={item}
                        isSelected={selectedItem?.id === item.id}
                        onClick={() => onItemSelect(item)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredItems.length === 0 && (
                <EmptyState icon={<Package className="h-7 w-7" />} label="Không tìm thấy hàng hóa" />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Requests Tab ──────────────────────────────────────────────── */}
        <TabsContent value="requests" className="flex-1 overflow-hidden m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="px-3 py-3 space-y-4">
              {pendingRequests.length > 0 && (
                <div>
                  <SectionHeader
                    label={`Chờ phê duyệt (${pendingRequestsAll.length})`}
                    color="text-amber-600"
                    icon={<Clock className="h-3 w-3" />}
                  />
                  <div className="space-y-1.5 mt-2">
                    {pendingRequests.map((req) => (
                      <RequestRow
                        key={req.id}
                        request={req}
                        isSelected={selectedRequest?.id === req.id}
                        onClick={() => onRequestSelect(req)}
                        accentColor="amber"
                      />
                    ))}
                  </div>
                </div>
              )}

              {inProgressRequests.length > 0 && (
                <div>
                  <SectionHeader
                    label={`Đang chi viện đến (${inProgressRequestsAll.length})`}
                    color="text-blue-600"
                    icon={<Truck className="h-3 w-3" weight="fill" />}
                  />
                  <div className="space-y-1.5 mt-2">
                    {inProgressRequests.map((req) => (
                      <RequestRow
                        key={req.id}
                        request={req}
                        isSelected={selectedRequest?.id === req.id}
                        onClick={() => onRequestSelect(req)}
                        accentColor="blue"
                      />
                    ))}
                  </div>
                </div>
              )}

              {supplyRequests.length === 0 && (
                <EmptyState icon={<ClipboardText className="h-7 w-7" />} label="Không có yêu cầu nào" />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Shipments / Theo dõi Tab ───────────────────────────────────── */}
        <TabsContent value="shipments" className="flex-1 m-0 min-h-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ListBullets className="h-6 w-6 text-primary" weight="fill" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tighter">Bảng theo dõi tiến trình</p>
              <p className="text-xs text-muted-foreground tracking-tighter mt-1 leading-relaxed">
                Toàn bộ yêu cầu tiếp tế đang hiển thị tại khu vực bên phải
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary tracking-wide uppercase mt-1">
              <ArrowFatLinesRight className="h-3.5 w-3.5" weight="fill" />
              Xem bảng bên phải
            </div>
          </div>
        </TabsContent>

        {/* ── Vattu Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="vattu" className="flex-1 m-0 min-h-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-muted/60 border flex items-center justify-center">
              <Cube className="h-6 w-6 text-muted-foreground" weight="fill" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tighter">Chi tiết vật tư</p>
              <p className="text-xs text-muted-foreground tracking-tighter mt-1 leading-relaxed">
                Thông tin vật tư đang hiển thị tại khu vực bên phải
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground tracking-wide uppercase mt-1">
              <ArrowFatLinesRight className="h-3.5 w-3.5" />
              Xem chi tiết bên phải
            </div>
          </div>
        </TabsContent>

        {/* ── Incoming Tab ──────────────────────────────────────────────── */}
        <TabsContent value="incoming" className="flex-1 m-0 min-h-0 flex flex-col items-center justify-center p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BellRinging className="h-6 w-6 text-primary" weight="fill" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tighter">Tiếp nhận yêu cầu</p>
              <p className="text-xs text-muted-foreground tracking-tighter mt-1 leading-relaxed">
                Trang quản lý và xử lý yêu cầu đang hiển thị bên phải
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary tracking-wide uppercase mt-1">
              <ArrowFatLinesRight className="h-3.5 w-3.5" weight="fill" />
              Xem trang bên phải
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DepotSidebar;

// ── Sub-components ─────────────────────────────────────────────────────────────

function KpiCell({
  value,
  label,
  valueClass,
  icon,
  iconClass,
  border,
  pulse,
}: {
  value: number;
  label: string;
  valueClass: string;
  icon: React.ReactNode;
  iconClass: string;
  border?: boolean;
  pulse?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center py-3 gap-0.5 relative", border && "border-l border-border/50")}>
      <div className={cn("flex items-center gap-1", iconClass)}>
        {icon}
        {pulse && value > 0 && (
          <span className="relative flex h-1.5 w-1.5 ml-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
          </span>
        )}
      </div>
      <span className={cn("text-xl tracking-tighter font-bold leading-tight tabular-nums", valueClass)}>
        {value}
      </span>
      <span className="text-[12px] tracking-tighter font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

function TabTriggerWithDot({
  value,
  label,
  icon,
  dot,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  dot: boolean;
}) {
  return (
    <TabsTrigger
      value={value}
      className="relative w-full flex flex-row items-center gap-3 px-3 py-2.5 text-sm font-medium tracking-tighter text-left justify-start rounded-none
        text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground hover:translate-x-1 transition-all duration-200
        data-[state=active]:bg-linear-to-r data-[state=active]:from-red-500/10 data-[state=active]:to-orange-500/10
        data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400
        data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-red-500/10
        data-[state=inactive]:border data-[state=inactive]:border-transparent
        leading-none shadow-none"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1">{label}</span>
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
        </span>
      )}
    </TabsTrigger>
  );
}

function SectionHeader({
  label,
  color,
  icon,
}: {
  label: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest", color)}>
      {icon}
      <span>{label}</span>
      <div className="flex-1 h-px bg-current opacity-20 ml-1" />
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50 gap-2">
      <div className="opacity-40">{icon}</div>
      <p className="text-xs tracking-tighter">{label}</p>
    </div>
  );
}

function InventoryItemRow({
  item,
  isSelected,
  onClick,
}: {
  item: InventoryItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const pct = Math.min((item.quantity / item.maxStock) * 100, 100);
  const barColor =
    item.stockLevel === "CRITICAL"
      ? "bg-red-500"
      : item.stockLevel === "LOW"
        ? "bg-orange-400"
        : item.stockLevel === "OVERSTOCKED"
          ? "bg-blue-500"
          : "bg-green-500";

  const borderColor =
    item.stockLevel === "CRITICAL"
      ? "border-l-red-500"
      : item.stockLevel === "LOW"
        ? "border-l-orange-400"
        : "border-l-transparent";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border bg-card px-3 py-2.5 transition-all hover:bg-muted/50 hover:shadow-sm border-l-2 group",
        borderColor,
        isSelected && "ring-1 ring-primary bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-tighter truncate flex-1">{item.name}</p>
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
            item.stockLevel === "CRITICAL"
              ? "bg-red-100 text-red-600"
              : item.stockLevel === "LOW"
                ? "bg-orange-100 text-orange-600"
                : "bg-green-100 text-green-600",
          )}
        >
          {item.quantity}
          <span className="font-normal opacity-70"> {item.unit}</span>
        </span>
      </div>
      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 tracking-tighter">
        {item.sku} · {item.location}
      </p>
    </button>
  );
}

function RequestRow({
  request,
  isSelected,
  onClick,
  accentColor,
}: {
  request: SupplyRequest;
  isSelected: boolean;
  onClick: () => void;
  accentColor: "amber" | "blue";
}) {
  const isInbound = request.type === "INBOUND";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border bg-card px-3 py-2.5 transition-all hover:bg-muted/50 hover:shadow-sm border-l-2 group",
        accentColor === "amber" ? "border-l-amber-400" : "border-l-blue-400",
        isSelected && "ring-1 ring-primary bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isInbound ? (
            <ArrowLineDown className="h-3.5 w-3.5 text-green-500 shrink-0" weight="bold" />
          ) : (
            <ArrowLineUp className="h-3.5 w-3.5 text-blue-500 shrink-0" weight="bold" />
          )}
          <p className="text-xs font-semibold tracking-tighter truncate">
            {isInbound ? "Nhập kho" : "Xuất kho"}
          </p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
      <p className="text-[11px] text-muted-foreground truncate mt-1 tracking-tighter">
        {request.requestedBy}
      </p>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-muted-foreground">{request.items.length} mặt hàng</span>
        {request.notes && (
          <span className="text-[10px] text-muted-foreground truncate max-w-24">
            {request.notes.substring(0, 20)}…
          </span>
        )}
      </div>
    </button>
  );
}
