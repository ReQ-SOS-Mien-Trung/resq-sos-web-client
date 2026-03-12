"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Warehouse,
  Package,
  Truck,
  ClipboardText,
  Warning,
  MagnifyingGlass,
  Stethoscope,
  ForkKnife,
  Drop,
  Wrench,
  Tent,
  TShirt,
  ArrowLineDown,
  ArrowLineUp,
  Clock,
  CheckCircle,
  XCircle,
  CaretRight,
} from "@phosphor-icons/react";
import { getStockLevelBadgeVariant } from "@/lib/mock-data";
import {
  DepotSidebarProps,
  InventoryItem,
  Shipment,
  SupplyRequest,
} from "@/type";

// Category icon mapping (fallback for legacy keys + API codes)
const categoryIcons: Record<string, React.ReactNode> = {
  // Legacy UPPER_CASE keys (used by mock InventoryItem.category)
  MEDICAL: <Stethoscope className="h-4 w-4" weight="fill" />,
  FOOD: <ForkKnife className="h-4 w-4" weight="fill" />,
  WATER: <Drop className="h-4 w-4" weight="fill" />,
  EQUIPMENT: <Wrench className="h-4 w-4" weight="fill" />,
  SHELTER: <Tent className="h-4 w-4" weight="fill" />,
  CLOTHING: <TShirt className="h-4 w-4" weight="fill" />,
  // API code keys (from ItemCategoryEntity.code)
  Food: <ForkKnife className="h-4 w-4" weight="fill" />,
  Water: <Drop className="h-4 w-4" weight="fill" />,
  Medical: <Stethoscope className="h-4 w-4" weight="fill" />,
  Hygiene: <Drop className="h-4 w-4" />,
  Shelter: <Tent className="h-4 w-4" weight="fill" />,
  Clothing: <TShirt className="h-4 w-4" weight="fill" />,
  RescueEquipment: <Wrench className="h-4 w-4" weight="fill" />,
  Others: <Package className="h-4 w-4" />,
};

const stockLevelNames: Record<string, string> = {
  CRITICAL: "Cực Kỳ Thiếu",
  LOW: "Sắp Hết",
  NORMAL: "Bình Thường",
  OVERSTOCKED: "Dư Thừa",
};

