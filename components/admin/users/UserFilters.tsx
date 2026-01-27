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
import { Search, X } from "lucide-react";
import type { UserFilters as UserFiltersType } from "@/types/admin-pages";

interface UserFiltersProps {
  filters: UserFiltersType;
  onFiltersChange: (filters: UserFiltersType) => void;
}

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
  const handleReset = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên, email..."
            value={filters.search || ""}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="pl-10"
          />
        </div>
      </div>

      <Select
        value={filters.role || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            role: value === "all" ? undefined : (value as UserFiltersType["role"]),
          })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Vai trò" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả vai trò</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="coordinator">Điều phối</SelectItem>
          <SelectItem value="rescuer">Cứu hộ viên</SelectItem>
          <SelectItem value="citizen">Công dân</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.status || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            status: value === "all" ? undefined : (value as UserFiltersType["status"]),
          })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="active">Đang hoạt động</SelectItem>
          <SelectItem value="pending">Đang chờ</SelectItem>
          <SelectItem value="banned">Bị cấm</SelectItem>
          <SelectItem value="inactive">Không hoạt động</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.region || "all"}
        onValueChange={(value) =>
          onFiltersChange({
            ...filters,
            region: value === "all" ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Khu vực" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả khu vực</SelectItem>
          <SelectItem value="Thừa Thiên Huế">Thừa Thiên Huế</SelectItem>
          <SelectItem value="Đà Nẵng">Đà Nẵng</SelectItem>
          <SelectItem value="Quảng Nam">Quảng Nam</SelectItem>
          <SelectItem value="Quảng Ngãi">Quảng Ngãi</SelectItem>
          <SelectItem value="Bình Định">Bình Định</SelectItem>
        </SelectContent>
      </Select>

      {(filters.role || filters.status || filters.region || filters.search) && (
        <Button variant="outline" size="sm" onClick={handleReset}>
          <X className="h-4 w-4 mr-1" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
