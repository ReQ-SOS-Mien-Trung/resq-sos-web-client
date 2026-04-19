"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Trash,
  MagnifyingGlass,
  Warehouse,
  MapPin,
  Package,
  CheckCircle,
  PaperPlaneTilt,
  ClipboardTextIcon,
  WarehouseIcon,
  WarningCircle,
  Warning,
} from "@phosphor-icons/react";
import {
  useInventoryCategories,
  useCreateSupplyRequests,
  useInventoryReliefItemsByCategory,
  useSearchDepotsByReliefItems,
  useSupplyRequestPriorityLevels,
} from "@/services/inventory";
import {
  SearchDepotsParams,
  SearchDepotItemEntity,
  SearchDepotWarehouseEntity,
} from "@/services/inventory/type";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import { toast } from "sonner";

type RequestLine = {
  id: string;
  categoryCode: string;
  categoryName: string;
  reliefItemKey: string;
  reliefItemName: string;
  quantity: string;
};

type SubmittedRequestLine = {
  lineId: string;
  lineIndex: number;
  categoryCode: string;
  categoryName: string;
  itemModelId: number;
  itemModelName: string;
  quantity: number;
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

function getWarehouseGridClassName(count: number): string {
  if (count <= 1) {
    return "grid-cols-1";
  }

  if (count === 2 || count === 4) {
    return "grid-cols-1 xl:grid-cols-2";
  }

  return "grid-cols-1 xl:grid-cols-3";
}

const LINE_COLORS = [
  {
    border: "border-l-blue-400",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-400",
  },
  {
    border: "border-l-violet-400",
    badge: "bg-violet-100 text-violet-700 border-violet-200",
    dot: "bg-violet-400",
  },
  {
    border: "border-l-emerald-400",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-400",
  },
  {
    border: "border-l-amber-400",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  {
    border: "border-l-rose-400",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-rose-400",
  },
  {
    border: "border-l-cyan-400",
    badge: "bg-cyan-100 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-400",
  },
];

function RequestLineRow({
  line,
  index,
  categories,
  isCategoriesLoading,
  canRemove,
  onChange,
  onRemove,
}: {
  line: RequestLine;
  index: number;
  categories: Array<{ key: string; value: string }>;
  isCategoriesLoading: boolean;
  canRemove: boolean;
  onChange: (id: string, patch: Partial<RequestLine>) => void;
  onRemove: (id: string) => void;
}) {
  const color = LINE_COLORS[index % LINE_COLORS.length];
  const { data: reliefItems, isLoading: isLoadingReliefItems } =
    useInventoryReliefItemsByCategory(line.categoryCode, {
      enabled: !!line.categoryCode,
    });

  return (
    <div
      className={cn(
        "grid grid-cols-1 lg:grid-cols-12 gap-3 py-3 pl-3 border-l-4 rounded-sm",
        color.border,
      )}
    >
      <div className="lg:col-span-12 flex items-center gap-2 -mb-1 lg:hidden">
        <span
          className={cn(
            "inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold border",
            color.badge,
          )}
        >
          {index + 1}
        </span>
        <span className="text-xs font-medium tracking-tighter text-muted-foreground">
          Vật phẩm #{index + 1}
        </span>
      </div>
      <div className="lg:col-span-4 space-y-1 lg:space-y-0">
        <Label className="text-base font-medium text-muted-foreground tracking-tighter lg:hidden">
          Danh mục
        </Label>
        <Select
          value={line.categoryCode || undefined}
          onValueChange={(value) => {
            const selectedCategory = categories.find(
              (cat) => cat.key === value,
            );
            onChange(line.id, {
              categoryCode: value,
              categoryName: selectedCategory?.value ?? "",
              reliefItemKey: "",
              reliefItemName: "",
            });
          }}
          disabled={isCategoriesLoading}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                isCategoriesLoading ? "Đang tải danh mục..." : "Chọn danh mục"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat, idx) => (
              <SelectItem key={`${cat.key}-${idx}`} value={cat.key}>
                {cat.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="lg:col-span-5 space-y-1 lg:space-y-0">
        <Label className="text-sm tracking-tighter text-muted-foreground lg:hidden">
          Vật phẩm tiếp tế
        </Label>
        <Select
          value={line.reliefItemKey || undefined}
          onValueChange={(value) => {
            const selectedItem = (reliefItems ?? []).find(
              (item) => item.key === value,
            );
            onChange(line.id, {
              reliefItemKey: value,
              reliefItemName: selectedItem?.value ?? "",
            });
          }}
          disabled={!line.categoryCode || isLoadingReliefItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                !line.categoryCode
                  ? "Chọn danh mục trước"
                  : isLoadingReliefItems
                    ? "Đang tải vật phẩm..."
                    : "Chọn vật phẩm"
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
          className="h-9 px-3 py-1 text-sm rounded-md"
        />
      </div>

      <div className="lg:col-span-1 flex items-center justify-end gap-1.5">
        <span
          className={cn(
            "hidden lg:inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold border shrink-0",
            color.badge,
          )}
        >
          {index + 1}
        </span>
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
  const { selectedDepotId } = useManagerDepot();
  const { data: categories = [], isLoading: isCategoriesLoading } =
    useInventoryCategories();
  const { mutateAsync: createSupplyRequests, isPending: isSubmittingRequest } =
    useCreateSupplyRequests();
  const { data: priorityLevels = [] } = useSupplyRequestPriorityLevels();

  const [lines, setLines] = useState<RequestLine[]>([
    {
      id: crypto.randomUUID(),
      categoryCode: "",
      categoryName: "",
      reliefItemKey: "",
      reliefItemName: "",
      quantity: "",
    },
  ]);
  const [submittedParams, setSubmittedParams] =
    useState<SearchDepotsParams | null>(null);
  const [submittedLinesSnapshot, setSubmittedLinesSnapshot] = useState<
    SubmittedRequestLine[]
  >([]);
  const [selectedDepotByItem, setSelectedDepotByItem] = useState<
    Record<number, SelectedDepotByItem>
  >({});
  const [depotNotes, setDepotNotes] = useState<Record<number, string>>({});
  const [depotPriorities, setDepotPriorities] = useState<
    Record<number, string>
  >({});
  const [isSelectionSheetOpen, setIsSelectionSheetOpen] = useState(false);
  const [animatedDepotId, setAnimatedDepotId] = useState<number | null>(null);
  const [flyTokens, setFlyTokens] = useState<FlyToken[]>([]);
  const panelWidthRef = useRef(360);
  const [panelWidth, setPanelWidth] = useState(360);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = panelWidthRef.current;

      const onMove = (ev: MouseEvent) => {
        const newW = Math.min(
          860,
          Math.max(300, startWidth + startX - ev.clientX),
        );
        panelWidthRef.current = newW;
        setPanelWidth(newW);
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

  const submittedItemIds = useMemo(
    () => new Set(submittedLinesSnapshot.map((line) => line.itemModelId)),
    [submittedLinesSnapshot],
  );

  const visibleSearchItems = useMemo(
    () =>
      (searchResult?.items ?? []).filter(
        (item) =>
          submittedItemIds.has(item.itemModelId) && item.warehouses.length > 0,
      ),
    [searchResult, submittedItemIds],
  );

  // Map itemModelId → LINE_COLORS index based on submitted lines order (form order)
  const itemColorMap = useMemo(() => {
    const map = new Map<number, (typeof LINE_COLORS)[number]>();
    submittedLinesSnapshot.forEach((line, idx) => {
      map.set(line.itemModelId, LINE_COLORS[idx % LINE_COLORS.length]);
    });
    return map;
  }, [submittedLinesSnapshot]);

  // Map itemModelId → 1-based line number from submitted lines (form order)
  const itemLineNumberMap = useMemo(() => {
    const map = new Map<number, number>();
    submittedLinesSnapshot.forEach((line, idx) => {
      map.set(line.itemModelId, idx + 1);
    });
    return map;
  }, [submittedLinesSnapshot]);

  const requestedQuantityByResultItemId = useMemo(() => {
    const map: Record<number, number> = {};
    submittedLinesSnapshot.forEach((line) => {
      if (Number.isFinite(line.quantity) && line.quantity > 0) {
        map[line.itemModelId] = (map[line.itemModelId] ?? 0) + line.quantity;
      }
    });

    return map;
  }, [submittedLinesSnapshot]);

  const unavailableRequestedItems = useMemo(() => {
    if (!submittedParams) {
      return [];
    }

    const resultByItemId = new Map(
      (searchResult?.items ?? []).map((item) => [item.itemModelId, item]),
    );

    return submittedLinesSnapshot.filter((line) => {
      const matchedItem = resultByItemId.get(line.itemModelId);
      return !matchedItem || matchedItem.warehouses.length === 0;
    });
  }, [searchResult, submittedLinesSnapshot, submittedParams]);

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
      {
        id: crypto.randomUUID(),
        categoryCode: "",
        categoryName: "",
        reliefItemKey: "",
        reliefItemName: "",
        quantity: "",
      },
    ]);
  };

  const handleRemoveLine = (id: string) => {
    const removedLine = lines.find((line) => line.id === id);
    const removedItemModelId = removedLine?.reliefItemKey
      ? Number(removedLine.reliefItemKey)
      : null;

    setLines((prev) => prev.filter((line) => line.id !== id));

    setSubmittedLinesSnapshot((prev) => {
      const nextSnapshot = prev
        .filter((line) => line.lineId !== id)
        .map((line, index) => ({
          ...line,
          lineIndex: index,
        }));

      setSubmittedParams(
        nextSnapshot.length > 0
          ? {
              itemModelIds: nextSnapshot.map((line) => line.itemModelId),
              quantities: nextSnapshot.map((line) => line.quantity),
              activeDepotsOnly: true,
              pageNumber: 1,
              pageSize: 10,
            }
          : null,
      );

      return nextSnapshot;
    });

    if (removedItemModelId) {
      setSelectedDepotByItem((prev) => {
        const next = { ...prev };
        delete next[removedItemModelId];
        return next;
      });
    }
  };

  const handleSearch = () => {
    if (lines.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 vật phẩm");
      return;
    }

    for (const [index, line] of lines.entries()) {
      if (!line.categoryCode) {
        toast.error(`Dòng ${index + 1}: Vui lòng chọn danh mục`);
        return;
      }
      if (!line.reliefItemKey) {
        toast.error(`Dòng ${index + 1}: Vui lòng chọn vật phẩm`);
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

    setSubmittedLinesSnapshot(
      lines.map((line, index) => ({
        lineId: line.id,
        lineIndex: index,
        categoryCode: line.categoryCode,
        categoryName: line.categoryName,
        itemModelId: Number(line.reliefItemKey),
        itemModelName: line.reliefItemName,
        quantity: Number(line.quantity),
      })),
    );

    setSubmittedParams({
      itemModelIds,
      quantities,
      activeDepotsOnly: true,
      pageNumber: 1,
      pageSize: 10,
    });

    // Sync requestQuantity in existing selections to reflect new search quantities
    setSelectedDepotByItem((prev) => {
      const next = { ...prev };
      lines.forEach((line) => {
        const itemId = Number(line.reliefItemKey);
        if (next[itemId]) {
          next[itemId] = {
            ...next[itemId],
            requestQuantity: Number(line.quantity),
          };
        }
      });
      return next;
    });
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

    return Array.from(grouped.values()).sort(
      (a, b) => a.distanceKm - b.distanceKm,
    );
  }, [selectedDepotByItem]);

  const hasInsufficientItems = useMemo(
    () =>
      Object.values(selectedDepotByItem).some(
        (s) => s.availableQuantity < s.requestQuantity,
      ),
    [selectedDepotByItem],
  );

  const handleSubmitSupplyRequests = async () => {
    if (groupedSelectedDepots.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 kho nguồn");
      return;
    }

    const requests = groupedSelectedDepots
      .map((depot) => ({
        sourceDepotId: depot.depotId,
        priorityLevel:
          depotPriorities[depot.depotId] ||
          (priorityLevels[0]?.key ?? "Urgent"),
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
      await createSupplyRequests({
        depotId: selectedDepotId ?? 0,
        requests,
      });
      toast.success("Đã gửi yêu cầu tiếp tế thành công");

      // Clear searched/request-building data after successful submit
      setSubmittedParams(null);
      setLines([
        {
          id: crypto.randomUUID(),
          categoryCode: "",
          categoryName: "",
          reliefItemKey: "",
          reliefItemName: "",
          quantity: "",
        },
      ]);
      setSelectedDepotByItem({});
      setDepotNotes({});
      setDepotPriorities({});
      setFlyTokens([]);
      setAnimatedDepotId(null);
      setSelectionSheetOpen(false);
    } catch {
      toast.error("Gửi yêu cầu thất bại. Vui lòng thử lại");
    }
  };

  return (
    <div className="flex items-start gap-0">
      {/* ── Main body ── */}
      <div className="flex-1 min-w-0 space-y-6 animate-in fade-in duration-300">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold tracking-tighter flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Tạo yêu cầu tiếp tế
            </CardTitle>
            <CardDescription className="tracking-tighter text-sm">
              Chọn vật phẩm cần tiếp tế và số lượng để tìm kho phù hợp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-card py-1 lg:py-2 px-3 lg:px-4">
              <div className="hidden lg:grid lg:grid-cols-12 gap-3 py-1">
                <p className="lg:col-span-4 text-sm font-medium tracking-tighter">
                  Danh mục
                </p>
                <p className="lg:col-span-5 text-sm font-medium tracking-tighter">
                  Vật phẩm tiếp tế
                </p>
                <p className="lg:col-span-2 text-sm font-medium tracking-tighter">
                  Số lượng
                </p>
                <p className="lg:col-span-1" />
              </div>

              <div className="divide-y divide-border/60">
                {lines.map((line, index) => (
                  <RequestLineRow
                    key={line.id}
                    line={line}
                    index={index}
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
                Thêm vật phẩm
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
                {!isSearching && !isError && visibleSearchItems.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={handleOpenSelectionSheet}
                    disabled={groupedSelectedDepots.length === 0}
                  >
                    <WarehouseIcon size={16} />
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

              {!isSearching &&
                !isError &&
                unavailableRequestedItems.length > 0 && (
                  <div className="space-y-2">
                    {unavailableRequestedItems.map((item) => (
                      <div
                        key={item.lineId}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 tracking-tighter"
                      >
                        Không có kho nào tương thích với vật phẩm{" "}
                        <span className="font-semibold">
                          {item.itemModelName || `dòng ${item.lineIndex + 1}`}
                        </span>
                        .
                      </div>
                    ))}
                  </div>
                )}

              {!isSearching &&
                !isError &&
                visibleSearchItems.length === 0 &&
                unavailableRequestedItems.length === 0 && (
                  <div className="text-sm text-muted-foreground tracking-tighter">
                    Không có kho đáp ứng yêu cầu hiện tại.
                  </div>
                )}

              {!isSearching && !isError && visibleSearchItems.length > 0 && (
                <div className="space-y-4">
                  {visibleSearchItems.map((item) => {
                    const itemColor =
                      itemColorMap.get(item.itemModelId) ?? LINE_COLORS[0];
                    return (
                      <Card
                        key={item.itemModelId}
                        className={cn(
                          "border-0 bg-transparent shadow-none py-0 pl-3 border-l-4 rounded-sm",
                          itemColor.border,
                        )}
                      >
                        <CardHeader className="px-0 pb-3 py-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold border shrink-0",
                                  itemColor.badge,
                                )}
                              >
                                {itemLineNumberMap.get(item.itemModelId) ?? 1}
                              </span>
                              <div>
                                <CardTitle className="text-base font-semibold tracking-tighter">
                                  {item.itemModelName}
                                </CardTitle>
                                <CardDescription className="tracking-tighter text-[14px]">
                                  Danh mục: {item.categoryName}
                                </CardDescription>
                              </div>
                            </div>
                            <Badge variant="info" className="w-fit">
                              Tổng khả dụng:{" "}
                              {item.totalAvailableAcrossWarehouses.toLocaleString(
                                "vi-VN",
                              )}{" "}
                              {item.unit}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                          <div
                            className={cn(
                              "grid gap-3",
                              getWarehouseGridClassName(item.warehouses.length),
                            )}
                          >
                            {item.warehouses.map((warehouse) =>
                              (() => {
                                const isSelected =
                                  selectedDepotByItem[item.itemModelId]
                                    ?.depotId === warehouse.depotId;

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
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
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
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-base font-semibold tracking-tighter">
                                          {warehouse.depotName}
                                        </p>
                                      </div>
                                      {isSelected && (
                                        <div className="shrink-0 flex items-center gap-1.5 tracking-tighter rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                          <CheckCircle
                                            size={14}
                                            weight="fill"
                                          />
                                          Đã chọn
                                        </div>
                                      )}
                                    </div>

                                    <p className="mt-1 text-sm text-muted-foreground tracking-tighter flex items-start gap-1">
                                      <MapPin className="shrink-0 mt-0.5" />
                                      <span>{warehouse.depotAddress}</span>
                                    </p>

                                    <div className="grid grid-cols-3 gap-2 mt-3 text-sm tracking-tighter">
                                      <div>
                                        <p className="text-muted-foreground">
                                          Tổng
                                        </p>
                                        <p className="font-semibold text-base">
                                          {warehouse.totalQuantity.toLocaleString(
                                            "vi-VN",
                                          )}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">
                                          Đã giữ
                                        </p>
                                        <p className="font-semibold text-base">
                                          {warehouse.reservedQuantity.toLocaleString(
                                            "vi-VN",
                                          )}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">
                                          Khả dụng
                                        </p>
                                        <p className="font-semibold text-base text-emerald-600">
                                          {warehouse.availableQuantity.toLocaleString(
                                            "vi-VN",
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="mt-2 text-sm text-muted-foreground tracking-tighter flex items-center justify-between">
                                      <span>
                                        Khoảng cách:{" "}
                                        <span className="font-semibold text-primary">
                                          {warehouse.distanceKm.toFixed(2)} km
                                        </span>
                                      </span>
                                      {/* <span>
                                          Nhập gần nhất:{" "}
                                          {new Date(
                                            warehouse.lastStockedAt,
                                          ).toLocaleDateString("vi-VN")}
                                        </span> */}
                                      <Badge variant="outline">
                                        {DEPOT_STATUS_LABELS[
                                          warehouse.depotStatus
                                        ] ?? warehouse.depotStatus}
                                      </Badge>
                                    </div>
                                  </div>
                                );
                              })(),
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      {/* ── Inline selection panel ── */}
      <div
        ref={sheetRef}
        className={cn(
          "shrink-0 sticky top-4 flex flex-col rounded-xl border bg-card overflow-hidden transition-[width,opacity,margin] duration-300 ease-in-out",
          isSelectionSheetOpen
            ? "opacity-100 ml-4"
            : "opacity-0 pointer-events-none ml-0",
        )}
        style={
          isSelectionSheetOpen
            ? { width: panelWidth, height: "calc(100vh - 6rem)" }
            : { width: 0 }
        }
      >
        {/* Drag handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute left-0 inset-y-0 w-1.5 z-20 cursor-col-resize group flex items-center justify-center hover:bg-primary/15 active:bg-primary/25 transition-colors"
        >
          <div className="h-10 w-0.5 rounded-full bg-border/80 group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
        </div>

        {/* Header */}
        <div className="pl-3 border-b px-4 py-3 flex items-center gap-2 shrink-0">
          <ClipboardTextIcon className="h-5 w-5 text-primary shrink-0" />
          <h3 className="text-sm font-semibold tracking-tighter flex-1">
            Danh sách kho đã chọn
          </h3>
          <button
            onClick={() => setSelectionSheetOpen(false)}
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1 1l10 10M11 1L1 11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <ScrollArea className="h-0 min-h-0 flex-1">
          <div className="p-3 space-y-3">
            {groupedSelectedDepots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground tracking-tighter">
                Chưa có kho nào được chọn.
              </div>
            ) : (
              groupedSelectedDepots.map((depot) => {
                const firstColor =
                  itemColorMap.get(depot.items[0]?.itemModelId) ??
                  LINE_COLORS[0];
                return (
                  <Card
                    key={String(depot.depotId)}
                    className={cn(
                      "w-full gap-0 py-1 border-l-4 transition-all duration-300",
                      firstColor.border,
                      animatedDepotId === depot.depotId
                        ? "ring-1 ring-primary/25"
                        : "",
                    )}
                  >
                    <CardHeader className="px-4 pt-3 pb-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-[15px] tracking-tighter leading-tight">
                            {depot.depotName}
                          </CardTitle>
                          <CardDescription className="tracking-tighter mt-1 flex items-start gap-1 text-xs leading-snug">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            {depot.depotAddress}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-2 px-4 pb-3">
                      <div className="space-y-1">
                        {depot.items.map((item) => {
                          const itemColor =
                            itemColorMap.get(item.itemModelId) ??
                            LINE_COLORS[0];
                          const selectedItem =
                            selectedDepotByItem[item.itemModelId];
                          const isInsufficient =
                            !!selectedItem &&
                            selectedItem.availableQuantity <
                              selectedItem.requestQuantity;
                          return (
                            <div
                              key={`${depot.depotId}-${item.itemModelId}`}
                              className={cn(
                                "rounded-md border px-3 py-1.5 text-sm tracking-tighter flex items-center justify-between",
                                isInsufficient
                                  ? "border-amber-300 bg-amber-50"
                                  : itemColor.badge.replace(
                                      "border-",
                                      "border-",
                                    ),
                                isInsufficient
                                  ? "text-amber-900"
                                  : "bg-muted/20",
                              )}
                            >
                              <div className="flex items-center gap-1.5">
                                {isInsufficient ? (
                                  <Warning
                                    size={16}
                                    weight="fill"
                                    className="shrink-0 text-amber-600"
                                  />
                                ) : (
                                  <span
                                    className={cn(
                                      "inline-flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold border shrink-0",
                                      itemColor.badge,
                                    )}
                                  >
                                    {itemLineNumberMap.get(item.itemModelId) ??
                                      1}
                                  </span>
                                )}
                                <span className="font-medium">
                                  {item.itemModelName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {isInsufficient ? (
                                  <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <WarningCircle
                                          className="h-4 w-4 text-amber-500 shrink-0"
                                          weight="fill"
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="bottom"
                                        align="center"
                                        sideOffset={6}
                                        className="bg-yellow-100 border-yellow-200 text-amber-900 text-sm tracking-tighter"
                                      >
                                        Không đủ số lượng để tiếp viện
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : null}
                                <span className="text-primary font-semibold">
                                  {item.quantity.toLocaleString("vi-VN")}{" "}
                                  {item.unit}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground tracking-tighter">
                          Mức độ ưu tiên
                        </Label>
                        <Select
                          value={
                            depotPriorities[depot.depotId] ||
                            (priorityLevels[0]?.key ?? "")
                          }
                          onValueChange={(value) =>
                            setDepotPriorities((prev) => ({
                              ...prev,
                              [depot.depotId]: value,
                            }))
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              "w-full h-8 leading-normal font-medium",
                              (
                                depotPriorities[depot.depotId] ||
                                (priorityLevels[0]?.key ?? "URGENT")
                              ).toUpperCase() === "URGENT"
                                ? "text-red-700 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800/60 dark:text-red-300"
                                : (
                                      depotPriorities[depot.depotId] ||
                                      (priorityLevels[0]?.key ?? "URGENT")
                                    ).toUpperCase() === "HIGH"
                                  ? "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/60 dark:text-amber-300"
                                  : (
                                        depotPriorities[depot.depotId] ||
                                        (priorityLevels[0]?.key ?? "URGENT")
                                      ).toUpperCase() === "MEDIUM"
                                    ? "text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800/60 dark:text-sky-300"
                                    : "",
                            )}
                          >
                            <SelectValue placeholder="Chọn mức ưu tiên" />
                          </SelectTrigger>
                          <SelectContent
                            disablePortal
                            position="popper"
                            sideOffset={4}
                          >
                            {priorityLevels.map((level) => (
                              <SelectItem
                                key={level.key}
                                value={level.key}
                                className={
                                  level.key.toUpperCase() === "URGENT"
                                    ? "text-red-700 focus:text-red-800 focus:bg-red-50 font-medium"
                                    : level.key.toUpperCase() === "HIGH"
                                      ? "text-amber-700 focus:text-amber-800 focus:bg-amber-50 font-medium"
                                      : level.key.toUpperCase() === "MEDIUM"
                                        ? "text-sky-700 focus:text-sky-800 focus:bg-sky-50 font-medium"
                                        : ""
                                }
                              >
                                {level.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground tracking-tighter">
                          Ghi chú
                        </Label>
                        <Textarea
                          placeholder="Nhập ghi chú (nếu có)..."
                          className="min-h-14 resize-none px-3 py-2"
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
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4 bg-background/95 shrink-0">
          <Button
            type="button"
            className="w-full gap-2"
            onClick={handleSubmitSupplyRequests}
            disabled={
              groupedSelectedDepots.length === 0 ||
              isSubmittingRequest ||
              hasInsufficientItems
            }
          >
            <PaperPlaneTilt size={16} />
            {isSubmittingRequest
              ? "Đang gửi yêu cầu..."
              : "Gửi yêu cầu tiếp tế"}
          </Button>
        </div>
      </div>

      {flyTokens.length > 0 &&
        typeof document !== "undefined" &&
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
                transition:
                  "transform 900ms cubic-bezier(0.16, 1, 0.3, 1), opacity 900ms ease",
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
