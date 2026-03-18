"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  Trash,
  MagnifyingGlass,
  Warehouse,
  MapPin,
  Package,
  CheckCircle,
  ShoppingCartSimple,
  PaperPlaneTilt,
  ClipboardTextIcon,
} from "@phosphor-icons/react";
import {
  useInventoryCategories,
  useCreateSupplyRequests,
  useInventoryReliefItemsByCategory,
  useSearchDepotsByReliefItems,
} from "@/services/inventory";
import {
  SearchDepotsParams,
  SearchDepotItemEntity,
  SearchDepotWarehouseEntity,
} from "@/services/inventory/type";
import { toast } from "sonner";

type RequestLine = {
  id: string;
  categoryCode: string;
  reliefItemKey: string;
  quantity: string;
};

type SelectedDepotByItem = {
  itemModelId: number;
  itemModelName: string;
  unit: string;
  requestQuantity: number;
  depotId: number;
  depotName: string;
  depotAddress: string;
  depotStatus: string;
  availableQuantity: number;
  distanceKm: number;
};

interface SupplyRequestSectionProps {
  onSelectionSidebarOpen?: () => void;
  onSelectionSidebarChange?: (open: boolean) => void;
  onPanelWidthChange?: (width: number) => void;
}

type FlyToken = {
  id: string;
  text: string;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  active: boolean;
};

const DEPOT_STATUS_LABELS: Record<string, string> = {
  Available: "Có sẵn",
  Full: "Đầy kho",
  PendingAssignment: "Chờ phân công",
  Closed: "Đóng cửa",
};

