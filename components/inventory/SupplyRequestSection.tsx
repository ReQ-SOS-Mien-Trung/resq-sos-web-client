"use client";

import { useMemo, useState } from "react";
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
  Plus,
  Trash,
  MagnifyingGlass,
  Warehouse,
  MapPin,
  Package,
} from "@phosphor-icons/react";
import {
  useInventoryReliefItemsByCategory,
  useSearchDepotsByReliefItems,
} from "@/services/inventory";
import { SearchDepotsParams } from "@/services/inventory/type";
import { toast } from "sonner";

type CategoryOption = {
  id: number;
  code: string;
  name: string;
};

type RequestLine = {
  id: string;
  categoryCode: string;
  reliefItemKey: string;
  quantity: string;
};

interface SupplyRequestSectionProps {
  categories: CategoryOption[];
}

const DEPOT_STATUS_LABELS: Record<string, string> = {
  Available: "Có sẵn",
  Full: "Đầy kho",
  PendingAssignment: "Chờ phân công",
  Closed: "Đóng cửa",
};

function RequestLineRow({
  line,
  categories,
  canRemove,
  onChange,
  onRemove,
}: {
  line: RequestLine;
  categories: CategoryOption[];
  canRemove: boolean;
  onChange: (id: string, patch: Partial<RequestLine>) => void;
  onRemove: (id: string) => void;
}) {
  const { data: reliefItems, isLoading: isLoadingReliefItems } =
    useInventoryReliefItemsByCategory(line.categoryCode, {
      enabled: !!line.categoryCode,
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 py-3">
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
        >
          <SelectTrigger className="w-full h-10 leading-normal">
            <SelectValue placeholder="Chọn danh mục" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.code}>
                {cat.name}
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

export default function SupplyRequestSection({ categories }: SupplyRequestSectionProps) {
  const [lines, setLines] = useState<RequestLine[]>([
    { id: crypto.randomUUID(), categoryCode: "", reliefItemKey: "", quantity: "" },
  ]);
  const [submittedParams, setSubmittedParams] =
    useState<SearchDepotsParams | null>(null);

  const queryParams = submittedParams ?? {
    reliefItemIds: [],
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

    const reliefItemIds = lines.map((line) => Number(line.reliefItemKey));
    const quantities = lines.map((line) => Number(line.quantity));

    setSubmittedParams({
      reliefItemIds,
      quantities,
      activeDepotsOnly: true,
      pageNumber: 1,
      pageSize: 10,
    });
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
          <div className="rounded-lg border border-border/60 bg-card px-3 lg:px-4">
            <div className="hidden lg:grid lg:grid-cols-12 gap-3 py-2 border-b border-border/60">
              <p className="lg:col-span-4 text-xs text-muted-foreground tracking-tighter">
                Danh mục
              </p>
              <p className="lg:col-span-5 text-xs text-muted-foreground tracking-tighter">
                Vật tư tiếp tế
              </p>
              <p className="lg:col-span-2 text-xs text-muted-foreground tracking-tighter">
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
            <CardTitle className="text-base font-semibold tracking-tighter flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-primary" />
              Kết quả tìm kho
               {!isSearching && (
              <CardDescription className="tracking-tighter text-muted-foreground text-sm">
                {(searchResult?.items?.length ?? 0)} vật tư • {totalWarehouses} kho phù hợp
              </CardDescription>
            )}
            </CardTitle>
           
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
                  <Card key={item.reliefItemId} className="border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <CardTitle className="text-[16px] font-semibold tracking-tighter">
                            {item.reliefItemName}
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
                          <div
                            key={`${item.reliefItemId}-${warehouse.depotId}`}
                            className="rounded-lg border border-border/60 p-4 bg-muted/20"
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
    </div>
  );
}
