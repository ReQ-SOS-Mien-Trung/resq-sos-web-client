"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowDown,
  ArrowUp,
  FloppyDisk,
  Package,
  PencilSimple,
  X,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  deleteCloudinaryImages,
  uploadImageToCloudinaryWithId,
} from "@/utils/uploadFile";
import {
  useInventoryItemTypes,
  useInventoryTargetGroups,
} from "@/services/inventory/hooks";
import { useItemCategories } from "@/services/item_categories/hooks";
import {
  useItemModels,
  useUpdateItemModel,
  type ItemModelEntity,
  type UpdateItemModelPayload,
} from "@/services/item_model";

const ALL_VALUE = "__all";
const PAGE_SIZE = 16;
const REUSABLE_ITEM_TYPE = "Reusable";
const RESCUER_TARGET_GROUP = "Rescuer";

type SortMode = "name_asc" | "name_desc";
type SheetMode = "detail" | "edit";

interface ItemModelFormState {
  categoryId: string;
  name: string;
  description: string;
  unit: string;
  itemType: string;
  targetGroups: string[];
  imageUrl: string;
  volumePerUnit: string;
  weightPerUnit: string;
}

function createFormState(item?: ItemModelEntity | null): ItemModelFormState {
  return {
    categoryId: item ? String(item.categoryId) : "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    unit: item?.unit ?? "",
    itemType: item?.itemType ?? "",
    targetGroups:
      item?.itemType === REUSABLE_ITEM_TYPE
        ? [RESCUER_TARGET_GROUP]
        : (item?.targetGroups ?? []),
    imageUrl: item?.imageUrl ?? "",
    volumePerUnit:
      item?.volumePerUnit != null ? String(item.volumePerUnit) : "",
    weightPerUnit:
      item?.weightPerUnit != null ? String(item.weightPerUnit) : "",
  };
}

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN", {
    maximumFractionDigits: 3,
  });
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null) return fallback;
  const response = (error as { response?: { data?: { message?: string } } })
    .response;
  return response?.data?.message ?? fallback;
}