function RequestLineRow({
  line,
  categories,
  isCategoriesLoading,
  canRemove,
  onChange,
  onRemove,
}: {
  line: RequestLine;
  categories: Array<{ key: string; value: string }>;
  isCategoriesLoading: boolean;
  canRemove: boolean;
  onChange: (id: string, patch: Partial<RequestLine>) => void;
  onRemove: (id: string) => void;
}) {
  const { data: reliefItems, isLoading: isLoadingReliefItems } =
    useInventoryReliefItemsByCategory(line.categoryCode, {
      enabled: !!line.categoryCode,
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 py-1">
      <div className="lg:col-span-4 space-y-1 lg:space-y-0">
        <Label className="text-base font-medium text-muted-foreground tracking-tighter lg:hidden">
          Danh mục
        </Label>
        <Select
          value={line.categoryCode || undefined}
          onValueChange={(value) =>
            onChange(line.id, {
              categoryCode: value,
              reliefItemKey: "",
            })
          }
          disabled={isCategoriesLoading}
        >
          <SelectTrigger className="w-full h-10 leading-normal">
            <SelectValue
              placeholder={isCategoriesLoading ? "Đang tải danh mục..." : "Chọn danh mục"}
            />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.key} value={cat.key}>
                {cat.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="lg:col-span-5 space-y-1 lg:space-y-0">
        <Label className="text-sm tracking-tighter text-muted-foreground lg:hidden">
          Vật tư tiếp tế
        </Label>
        <Select
          value={line.reliefItemKey || undefined}
          onValueChange={(value) => onChange(line.id, { reliefItemKey: value })}
          disabled={!line.categoryCode || isLoadingReliefItems}
        >
          <SelectTrigger className="w-full h-10 leading-normal">
            <SelectValue
              placeholder={
                !line.categoryCode
                  ? "Chọn danh mục trước"
                  : isLoadingReliefItems
                    ? "Đang tải vật tư..."
                    : "Chọn vật tư"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {(reliefItems ?? []).map((item) => (
              <SelectItem key={item.key} value={item.key}>
                {item.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="lg:col-span-2 space-y-1 lg:space-y-0">
        <Label className="text-xs text-muted-foreground tracking-tighter lg:hidden">
          Số lượng
        </Label>
        <Input
          type="number"
          min={1}
          value={line.quantity}
          onChange={(e) => onChange(line.id, { quantity: e.target.value })}
          placeholder="Nhập SL"
          className="h-10 py-2 leading-normal"
        />
      </div>

      <div className="lg:col-span-1 flex items-end justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={() => onRemove(line.id)}
          disabled={!canRemove}
        >
          <Trash size={16} />
        </Button>
      </div>
    </div>
  );
}

export default function SupplyRequestSection({
  onSelectionSidebarOpen,
  onSelectionSidebarChange,
  onPanelWidthChange,
}: SupplyRequestSectionProps) {
  const { data: categories = [], isLoading: isCategoriesLoading } =
    useInventoryCategories();
  const { mutateAsync: createSupplyRequests, isPending: isSubmittingRequest } =
    useCreateSupplyRequests();

  const [lines, setLines] = useState<RequestLine[]>([
    { id: crypto.randomUUID(), categoryCode: "", reliefItemKey: "", quantity: "" },
  ]);
  const [submittedParams, setSubmittedParams] =
    useState<SearchDepotsParams | null>(null);
  const [selectedDepotByItem, setSelectedDepotByItem] = useState<
    Record<number, SelectedDepotByItem>
  >({});
  const [depotNotes, setDepotNotes] = useState<Record<number, string>>({});
  const [isSelectionSheetOpen, setIsSelectionSheetOpen] = useState(false);
  const [animatedDepotId, setAnimatedDepotId] = useState<number | null>(null);
  const [flyTokens, setFlyTokens] = useState<FlyToken[]>([]);
  const panelWidthRef = useRef(480);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = panelWidthRef.current;

      const onMove = (ev: MouseEvent) => {
        const newW = Math.min(860, Math.max(300, startWidth + startX - ev.clientX));
        panelWidthRef.current = newW;
        // Direct DOM — zero React re-renders during drag
        if (sheetRef.current) sheetRef.current.style.width = `${newW}px`;
        onPanelWidthChange?.(newW);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onPanelWidthChange],
  );

  const setSelectionSheetOpen = (open: boolean) => {
    setIsSelectionSheetOpen(open);
    onSelectionSidebarChange?.(open);
    if (open) {
      onSelectionSidebarOpen?.();
    } else {
      setSelectedDepotByItem({});
    }
  };

  const queryParams = submittedParams ?? {
    itemModelIds: [],
    quantities: [],
    activeDepotsOnly: true,
    pageNumber: 1,
    pageSize: 10,
  };

  const {
    data: searchResult,
    isFetching: isSearching,
    isError,
  } = useSearchDepotsByReliefItems(queryParams, {
    enabled: !!submittedParams,
  });

  const hasSearched = !!submittedParams;

  const requestedQuantityByResultItemId = useMemo(() => {
    const map: Record<number, number> = {};
    const quantities = submittedParams?.quantities ?? [];

    (searchResult?.items ?? []).forEach((item, index) => {
      const quantity = Number(quantities[index]);
      if (Number.isFinite(quantity) && quantity > 0) {
        map[item.itemModelId] = quantity;
      }
    });

    return map;
  }, [searchResult, submittedParams]);

  const getRequestedQuantity = (itemModelId: number) => {
    let quantity = 0;

    const ids = submittedParams?.itemModelIds ?? [];
    const quantities = submittedParams?.quantities ?? [];

    for (let index = 0; index < ids.length; index += 1) {
      if (Number(ids[index]) === itemModelId) {
        const parsedQty = Number(quantities[index]);
        if (Number.isFinite(parsedQty) && parsedQty > 0) {
          quantity += parsedQty;
        }
      }
    }

    if (quantity > 0) {
      return quantity;
    }

    lines.forEach((line) => {
      if (Number(line.reliefItemKey) === itemModelId) {
        const parsedQty = Number(line.quantity);
        if (Number.isFinite(parsedQty) && parsedQty > 0) {
          quantity += parsedQty;
        }
      }
    });

    return quantity;
  };

  const handleChangeLine = (id: string, patch: Partial<RequestLine>) => {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), categoryCode: "", reliefItemKey: "", quantity: "" },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const handleSearch = () => {
    if (lines.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 vật tư");
      return;
    }

    for (const [index, line] of lines.entries()) {
      if (!line.categoryCode) {
        toast.error(`Dòng ${index + 1}: Vui lòng chọn danh mục`);
        return;
      }
      if (!line.reliefItemKey) {
        toast.error(`Dòng ${index + 1}: Vui lòng chọn vật tư`);
        return;
      }
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        toast.error(`Dòng ${index + 1}: Số lượng phải lớn hơn 0`);
        return;
      }
    }

    const itemModelIds = lines.map((line) => Number(line.reliefItemKey));
    const quantities = lines.map((line) => Number(line.quantity));

    setSubmittedParams({
      itemModelIds,
      quantities,
      activeDepotsOnly: true,
      pageNumber: 1,
      pageSize: 10,
    });

    setSelectedDepotByItem({});
    setDepotNotes({});
    setSelectionSheetOpen(false);
  };

  const spawnFlyToken = (sourceElement: HTMLElement, text: string) => {
    const rect = sourceElement.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const sheetWidth = panelWidthRef.current;
    const targetX = window.innerWidth - sheetWidth + 72;
    const targetY = 98;
    const id = crypto.randomUUID();

    setFlyTokens((prev) => [
      ...prev,
      {
        id,
        text,
        startX,
        startY,
        dx: targetX - startX,
        dy: targetY - startY,
        active: false,
      },
    ]);

    window.setTimeout(() => {
      setFlyTokens((prev) =>
        prev.map((token) =>
          token.id === id ? { ...token, active: true } : token,
        ),
      );
    }, 30);

    window.setTimeout(() => {
      setFlyTokens((prev) => prev.filter((token) => token.id !== id));
    }, 1200);
  };

  const handleSelectDepotForItem = (
    item: SearchDepotItemEntity,
    warehouse: SearchDepotWarehouseEntity,
    sourceElement: HTMLElement,
  ) => {
    let isDeselectAction = false;
    let nextSelectedCount = 0;

    setSelectedDepotByItem((prev) => {
      const current = prev[item.itemModelId];

      if (current?.depotId === warehouse.depotId) {
        const next = { ...prev };
        delete next[item.itemModelId];
        isDeselectAction = true;
        nextSelectedCount = Object.keys(next).length;
        return next;
      }

      const next = {
        ...prev,
        [item.itemModelId]: {
          itemModelId: item.itemModelId,
          itemModelName: item.itemModelName,
          unit: item.unit,
          requestQuantity: Math.max(
            1,
            requestedQuantityByResultItemId[item.itemModelId] ??
              getRequestedQuantity(item.itemModelId),
          ),
          depotId: warehouse.depotId,
          depotName: warehouse.depotName,
          depotAddress: warehouse.depotAddress,
          depotStatus: warehouse.depotStatus,
          availableQuantity: warehouse.availableQuantity,
          distanceKm: warehouse.distanceKm,
        },
      };

      nextSelectedCount = Object.keys(next).length;
      return next;
    });

    if (isDeselectAction) {
      if (nextSelectedCount === 0) {
        setSelectionSheetOpen(false);
      }
      return;
    }

    setAnimatedDepotId(warehouse.depotId);
    spawnFlyToken(sourceElement, warehouse.depotName);
    setSelectionSheetOpen(true);
  };

  const handleOpenSelectionSheet = () => {
    setSelectionSheetOpen(true);
  };

  const groupedSelectedDepots = useMemo(() => {
    const grouped = new Map<
      number,
      {
        depotId: number;
        depotName: string;
        depotAddress: string;
        depotStatus: string;
        distanceKm: number;
        items: Array<{
          itemModelId: number;
          itemModelName: string;
          quantity: number;
          unit: string;
        }>;
      }
    >();

    Object.values(selectedDepotByItem).forEach((selection) => {
      const quantity = Math.max(1, Number(selection.requestQuantity) || 0);

      const existing = grouped.get(selection.depotId);
      if (!existing) {
        grouped.set(selection.depotId, {
          depotId: selection.depotId,
          depotName: selection.depotName,
          depotAddress: selection.depotAddress,
          depotStatus: selection.depotStatus,
          distanceKm: selection.distanceKm,
          items: [
            {
              itemModelId: selection.itemModelId,
              itemModelName: selection.itemModelName,
              quantity,
              unit: selection.unit,
            },
          ],
        });
        return;
      }

      existing.items.push({
        itemModelId: selection.itemModelId,
        itemModelName: selection.itemModelName,
        quantity,
        unit: selection.unit,
      });
    });

    return Array.from(grouped.values()).sort((a, b) => a.distanceKm - b.distanceKm);
  }, [selectedDepotByItem]);

  const handleSubmitSupplyRequests = async () => {
    if (groupedSelectedDepots.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 kho nguồn");
      return;
    }

    const requests = groupedSelectedDepots
      .map((depot) => ({
      sourceDepotId: depot.depotId,
      items: depot.items
        .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0)
        .map((item) => ({
          itemModelId: item.itemModelId,
          quantity: item.quantity,
        })),
      note: depotNotes[depot.depotId]?.trim() || undefined,
      }))
      .filter((request) => request.items.length > 0);

    if (requests.length === 0) {
      toast.error("Không tìm thấy số lượng hợp lệ để gửi yêu cầu");
      return;
    }

    try {
      await createSupplyRequests({ requests });
      toast.success("Đã gửi yêu cầu tiếp tế thành công");

      // Clear searched/request-building data after successful submit
      setSubmittedParams(null);
      setLines([
        {
          id: crypto.randomUUID(),
          categoryCode: "",
          reliefItemKey: "",
          quantity: "",
        },
      ]);
      setSelectedDepotByItem({});
      setDepotNotes({});
      setFlyTokens([]);
      setAnimatedDepotId(null);
      setSelectionSheetOpen(false);
    } catch {
      toast.error("Gửi yêu cầu thất bại. Vui lòng thử lại");
    }
  };

  const totalWarehouses = useMemo(
    () =>
      (searchResult?.items ?? []).reduce(
        (acc, item) => acc + (item.warehouses?.length ?? 0),
        0,
      ),
    [searchResult],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tighter flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Tạo yêu cầu tiếp tế
          </CardTitle>
          <CardDescription className="tracking-tighter text-sm">
            Chọn vật tư cần tiếp tế và số lượng để tìm kho phù hợp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-card py-1 lg:py-2 px-3 lg:px-4">
            <div className="hidden lg:grid lg:grid-cols-12 gap-3 py-1">
              <p className="lg:col-span-4 text-sm font-medium tracking-tighter">
                Danh mục
              </p>
              <p className="lg:col-span-5 text-sm font-medium tracking-tighter">
                Vật tư tiếp tế
              </p>
              <p className="lg:col-span-2 text-sm font-medium tracking-tighter">
                Số lượng
              </p>
              <p className="lg:col-span-1" />
            </div>

            <div className="divide-y divide-border/60">
              {lines.map((line) => (
                <RequestLineRow
                  key={line.id}
                  line={line}
                  categories={categories}
                  isCategoriesLoading={isCategoriesLoading}
                  canRemove={lines.length > 1}
                  onChange={handleChangeLine}
                  onRemove={handleRemoveLine}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleAddLine}
            >
              <Plus size={14} />
              Thêm vật tư
            </Button>

            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={handleSearch}
              disabled={isSearching}
            >
              <MagnifyingGlass size={14} />
              Tìm kho tiếp tế
            </Button>
          </div>
        </CardContent>
      </Card>

      {(hasSearched || isSearching) && (
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold tracking-tighter flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-primary" />
                Kết quả tìm kho
              </CardTitle>
              {!isSearching && !isError && (searchResult?.items?.length ?? 0) > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={handleOpenSelectionSheet}
                  disabled={groupedSelectedDepots.length === 0}
                >
                  <ShoppingCartSimple size={16} />
                  Kho đã chọn ({groupedSelectedDepots.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSearching && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border-border/60">
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isSearching && isError && (
              <div className="text-sm text-destructive tracking-tighter">
                Không thể tìm kho phù hợp. Vui lòng thử lại.
              </div>
            )}

            {!isSearching && !isError && (searchResult?.items?.length ?? 0) === 0 && (
              <div className="text-sm text-muted-foreground tracking-tighter">
                Không có kho đáp ứng yêu cầu hiện tại.
              </div>
            )}

            {!isSearching && !isError && (searchResult?.items?.length ?? 0) > 0 && (
              <div className="space-y-4">

                {searchResult!.items.map((item) => (
                  <Card key={item.itemModelId} className="border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <CardTitle className="text-[16px] font-semibold tracking-tighter">
                            {item.itemModelName}
                          </CardTitle>
                          <CardDescription className="tracking-tighter text-[14px]">
                            Danh mục: {item.categoryName}
                          </CardDescription>
                        </div>
                        <Badge variant="info" className="w-fit">
                          Tổng khả dụng: {item.totalAvailableAcrossWarehouses.toLocaleString("vi-VN")} {item.unit}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {item.warehouses.map((warehouse) => (
                          (() => {
                            const isSelected =
                              selectedDepotByItem[item.itemModelId]?.depotId ===
                              warehouse.depotId;

                              return (
                          <div
                            key={`${item.itemModelId}-${warehouse.depotId}`}
                            role="button"
                            tabIndex={0}
                            onClick={(event) =>
                              handleSelectDepotForItem(
                                item,
                                warehouse,
                                event.currentTarget,
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleSelectDepotForItem(
                                  item,
                                  warehouse,
                                  event.currentTarget,
                                );
                              }
                            }}
                            className={`rounded-lg border p-4 transition-all duration-300 cursor-pointer bg-muted/20 hover:-translate-y-0.5 hover:shadow-sm ${
                              isSelected
                                ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                                : "border-border/60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-base font-semibold tracking-tighter">
                                  {warehouse.depotName}
                                </p>
                                <p className="text-sm text-muted-foreground tracking-tighter mt-0.5 flex items-start gap-1">
                                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                  <span>{warehouse.depotAddress}</span>
                                </p>
                              </div>
                              <Badge variant="outline">
                                {DEPOT_STATUS_LABELS[warehouse.depotStatus] ??
                                  warehouse.depotStatus}
                              </Badge>
                            </div>

                            {isSelected && (
                              <div className="mt-3 flex w-fit items-center gap-1.5 tracking-tighter rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                <CheckCircle size={14} weight="fill" />
                                Đã chọn
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 mt-3 text-sm tracking-tighter">
                              <div>
                                <p className="text-muted-foreground">Tổng</p>
                                <p className="font-semibold">
                                  {warehouse.totalQuantity.toLocaleString("vi-VN")}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Đã giữ</p>
                                <p className="font-semibold">
                                  {warehouse.reservedQuantity.toLocaleString("vi-VN")}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Khả dụng</p>
                                <p className="font-semibold text-emerald-600">
                                  {warehouse.availableQuantity.toLocaleString("vi-VN")}
                                </p>
                              </div>
                            </div>

                            <div className="mt-2 text-sm text-muted-foreground tracking-tighter flex items-center justify-between">
                              <span>
                                Khoảng cách: <span className="font-semibold text-primary">{warehouse.distanceKm.toFixed(2)} km</span>
                              </span>
                              <span>
                                Nhập gần nhất: {new Date(warehouse.lastStockedAt).toLocaleDateString("vi-VN")}
                              </span>
                            </div>
                          </div>
                            );
                          })()
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Sheet open={isSelectionSheetOpen} onOpenChange={setSelectionSheetOpen}>
        <SheetContent
          ref={sheetRef}
          className="h-dvh p-0 overflow-hidden"
          style={{ width: 480, maxWidth: "85vw" }}
          side="right"
          showOverlay={false}
        >
          {/* Drag handle */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute left-0 inset-y-0 w-1.5 z-20 cursor-col-resize group flex items-center justify-center hover:bg-primary/15 active:bg-primary/25 transition-colors"
          >
            <div className="h-10 w-0.5 rounded-full bg-border/80 group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
          </div>

          <div className="flex h-full flex-col overflow-hidden">
            <SheetHeader className="border-b p-3 pb-3">
              <SheetTitle className="tracking-tighter flex items-center gap-2">
                <ClipboardTextIcon className="h-5 w-5 text-primary" />
                Danh sách kho đã chọn
              </SheetTitle>
            </SheetHeader>

            <div className="flex flex-1 flex-col items-center overflow-y-auto p-6 space-y-4">
              {groupedSelectedDepots.length === 0 ? (
                <div className="w-full rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground tracking-tighter">
                  Chưa có kho nào được chọn.
                </div>
              ) : (
                groupedSelectedDepots.map((depot) => (
                  <Card
                    key={String(depot.depotId)}
                    className={`w-full border-border/60 transition-all duration-300 ${
                      animatedDepotId === depot.depotId
                        ? "ring-1 ring-primary/25"
                        : ""
                    }`}
                  >
                    <CardHeader className="pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base tracking-tighter">
                            {depot.depotName}
                          </CardTitle>
                          <CardDescription className="tracking-tighter mt-1 flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            {depot.depotAddress}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        {depot.items.map((item) => (
                          <div
                            key={`${depot.depotId}-${item.itemModelId}`}
                            className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm tracking-tighter flex items-center justify-between"
                          >
                            <span className="font-medium">{item.itemModelName}</span>
                            <span className="text-primary font-semibold">
                              {item.quantity.toLocaleString("vi-VN")} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs mt-1 text-muted-foreground tracking-tighter">
                          Ghi chú
                        </Label>
                        <Textarea
                          placeholder="Nhập ghi chú (nếu có)..."
                          className="min-h-21"
                          value={depotNotes[depot.depotId] ?? ""}
                          onChange={(event) =>
                            setDepotNotes((prev) => ({
                              ...prev,
                              [depot.depotId]: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="border-t p-4 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
              <Button
                type="button"
                className="w-full gap-2"
                onClick={handleSubmitSupplyRequests}
                disabled={groupedSelectedDepots.length === 0 || isSubmittingRequest}
              >
                <PaperPlaneTilt size={16} />
                {isSubmittingRequest ? "Đang gửi yêu cầu..." : "Gửi yêu cầu tiếp tế"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {flyTokens.length > 0 && typeof document !== "undefined" &&
        createPortal(
          flyTokens.map((token) => (
            <div
              key={token.id}
              className="pointer-events-none fixed inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-background/95 px-3 py-1.5 text-xs font-medium text-primary shadow-lg"
              style={{
                zIndex: 99999,
                left: token.startX,
                top: token.startY,
                transform: token.active
                  ? `translate(${token.dx}px, ${token.dy}px) scale(0.35)`
                  : "translate(0, 0) scale(1)",
                opacity: token.active ? 0.25 : 1,
                transition: "transform 900ms cubic-bezier(0.16, 1, 0.3, 1), opacity 900ms ease",
              }}
            >
              <CheckCircle size={12} weight="fill" />
              {token.text}
            </div>
          )),
          document.body,
        )}
    </div>
  );
}
