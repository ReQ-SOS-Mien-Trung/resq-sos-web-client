"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReportFiltersProps, RescueReport } from "@/type";
import { MagnifyingGlass, X, DownloadSimple } from "@phosphor-icons/react";

const ReportFilters = ({
  filters,
  onFiltersChange,
  onExport,
}: ReportFiltersProps) => {
  const handleReset = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex-1 min-w-52">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Tìm kiếm..."
            value={filters.search || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pl-10"
          />
        </div>
      </div>

      <Select
        value={filters.type || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            type: value === "all" ? undefined : (value as RescueReport["type"]),
          })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Loại" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả loại</SelectItem>
          <SelectItem value="rescue">Cứu hộ</SelectItem>
          <SelectItem value="evacuation">Sơ tán</SelectItem>
          <SelectItem value="supply">Cung cấp</SelectItem>
          <SelectItem value="medical">Y tế</SelectItem>
          <SelectItem value="other">Khác</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            status:
              value === "all" ? undefined : (value as RescueReport["status"]),
          })
        }
      >
        <SelectTrigger className="w-45">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="pending">Đang chờ</SelectItem>
          <SelectItem value="in-progress">Đang xử lý</SelectItem>
          <SelectItem value="completed">Hoàn thành</SelectItem>
          <SelectItem value="cancelled">Đã hủy</SelectItem>
        </SelectContent>
      </Select>

      {(filters.type || filters.status || filters.region || filters.search) && (
        <Button variant="outline" size="sm" onClick={handleReset}>
          <X size={16} className="mr-1" />
          Xóa bộ lọc
        </Button>
      )}

      <Button variant="default" size="sm" onClick={onExport}>
        <DownloadSimple size={16} className="mr-1" />
        Xuất
      </Button>
    </div>
  );
};

export default ReportFilters;