export function AdminItemModels() {
  const [categoryFilter, setCategoryFilter] = useState(ALL_VALUE);
  const [itemTypeFilter, setItemTypeFilter] = useState(ALL_VALUE);
  const [sortMode, setSortMode] = useState<SortMode>("name_asc");
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<ItemModelEntity | null>(
    null,
  );
  const [sheetMode, setSheetMode] = useState<SheetMode>("detail");
  const [form, setForm] = useState<ItemModelFormState>(() => createFormState());
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const categoryId =
    categoryFilter === ALL_VALUE ? undefined : Number(categoryFilter);
  const itemType = itemTypeFilter === ALL_VALUE ? undefined : itemTypeFilter;

  const {
    data: itemModels = [],
    isLoading: isLoadingItemModels,
    isFetching: isFetchingItemModels,
    isError,
    refetch,
  } = useItemModels({
    categoryId,
    itemType,
  });
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useItemCategories({ params: { pageNumber: 1, pageSize: 100 } });
  const { data: itemTypes = [] } = useInventoryItemTypes();
  const { data: targetGroups = [] } = useInventoryTargetGroups();
  const updateMutation = useUpdateItemModel();

  const categories = categoriesData?.items ?? [];
  const itemTypeLabelMap = useMemo(
    () =>
      Object.fromEntries(
        itemTypes.map((type) => [String(type.key), String(type.value)]),
      ),
    [itemTypes],
  );
  const targetGroupLabelMap = useMemo(
    () =>
      Object.fromEntries(
        targetGroups.map((group) => [String(group.key), String(group.value)]),
      ),
    [targetGroups],
  );

  const filteredItems = useMemo(() => {
    return [...itemModels].sort((a, b) => {
      const result = a.name.localeCompare(b.name, "vi-VN");
      return sortMode === "name_asc" ? result : -result;
    });
  }, [itemModels, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = filteredItems.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const consumableCount = itemModels.filter(
    (item) => item.itemType === "Consumable",
  ).length;
  const reusableCount = itemModels.filter(
    (item) => item.itemType === "Reusable",
  ).length;

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, itemTypeFilter, sortMode]);

  useEffect(() => {
    setForm(createFormState(selectedItem));
    setPendingImageFile(null);
    setPendingImagePreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
  }, [selectedItem]);

  useEffect(() => {
    return () => {
      if (pendingImagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pendingImagePreviewUrl);
      }
    };
  }, [pendingImagePreviewUrl]);

  const clearFilters = () => {
    setCategoryFilter(ALL_VALUE);
    setItemTypeFilter(ALL_VALUE);
    setSortMode("name_asc");
    setPage(1);
  };

  const handleTargetGroupToggle = (key: string, checked: boolean) => {
    if (form.itemType === REUSABLE_ITEM_TYPE) {
      setForm((current) => ({
        ...current,
        targetGroups: [RESCUER_TARGET_GROUP],
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      targetGroups: checked
        ? [...new Set([...current.targetGroups, key])]
        : current.targetGroups.filter((item) => item !== key),
    }));
  };

  const handleItemTypeChange = (value: string) => {
    setForm((current) => ({
      ...current,
      itemType: value,
      targetGroups:
        value === REUSABLE_ITEM_TYPE
          ? [RESCUER_TARGET_GROUP]
          : current.targetGroups.filter(
              (group) => group !== RESCUER_TARGET_GROUP,
            ),
    }));
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh.");
      return;
    }

    setPendingImageFile(file);
    setPendingImagePreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const resetPendingImage = () => {
    setPendingImageFile(null);
    setPendingImagePreviewUrl((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
  };

  const buildPayload = (): UpdateItemModelPayload | null => {
    const payload: UpdateItemModelPayload = {
      categoryId: Number(form.categoryId),
      name: form.name.trim(),
      description: form.description.trim(),
      unit: form.unit.trim(),
      itemType: form.itemType,
      targetGroups: form.targetGroups,
      imageUrl: form.imageUrl.trim(),
      volumePerUnit: Number(form.volumePerUnit),
      weightPerUnit: Number(form.weightPerUnit),
    };

    if (!Number.isFinite(payload.categoryId) || payload.categoryId <= 0) {
      toast.error("Vui lòng chọn danh mục.");
      return null;
    }
    if (!payload.name) {
      toast.error("Vui lòng nhập tên item model.");
      return null;
    }
    if (!payload.unit) {
      toast.error("Vui lòng nhập đơn vị.");
      return null;
    }
    if (!payload.itemType) {
      toast.error("Vui lòng chọn loại vật phẩm.");
      return null;
    }
    if (
      payload.itemType === REUSABLE_ITEM_TYPE &&
      (payload.targetGroups.length !== 1 ||
        payload.targetGroups[0] !== RESCUER_TARGET_GROUP)
    ) {
      toast.error("Vật phẩm tái sử dụng chỉ được chọn Lực lượng cứu hộ.");
      return null;
    }
    if (
      !Number.isFinite(payload.volumePerUnit) ||
      payload.volumePerUnit < 0 ||
      !Number.isFinite(payload.weightPerUnit) ||
      payload.weightPerUnit < 0
    ) {
      toast.error("Thể tích và khối lượng phải là số không âm.");
      return null;
    }

    return payload;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItem) return;

    const payload = buildPayload();
    if (!payload) return;

    let uploadedPublicId: string | null = null;

    if (pendingImageFile) {
      try {
        setIsUploadingImage(true);
        const uploaded = await uploadImageToCloudinaryWithId(
          pendingImageFile,
          "resq/item-models",
          "resq/item-models",
        );
        payload.imageUrl = uploaded.secureUrl;
        uploadedPublicId = uploaded.publicId;
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, "Upload ảnh Cloudinary thất bại."),
        );
        setIsUploadingImage(false);
        return;
      } finally {
        setIsUploadingImage(false);
      }
    }

    try {
      await updateMutation.mutateAsync({ id: selectedItem.id, payload });
      toast.success("Đã cập nhật item model.");
      setPendingImageFile(null);
      setPendingImagePreviewUrl((current) => {
        if (current.startsWith("blob:")) URL.revokeObjectURL(current);
        return "";
      });
      setSelectedItem(null);
    } catch (error) {
      if (uploadedPublicId) {
        await deleteCloudinaryImages([uploadedPublicId]);
      }
      toast.error(getApiErrorMessage(error, "Không thể cập nhật item model."));
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter text-foreground leading-tight">
                Quản lý item model
              </h1>
            </div>
          </div>
          <p className="max-w-2xl text-sm tracking-tighter text-muted-foreground">
            Danh sách mẫu vật phẩm dùng chung cho nhập kho, phân phối và điều
            phối cứu trợ.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:w-[420px]">
          <div className="border border-border/60 bg-background px-3 py-2 shadow-sm">
            <p className="text-xs tracking-tighter text-muted-foreground">
              Tổng model
            </p>
            <p className="text-xl font-black tracking-tighter">
              {itemModels.length.toLocaleString("vi-VN")}
            </p>
          </div>
          <div className="border border-border/60 bg-background px-3 py-2 shadow-sm">
            <p className="text-xs tracking-tighter text-muted-foreground">
              Tiêu thụ
            </p>
            <p className="text-xl font-black tracking-tighter text-orange-600">
              {consumableCount.toLocaleString("vi-VN")}
            </p>
          </div>
          <div className="border border-border/60 bg-background px-3 py-2 shadow-sm">
            <p className="text-xs tracking-tighter text-muted-foreground">
              Tái sử dụng
            </p>
            <p className="text-xl font-black tracking-tighter text-blue-600">
              {reusableCount.toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
      </div>

      <div className="border border-border/50 bg-background/85 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/50 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 w-full rounded-none tracking-tighter">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Tất cả danh mục</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
              <SelectTrigger className="h-10 w-full rounded-none tracking-tighter">
                <SelectValue placeholder="Loại vật phẩm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Tất cả loại</SelectItem>
                {itemTypes.map((type) => (
                  <SelectItem key={type.key} value={String(type.key)}>
                    {type.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
            <div className="grid grid-cols-2 gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-none"
                data-active={sortMode === "name_asc"}
                onClick={() => setSortMode("name_asc")}
                title="Sắp xếp A-Z"
              >
                <ArrowUp size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-none"
                data-active={sortMode === "name_desc"}
                onClick={() => setSortMode("name_desc")}
                title="Sắp xếp Z-A"
              >
                <ArrowDown size={16} />
              </Button>
            </div>
            <Button
              variant="outline"
              className="h-10 flex-1 rounded-none gap-2 sm:flex-none"
              onClick={clearFilters}
            >
              <X size={15} />
              Xóa lọc
            </Button>
            <Button
              className="h-10 flex-1 rounded-none gap-2 bg-orange-600 text-white hover:bg-orange-700 sm:flex-none"
              onClick={() => void refetch()}
              disabled={isFetchingItemModels}
            >
              <ArrowClockwise
                size={15}
                className={cn(isFetchingItemModels && "animate-spin")}
              />
              Tải lại
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-medium tracking-tighter text-muted-foreground">
            {filteredItems.length.toLocaleString("vi-VN")} kết quả
          </p>
          <div className="flex flex-wrap gap-1.5">
            {categoryFilter !== ALL_VALUE && (
              <Badge variant="outline" className="rounded-none">
                {categories.find(
                  (category) => String(category.id) === categoryFilter,
                )?.name ?? "Danh mục"}
              </Badge>
            )}
            {itemTypeFilter !== ALL_VALUE && (
              <Badge variant="outline" className="rounded-none">
                {itemTypeLabelMap[itemTypeFilter] ?? itemTypeFilter}
              </Badge>
            )}
          </div>
        </div>

        <div className="px-4 py-2">
          {isLoadingItemModels || isLoadingCategories ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="border border-border/50 bg-card p-3"
                >
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="mt-3 aspect-4/3 w-full" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
              <Package size={36} className="text-red-500" weight="duotone" />
              <p className="text-sm font-semibold tracking-tighter text-red-600">
                Không tải được danh sách item model.
              </p>
              <Button
                variant="outline"
                className="rounded-none gap-2"
                onClick={() => void refetch()}
              >
                <ArrowClockwise size={15} />
                Thử lại
              </Button>
            </div>
          ) : pageItems.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Package size={40} className="opacity-30" weight="thin" />
              <p className="text-sm tracking-tighter">
                Không có item model phù hợp.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {pageItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSheetMode("detail");
                    setSelectedItem(item);
                  }}
                  className="group relative flex min-h-[430px] flex-col border border-black/10 bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-orange-500 hover:shadow-md dark:border-white/10"
                >
                  <div className="min-h-20 space-y-2">
                    <h2 className="line-clamp-2 text-lg font-black leading-tight tracking-tighter transition-colors group-hover:text-orange-600">
                      {item.name}
                    </h2>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="max-w-full whitespace-normal rounded-none px-2 py-1 text-left text-xs leading-tight text-muted-foreground"
                      >
                        {item.categoryName}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 rounded-none px-2 py-1 text-xs",
                          item.itemType === "Reusable"
                            ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                            : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
                        )}
                      >
                        {itemTypeLabelMap[item.itemType] ?? item.itemType}
                      </Badge>
                    </div>
                  </div>

                  <div className="my-1 flex h-60 items-center justify-center overflow-hidden bg-muted/30">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <Package size={34} className="text-muted-foreground/30" />
                    )}
                  </div>

                  <div className="mt-auto space-y-3 border-t border-border/50 pt-3">
                    <div className="grid grid-cols-3 gap-2 text-xs tracking-tighter">
                      <div>
                        <p className="text-muted-foreground">Đơn vị</p>
                        <p className="font-bold">{item.unit || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Khối lượng/kg</p>
                        <p className="font-bold">
                          {formatNumber(item.weightPerUnit)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Thể tích/dm³</p>
                        <p className="font-bold">
                          {formatNumber(item.volumePerUnit)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.targetGroups.slice(0, 3).map((group) => (
                        <span
                          key={group}
                          className="border border-border/50 px-1.5 py-0.5 text-[11px] font-medium tracking-tighter text-muted-foreground"
                        >
                          {targetGroupLabelMap[group] ?? group}
                        </span>
                      ))}
                      {item.targetGroups.length > 3 && (
                        <span className="border border-border/50 px-1.5 py-0.5 text-[11px] font-medium tracking-tighter text-muted-foreground">
                          +{item.targetGroups.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-orange-500 transition-all duration-300 group-hover:w-full" />
                </button>
              ))}
            </div>
          )}

          {filteredItems.length > PAGE_SIZE && (
            <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
              <Button
                variant="outline"
                className="h-9 rounded-none"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Trước
              </Button>
              <p className="text-sm font-semibold tracking-tighter">
                {page} / {totalPages}
              </p>
              <Button
                variant="outline"
                className="h-9 rounded-none"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
            setSheetMode("detail");
          }
        }}
      >
        <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-3xl">
          <SheetHeader className="border-b border-border/50 pb-4 pr-6">
            <div className="flex items-center gap-2">
              {sheetMode === "edit" ? (
                <PencilSimple size={24} className="text-orange-600" />
              ) : (
                <Package size={24} className="text-orange-600" />
              )}
              <SheetTitle className="tracking-tighter text-3xl font-bold">
                {sheetMode === "edit"
                  ? "Cập nhật item model"
                  : "Chi tiết item model"}
              </SheetTitle>
            </div>
            <SheetDescription className="tracking-tighter text-base">
              {selectedItem ? `Item Model Id: ${selectedItem.id}` : ""}
            </SheetDescription>
          </SheetHeader>

          {selectedItem && sheetMode === "detail" && (
            <div className="flex flex-1 flex-col">
              <div className="grid flex-1 gap-5 py-2">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
                  <div className="space-y-4">
                    <div>
                      <h2 className="min-w-0 text-3xl font-bold leading-tight tracking-tighter">
                        {selectedItem.name}
                      </h2>
                    </div>

                    <div className="grid gap-2">
                      <p className="text-sm font-semibold tracking-tighter text-muted-foreground">
                        Mô tả
                      </p>
                      <p className="min-h-38 rounded-none border border-border/50 bg-background p-3 text-sm leading-6 tracking-tighter">
                        {selectedItem.description || "Chưa có mô tả"}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="border border-border/50 bg-background p-3">
                        <p className="text-xs tracking-tighter text-muted-foreground">
                          Danh mục
                        </p>
                        <p className="mt-1 text-base font-black tracking-tighter">
                          {selectedItem.categoryName}
                        </p>
                      </div>
                      <div className="border border-border/50 bg-background p-3">
                        <p className="text-xs tracking-tighter text-muted-foreground">
                          Loại vật phẩm
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-base font-black tracking-tighter",
                            selectedItem.itemType === "Reusable"
                              ? "text-blue-600 dark:text-blue-300"
                              : "text-orange-600 dark:text-orange-300",
                          )}
                        >
                          {itemTypeLabelMap[selectedItem.itemType] ??
                            selectedItem.itemType}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex h-80 items-center justify-center overflow-hidden border border-border/50 bg-muted/30">
                    {selectedItem.imageUrl ? (
                      <img
                        src={selectedItem.imageUrl}
                        alt={selectedItem.name}
                        className="h-full w-full object-contain p-4"
                      />
                    ) : (
                      <Package size={42} className="text-muted-foreground/30" />
                    )}
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 border border-border/50 bg-background p-4 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-base font-semibold tracking-tighter text-muted-foreground sm:pt-2">
                    Đối tượng
                  </p>
                  <div className="flex flex-wrap gap-2.5 sm:justify-end">
                    {selectedItem.targetGroups.length > 0 ? (
                      selectedItem.targetGroups.map((group) => (
                        <Badge
                          key={group}
                          variant="outline"
                          className="rounded-none px-3 py-2 text-base"
                        >
                          {targetGroupLabelMap[group] ?? group}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm tracking-tighter text-muted-foreground">
                        —
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="border border-border/50 bg-background px-2 flex items-center justify-between gap-3">
                    <p className="text-sm tracking-tighter text-muted-foreground shrink-0">
                      Đơn vị
                    </p>
                    <p className="text-base font-bold tracking-tighter">
                      {selectedItem.unit || "—"}
                    </p>
                  </div>
                  <div className="border border-border/50 bg-background px-2 flex items-center justify-between gap-3">
                    <p className="text-sm tracking-tighter text-muted-foreground shrink-0">
                      Thể tích/dm³
                    </p>
                    <p className="text-sbasem font-bold tracking-tighter">
                      {formatNumber(selectedItem.volumePerUnit)}
                    </p>
                  </div>
                  <div className="border border-border/50 bg-background px-2 flex items-center justify-between gap-3">
                    <p className="text-sm tracking-tighter text-muted-foreground shrink-0">
                      Khối lượng/kg
                    </p>
                    <p className="text-base font-bold tracking-tighter">
                      {formatNumber(selectedItem.weightPerUnit)}
                    </p>
                  </div>
                </div>
              </div>

              <SheetFooter className="border-t border-border/50 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => setSelectedItem(null)}
                >
                  Đóng
                </Button>
                <Button
                  type="button"
                  className="rounded-none gap-2 bg-orange-600 text-white hover:bg-orange-700"
                  onClick={() => setSheetMode("edit")}
                >
                  <PencilSimple size={16} />
                  Chỉnh sửa
                </Button>
              </SheetFooter>
            </div>
          )}

          {sheetMode === "edit" && (
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
              <div className="grid flex-1 gap-4 py-1">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="grid gap-2">
                    <Label htmlFor="item-model-name">Tên item model</Label>
                    <Input
                      id="item-model-name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="rounded-none"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Danh mục</Label>
                    <Select
                      value={form.categoryId || undefined}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          categoryId: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-auto min-h-[46px] w-full rounded-none px-4 py-3">
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem
                            key={category.id}
                            value={String(category.id)}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label>Loại vật phẩm</Label>
                    <Select
                      value={form.itemType || undefined}
                      onValueChange={handleItemTypeChange}
                    >
                      <SelectTrigger className="h-auto min-h-[46px] w-full rounded-none px-4 py-3">
                        <SelectValue placeholder="Chọn loại" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemTypes.map((type) => (
                          <SelectItem key={type.key} value={String(type.key)}>
                            {type.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="item-model-description">Mô tả</Label>
                  <Textarea
                    id="item-model-description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="min-h-24 rounded-none"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="item-model-unit">Đơn vị</Label>
                    <Input
                      id="item-model-unit"
                      value={form.unit}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          unit: event.target.value,
                        }))
                      }
                      className="rounded-none"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="item-model-volume">Thể tích/dm³</Label>
                    <Input
                      id="item-model-volume"
                      type="number"
                      min="0"
                      step="0.001"
                      value={form.volumePerUnit}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          volumePerUnit: event.target.value,
                        }))
                      }
                      className="rounded-none"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="item-model-weight">Khối lượng/kg</Label>
                    <Input
                      id="item-model-weight"
                      type="number"
                      min="0"
                      step="0.001"
                      value={form.weightPerUnit}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          weightPerUnit: event.target.value,
                        }))
                      }
                      className="rounded-none"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Ảnh item model</Label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="group relative flex h-72 w-full items-center justify-center overflow-hidden border border-border/60 bg-muted/30"
                  >
                    {pendingImagePreviewUrl || form.imageUrl ? (
                      <img
                        src={pendingImagePreviewUrl || form.imageUrl}
                        alt={form.name || "Ảnh item model"}
                        className="h-full w-full object-contain p-4"
                      />
                    ) : (
                      <Package size={42} className="text-muted-foreground/30" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold tracking-tighter text-white opacity-0 transition-opacity group-hover:opacity-100">
                      Thay ảnh
                    </span>
                  </button>
                  {pendingImageFile && (
                    <p className="text-xs tracking-tighter text-muted-foreground">
                      Ảnh mới: {pendingImageFile.name}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label>Nhóm đối tượng</Label>
                  <div className="grid gap-2 rounded-none border border-border/60 p-3 sm:grid-cols-2">
                    {targetGroups.map((group) => {
                      const key = String(group.key);
                      const isReusableForm =
                        form.itemType === REUSABLE_ITEM_TYPE;
                      const isDisabledTargetGroup =
                        isReusableForm && key !== RESCUER_TARGET_GROUP;
                      return (
                        <label
                          key={key}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 text-sm tracking-tighter",
                            isDisabledTargetGroup &&
                              "cursor-not-allowed opacity-45",
                          )}
                        >
                          <Checkbox
                            checked={
                              isReusableForm
                                ? key === RESCUER_TARGET_GROUP
                                : form.targetGroups.includes(key)
                            }
                            disabled={isDisabledTargetGroup}
                            onCheckedChange={(checked) =>
                              handleTargetGroupToggle(key, checked === true)
                            }
                          />
                          {group.value}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <SheetFooter className="border-t border-border/50 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none gap-2"
                  onClick={() => {
                    setForm(createFormState(selectedItem));
                    resetPendingImage();
                  }}
                  disabled={updateMutation.isPending || isUploadingImage}
                >
                  <ArrowCounterClockwise size={16} />
                  Hoàn tác
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => {
                    setForm(createFormState(selectedItem));
                    resetPendingImage();
                    setSheetMode("detail");
                  }}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="rounded-none gap-2 bg-orange-600 text-white hover:bg-orange-700"
                  disabled={updateMutation.isPending || isUploadingImage}
                >
                  <FloppyDisk size={16} />
                  {updateMutation.isPending || isUploadingImage
                    ? "Đang lưu..."
                    : "Lưu thay đổi"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
