import { useState } from "react";
import { useMyDepotInventory, useInventoryCategories, useInventoryItemTypes, useInventoryTargetGroups } from "@/services/inventory/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MagnifyingGlass, Package, ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryItemEntity } from "@/services/inventory/type";

interface VatTuSectionProps {
  onItemSelect?: (item: InventoryItemEntity) => void;
}

export function VatTuSection({ onItemSelect }: VatTuSectionProps) {
  const [page, setPage] = useState(1);
  const [selectedCategoryCodes, setSelectedCategoryCodes] = useState<string[]>([]);
  const [selectedItemTypes, setSelectedItemTypes] = useState<string[]>([]);
  const [selectedTargetGroups, setSelectedTargetGroups] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("name_asc");

  const { data: categories } = useInventoryCategories();
  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: targetGroupsData } = useInventoryTargetGroups();

  const { data: inventoryData, isLoading, isError } = useMyDepotInventory({
    pageNumber: page,
    pageSize: 10,
    categoryCode:
      selectedCategoryCodes.length > 0 ? selectedCategoryCodes : undefined,
    itemTypes: selectedItemTypes.length > 0 ? selectedItemTypes : undefined,
    targetGroups: selectedTargetGroups.length > 0 ? selectedTargetGroups : undefined,
  });

  const toggleCategory = (code: string) => {
    setSelectedCategoryCodes((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );
    setPage(1);
  };

  const toggleItemType = (type: string) => {
    setSelectedItemTypes(prev =>
      prev.includes(type) ? prev.filter(x => x !== type) : [...prev, type]
    );
    setPage(1);
  };

  const toggleTargetGroup = (group: string) => {
    setSelectedTargetGroups(prev =>
      prev.includes(group) ? prev.filter(x => x !== group) : [...prev, group]
    );
    setPage(1);
  };

  return (
    <div className="flex flex-col bg-background/50 border border-border/40 animate-in fade-in duration-300 mt-6">
      {/* Filter Header - Minimalist Editorial Style */}
      <div className="p-4 border-b border-border/40 space-y-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm vật tư theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-none border-x-0 border-t-0 border-b border-black/20 dark:border-white/20 bg-transparent focus-visible:ring-0 focus-visible:border-black dark:focus-visible:border-white transition-all text-sm"
          />
        </div>

        {/* Filter Chips */}
        <div className="space-y-2">
          {/* Category chips */}
          <div className="flex flex-wrap gap-0">
            <span className="text-[14px] text-primary tracking-tighter font-semibold mr-2 self-center">Danh mục:</span>
            {categories?.map((cat) => {
              const isActive = selectedCategoryCodes.includes(cat.key);
              return (
                <button
                  key={cat.key}
                  onClick={() => toggleCategory(cat.key)}
                  className={`px-3 py-2 text-sm tracking-tighter border transition-all ${isActive
                    ? "bg-[#FF5722] text-white border-[#FF5722]"
                    : "bg-transparent border-black/10 dark:border-white/10 text-foreground hover:bg-[#FF5722]/10 hover:border-[#FF5722]/40 hover:text-[#FF5722]"
                    }`}
                >
                  {cat.value}
                </button>
              );
            })}
          </div>

          {/* Item type chips */}
          <div className="flex flex-wrap gap-0">
            <span className="text-[14px] text-primary tracking-tighter font-semibold mr-2 self-center">Loại:</span>
            {itemTypesData?.map((type) => {
              const isActive = selectedItemTypes.includes(type.key);
              return (
                <button
                  key={type.key}
                  onClick={() => toggleItemType(type.key)}
                  className={`px-3 py-2 text-sm tracking-tighter border transition-all ${isActive
                    ? "bg-[#FF5722] text-white border-[#FF5722]"
                    : "bg-transparent border-black/10 dark:border-white/10 text-foreground hover:bg-[#FF5722]/10 hover:border-[#FF5722]/40 hover:text-[#FF5722]"
                    }`}
                >
                  {type.value}
                </button>
              );
            })}
          </div>

          {/* Target group chips */}
          <div className="flex flex-wrap gap-0">
            <span className="text-[14px] text-primary tracking-tighter font-semibold mr-2 self-center">Đối tượng:</span>
            {targetGroupsData?.map((group) => {
              const isActive = selectedTargetGroups.includes(group.key);
              return (
                <button
                  key={group.key}
                  onClick={() => toggleTargetGroup(group.key)}
                  className={`px-3 py-2 tracking-tighter text-sm border transition-all ${isActive
                    ? "bg-[#FF5722] text-white border-[#FF5722]"
                    : "bg-transparent border-black/10 dark:border-white/10 text-foreground hover:bg-[#FF5722]/10 hover:border-[#FF5722]/40 hover:text-[#FF5722]"
                    }`}
                >
                  {group.value}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort & Pagination Header */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[14px] tracking-tighter font-medium text-muted-foreground">
            {inventoryData?.totalCount || 0} kết quả
          </span>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-none data-[active=true]:bg-black data-[active=true]:text-white dark:data-[active=true]:bg-white dark:data-[active=true]:text-black"
              data-active={sortBy === "name_asc"}
              onClick={() => setSortBy("name_asc")}
              title="Theo Tên (A-Z)"
            >
              <ArrowUp weight="bold" className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-none data-[active=true]:bg-black data-[active=true]:text-white dark:data-[active=true]:bg-white dark:data-[active=true]:text-black"
              data-active={sortBy === "name_desc"}
              onClick={() => setSortBy("name_desc")}
              title="Theo Tên (Z-A)"
            >
              <ArrowDown weight="bold" className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square border border-border/40 p-3 flex flex-col justify-between">
                  <Skeleton className="h-3 w-3/4 mb-2" />
                  <Skeleton className="h-8 w-1/2" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center tracking-tighter text-red-500 py-8 text-xs font-medium uppercase">
              Lỗi tải dữ liệu
            </div>
          ) : inventoryData?.items.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 space-y-2">
              <Package className="h-8 w-8 mx-auto opacity-20" weight="thin" />
              <p className="text-sm tracking-tighter font-regular opacity-50">Không có dữ liệu</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {inventoryData?.items
                .filter(item => item.reliefItemName.toLowerCase().includes(search.toLowerCase()))
                .sort((a, b) => {
                  if (sortBy === "name_asc") return a.reliefItemName.localeCompare(b.reliefItemName);
                  if (sortBy === "name_desc") return b.reliefItemName.localeCompare(a.reliefItemName);
                  return 0;
                })
                .map((item) => {
                  // Determine stock status for border/color accents
                  const isOutOfStock = item.availableQuantity <= 0;
                  const isLowStock = item.availableQuantity > 0 && item.availableQuantity < 50; // Mock threshold

                  return (
                    <div
                      key={item.reliefItemId}
                      onClick={() => onItemSelect?.(item)}
                      className="group border border-black/10 dark:border-white/10 p-3 hover:border-[#FF5722] hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between aspect-square relative bg-card shadow-sm hover:shadow-md"
                    >
                      {/* Minimalist Top Indicator */}
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[12px] font-medium tracking-tighter uppercase text-muted-foreground truncate max-w-[70%]">
                          {item.categoryName}
                        </span>
                        <div className={`h-1.5 w-1.5 rounded-full ${isOutOfStock ? "bg-red-500" : isLowStock ? "bg-[#FF5722]" : "bg-black dark:bg-white"}`} />
                      </div>

                      {/* Item Name */}
                      <h3 className="text-lg font-bold tracking-tighter leading-tight group-hover:text-[#FF5722] transition-colors mb-2 line-clamp-3">
                        {item.reliefItemName}
                      </h3>

                      {/* Bottom Quantity Section */}
                      <div className="mt-auto border-t border-black/5 dark:border-white/5 pt-2 flex flex-col">
                        <span className="text-[12px] tracking-tighter text-muted-foreground uppercase mb-0.5 max-w-full truncate">
                          {itemTypesData?.find((t) => t.key === item.itemType)?.value ?? item.itemType}
                        </span>
                        <div className="flex items-end justify-between">
                          <span className="text-base font-black tracking-tighter">
                            {item.availableQuantity.toLocaleString()} <span className="text-[14px] font-normal text-muted-foreground uppercase">SL</span>
                          </span>
                        </div>
                      </div>

                      {/* Editorial Accent */}
                      <div className="absolute left-0 bottom-0 h-0.5 w-0 bg-[#FF5722] group-hover:w-full transition-all duration-300" />
                    </div>
                  );
                })}
            </div>
          )}

          {/* Pagination Controls */}
          {inventoryData && inventoryData.totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 rounded-none text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-black/20"
                disabled={!inventoryData.hasPreviousPage}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                TRƯỚC
              </Button>
              <div className="flex items-center">
                <span className="text-[10px] font-black tracking-widest text-[#FF5722]">
                  {page}
                </span>
                <span className="mx-1 text-[10px] text-muted-foreground">/</span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {inventoryData.totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 rounded-none text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border-black/20"
                disabled={!inventoryData.hasNextPage}
                onClick={() => setPage(p => p + 1)}
              >
                SAU
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