const DepotSidebar = ({
  depotInfo,
  inventoryItems,
  supplyRequests,
  shipments,
  onItemSelect,
  onRequestSelect,
  onShipmentSelect,
  selectedItem,
  selectedRequest,
  selectedCategory,
  onCategorySelect,
  apiCategories,
  activeTab,
  onActiveTabChange,
}: DepotSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter items
  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory
      ? item.category === selectedCategory
      : true;
    return matchesSearch && matchesCategory;
  });

  // Categorize items
  const criticalItems = filteredItems.filter(
    (item) => item.stockLevel === "CRITICAL",
  );
  const lowStockItems = filteredItems.filter(
    (item) => item.stockLevel === "LOW",
  );
  const normalItems = filteredItems.filter(
    (item) => item.stockLevel === "NORMAL" || item.stockLevel === "OVERSTOCKED",
  );

  // Filter requests
  const pendingRequests = supplyRequests.filter(
    (req) => req.status === "PENDING",
  );
  const inProgressRequests = supplyRequests.filter(
    (req) => req.status === "APPROVED" || req.status === "IN_TRANSIT",
  );

  // Filter shipments
  const activeShipments = shipments.filter(
    (ship) => ship.status === "PREPARING" || ship.status === "IN_TRANSIT",
  );

  return (
    <div className="h-full flex flex-col bg-background border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-regular tracking-tighter text-lg flex items-center gap-2">
          <Warehouse className="h-5 w-5 text-primary" />
          {depotInfo.name}
        </h2>
       
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b bg-muted/30">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-500">
            {depotInfo.criticalAlerts}
          </div>
          <div className="text-xs text-muted-foreground">Cảnh báo</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">
            {depotInfo.lowStockAlerts}
          </div>
          <div className="text-xs text-muted-foreground">Sắp hết</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">
            {depotInfo.pendingRequests}
          </div>
          <div className="text-xs text-muted-foreground">Chờ duyệt</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={onActiveTabChange}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="mx-3 mt-3 grid grid-cols-2 h-auto gap-1 bg-muted/50 p-1 w-[calc(100%-24px)] shrink-0">
          <TabsTrigger value="inventory" className="text-xs py-1.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Kho
          </TabsTrigger>
          <TabsTrigger value="requests" className="text-xs py-1.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Yêu cầu
          </TabsTrigger>
          <TabsTrigger value="shipments" className="text-xs py-1.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Vận chuyển
          </TabsTrigger>
          <TabsTrigger value="vattu" className="text-xs py-1.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Vật tư
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent
          value="inventory"
          className="flex-1 overflow-hidden m-0 mt-3"
        >
          {/* Search */}
          <div className="px-3 pb-3">
            <div className="relative">
              <MagnifyingGlass className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm hàng hóa..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="px-3 pb-3 flex gap-1 flex-wrap">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => onCategorySelect?.(null)}
            >
              Tất cả
            </Badge>
            {apiCategories && apiCategories.length > 0
              ? apiCategories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={
                    selectedCategory === cat.code ? "default" : "outline"
                  }
                  className="cursor-pointer text-xs"
                  onClick={() => onCategorySelect?.(cat.code)}
                >
                  {categoryIcons[cat.code] ?? <Package className="h-4 w-4" />}
                  <span className="ml-1">{cat.name}</span>
                </Badge>
              ))
              : null}
          </div>

          <ScrollArea className="flex-1 h-full">
            <div className="p-3 space-y-3">
              {/* Critical Items */}
              {criticalItems.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Warning className="h-3 w-3" weight="fill" />
                    Cần Bổ Sung Gấp ({criticalItems.length})
                  </div>
                  {criticalItems.map((item) => (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onClick={() => onItemSelect(item)}
                    />
                  ))}
                </>
              )}

              {/* Low Stock Items */}
              {lowStockItems.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-2 mt-4">
                    Sắp Hết Hàng ({lowStockItems.length})
                  </div>
                  {lowStockItems.map((item) => (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onClick={() => onItemSelect(item)}
                    />
                  ))}
                </>
              )}

              {/* Normal Items */}
              {normalItems.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">
                    Đủ Hàng ({normalItems.length})
                  </div>
                  {normalItems.map((item) => (
                    <InventoryItemCard
                      key={item.id}
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onClick={() => onItemSelect(item)}
                    />
                  ))}
                </>
              )}

              {filteredItems.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Không tìm thấy hàng hóa</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent
          value="requests"
          className="flex-1 overflow-hidden m-0 mt-3"
        >
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Chờ Phê Duyệt ({pendingRequests.length})
                  </div>
                  {pendingRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      isSelected={selectedRequest?.id === request.id}
                      onClick={() => onRequestSelect(request)}
                    />
                  ))}
                </>
              )}

              {/* In Progress Requests */}
              {inProgressRequests.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2 mt-4">
                    Đang Xử Lý ({inProgressRequests.length})
                  </div>
                  {inProgressRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      isSelected={selectedRequest?.id === request.id}
                      onClick={() => onRequestSelect(request)}
                    />
                  ))}
                </>
              )}

              {supplyRequests.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <ClipboardText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Không có yêu cầu nào</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Shipments Tab */}
        <TabsContent
          value="shipments"
          className="flex-1 overflow-hidden m-0 mt-3"
        >
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {activeShipments.length > 0 ? (
                <>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Đang Vận Chuyển ({activeShipments.length})
                  </div>
                  {activeShipments.map((shipment) => (
                    <ShipmentCard
                      key={shipment.id}
                      shipment={shipment}
                      onClick={() => onShipmentSelect(shipment)}
                    />
                  ))}
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Không có vận chuyển đang thực hiện</p>
                </div>
              )}

              {/* Completed shipments */}
              {shipments.filter((s) => s.status === "DELIVERED").length > 0 && (
                <>
                  <div className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-2 mt-4 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" weight="fill" />
                    Đã Hoàn Thành
                  </div>
                  {shipments
                    .filter((s) => s.status === "DELIVERED")
                    .map((shipment) => (
                      <ShipmentCard
                        key={shipment.id}
                        shipment={shipment}
                        onClick={() => onShipmentSelect(shipment)}
                      />
                    ))}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Empty Content for Vattu (forces sidebar to be empty below tabs when vat tu is active) */}
        <TabsContent value="vattu" className="flex-1 m-0 mt-3 p-4 text-center text-sm text-muted-foreground font-medium">
          Chi tiết vật tư hiển thị ở bên phải
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DepotSidebar;

// Inventory Item Card Component
function InventoryItemCard({
  item,
  isSelected,
  onClick,
}: {
  item: InventoryItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const stockPercentage = Math.min((item.quantity / item.maxStock) * 100, 100);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        item.stockLevel === "CRITICAL" && "border-l-4 border-l-red-500",
        item.stockLevel === "LOW" && "border-l-4 border-l-orange-500",
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-md bg-muted">
              {categoryIcons[item.category]}
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-sm truncate">{item.name}</h4>
              <p className="text-xs text-muted-foreground">
                {item.sku} • {item.location}
              </p>
            </div>
          </div>
          <Badge
            variant={getStockLevelBadgeVariant(item.stockLevel)}
            className="shrink-0 text-xs"
          >
            {stockLevelNames[item.stockLevel]}
          </Badge>
        </div>

        {/* Stock Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Tồn kho</span>
            <span className="font-medium">
              {item.quantity} / {item.maxStock} {item.unit}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                item.stockLevel === "CRITICAL" && "bg-red-500",
                item.stockLevel === "LOW" && "bg-orange-500",
                item.stockLevel === "NORMAL" && "bg-green-500",
                item.stockLevel === "OVERSTOCKED" && "bg-blue-500",
              )}
              style={{ width: `${stockPercentage}%` }}
            />
          </div>
          {item.quantity < item.minStock && (
            <p className="text-xs text-red-500 mt-1">
              Cần bổ sung: {item.minStock - item.quantity} {item.unit}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Request Card Component
function RequestCard({
  request,
  isSelected,
  onClick,
}: {
  request: SupplyRequest;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusConfig: Record<
    string,
    {
      label: string;
      variant: "default" | "warning" | "info" | "success" | "destructive";
    }
  > = {
    PENDING: { label: "Chờ duyệt", variant: "warning" },
    APPROVED: { label: "Đã duyệt", variant: "info" },
    IN_TRANSIT: { label: "Đang giao", variant: "info" },
    DELIVERED: { label: "Hoàn thành", variant: "success" },
    CANCELLED: { label: "Đã hủy", variant: "destructive" },
  };

  const priorityConfig: Record<string, { label: string; color: string }> = {
    HIGH: { label: "Cao", color: "text-red-500" },
    MEDIUM: { label: "TB", color: "text-orange-500" },
    LOW: { label: "Thấp", color: "text-green-500" },
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        request.priority === "HIGH" && "border-l-4 border-l-red-500",
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {request.type === "INBOUND" ? (
              <ArrowLineDown className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowLineUp className="h-4 w-4 text-blue-500" />
            )}
            <div>
              <h4 className="font-medium text-sm">
                {request.type === "INBOUND" ? "Nhập kho" : "Xuất kho"}
              </h4>
              <p className="text-xs text-muted-foreground">{request.id}</p>
            </div>
          </div>
          <Badge
            variant={statusConfig[request.status].variant}
            className="text-xs"
          >
            {statusConfig[request.status].label}
          </Badge>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          <p className="truncate">{request.requestedBy}</p>
          <p className="flex items-center gap-1 mt-1">
            <span className={priorityConfig[request.priority].color}>
              ● {priorityConfig[request.priority].label}
            </span>
            <span>• {request.items.length} mặt hàng</span>
          </p>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {request.notes ? request.notes.substring(0, 30) + "..." : ""}
          </span>
          <CaretRight className="h-4 w-4 text-muted-foreground" weight="bold" />
        </div>
      </CardContent>
    </Card>
  );
}

// Shipment Card Component
function ShipmentCard({
  shipment,
  onClick,
}: {
  shipment: Shipment;
  onClick: () => void;
}) {
  const statusConfig: Record<
    string,
    { label: string; icon: React.ReactNode; color: string }
  > = {
    PREPARING: {
      label: "Đang chuẩn bị",
      icon: <Package className="h-3 w-3" />,
      color: "text-yellow-500",
    },
    IN_TRANSIT: {
      label: "Đang vận chuyển",
      icon: <Truck className="h-3 w-3" />,
      color: "text-blue-500",
    },
    DELIVERED: {
      label: "Đã giao",
      icon: <CheckCircle className="h-3 w-3" weight="fill" />,
      color: "text-green-500",
    },
    RETURNED: {
      label: "Đã trả",
      icon: <XCircle className="h-3 w-3" weight="fill" />,
      color: "text-red-500",
    },
  };

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            <div>
              <h4 className="font-medium text-sm">{shipment.id}</h4>
              <p className="text-xs text-muted-foreground">
                {shipment.carrier}
              </p>
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              statusConfig[shipment.status].color,
            )}
          >
            {statusConfig[shipment.status].icon}
            {statusConfig[shipment.status].label}
          </div>
        </div>

        <div className="mt-2 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="font-medium">Từ:</span> {shipment.origin}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="font-medium">Đến:</span> {shipment.destination}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {shipment.items.length} mặt hàng
          </span>
          <CaretRight className="h-4 w-4 text-muted-foreground" weight="bold" />
        </div>
      </CardContent>
    </Card>
  );
}
