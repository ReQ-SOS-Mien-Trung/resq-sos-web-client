"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MagnifyingGlass, X, Check, CaretDown } from "@phosphor-icons/react";
import { UserFiltersProps, UserFilters as UserFiltersType, User } from "@/type";

const ROLES: { value: User["role"]; label: string }[] = [
  { value: "admin", label: "Quản trị viên" },
  { value: "coordinator", label: "Điều phối viên" },
  { value: "rescuer", label: "Cứu hộ viên" },
  { value: "victim", label: "Công dân" },
];

const STATUSES: { value: User["status"]; label: string }[] = [
  { value: "active", label: "Hoạt động" },
  { value: "banned", label: "Bị cấm" },
];

const UserFilters = ({ filters, onFiltersChange }: UserFiltersProps) => {
  const [roleOpen, setRoleOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const toggleRole = (role: User["role"]) => {
    const current = filters.roles ?? [];
    const next = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    onFiltersChange({ ...filters, roles: next.length ? next : undefined });
  };

  const toggleStatus = (status: User["status"]) => {
    const current = filters.statuses ?? [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, statuses: next.length ? next : undefined });
  };

  const hasFilters = !!(
    filters.roles?.length ||
    filters.statuses?.length ||
    filters.search
  );

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
      {/* Search */}
      <div className="flex-1 min-w-50">
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Tìm kiếm theo tên, email..."
            value={filters.search || ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                search: e.target.value || undefined,
              })
            }
            className="pl-10"
          />
        </div>
      </div>

      {/* Role multi-select */}
      <Popover open={roleOpen} onOpenChange={setRoleOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 font-normal">
            Vai trò
            {filters.roles?.length ? (
              <Badge className="h-5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
                {filters.roles.length}
              </Badge>
            ) : (
              <CaretDown size={13} className="text-muted-foreground" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-1.5" align="start">
          {ROLES.map(({ value, label }) => {
            const checked = filters.roles?.includes(value) ?? false;
            return (
              <button
                key={value}
                onClick={() => toggleRole(value)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md hover:bg-muted/60 transition-colors"
              >
                <span className={checked ? "font-medium" : ""}>{label}</span>
                {checked && <Check size={14} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Status multi-select */}
      <Popover open={statusOpen} onOpenChange={setStatusOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 font-normal">
            Trạng thái
            {filters.statuses?.length ? (
              <Badge className="h-5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
                {filters.statuses.length}
              </Badge>
            ) : (
              <CaretDown size={13} className="text-muted-foreground" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-1.5" align="start">
          {STATUSES.map(({ value, label }) => {
            const checked = filters.statuses?.includes(value) ?? false;
            return (
              <button
                key={value}
                onClick={() => toggleStatus(value)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm rounded-md hover:bg-muted/60 transition-colors"
              >
                <span className={checked ? "font-medium" : ""}>{label}</span>
                {checked && <Check size={14} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({})}
          className="text-muted-foreground gap-1"
        >
          <X size={14} />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
};

export default UserFilters;
