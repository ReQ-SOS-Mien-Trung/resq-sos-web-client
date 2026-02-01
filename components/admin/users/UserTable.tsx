"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DotsThreeVertical,
  PencilSimple,
  Trash,
  Prohibit,
  CheckCircle,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, UserTableProps } from "@/type";

const UserTable = ({
  users,
  filters,
  onEdit,
  onDelete,
  onBan,
  onActivate,
}: UserTableProps) => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const filteredUsers = users.filter((user) => {
    if (filters?.role && user.role !== filters.role) return false;
    if (filters?.status && user.status !== filters.status) return false;
    if (filters?.region && user.region !== filters.region) return false;
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      if (
        !user.name.toLowerCase().includes(search) &&
        !user.email.toLowerCase().includes(search)
      )
        return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const getRoleBadge = (role: User["role"]) => {
    const variants: Record<User["role"], { label: string; className: string }> =
      {
        admin: {
          label: "Admin",
          className: "bg-red-500/10 text-red-700 dark:text-red-400",
        },
        coordinator: {
          label: "Điều phối",
          className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
        },
        rescuer: {
          label: "Cứu hộ viên",
          className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        },
        citizen: {
          label: "Công dân",
          className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
        },
      };
    return variants[role];
  };

  const getStatusBadge = (status: User["status"]) => {
    const variants: Record<
      User["status"],
      { label: string; className: string }
    > = {
      active: {
        label: "Hoạt động",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      },
      pending: {
        label: "Đang chờ",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      },
      banned: {
        label: "Bị cấm",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
      },
      inactive: {
        label: "Không hoạt động",
        className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
      },
    };
    return variants[status];
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle>Danh sách người dùng</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-3 text-sm font-semibold text-foreground">
                  Tên
                </th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">
                  Email
                </th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">
                  Vai trò
                </th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">
                  Khu vực
                </th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">
                  Trạng thái
                </th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">
                  Đăng nhập cuối
                </th>
                <th className="text-right p-3 text-sm font-semibold text-foreground">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Không tìm thấy người dùng nào
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  const statusBadge = getStatusBadge(user.status);
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-medium text-foreground">
                          {user.name}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-foreground/80">
                        {user.email}
                      </td>
                      <td className="p-3">
                        <Badge className={roleBadge.className}>
                          {roleBadge.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-foreground/80">
                        {user.region}
                      </td>
                      <td className="p-3">
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-foreground/60">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString("vi-VN")
                          : "Chưa đăng nhập"}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <DotsThreeVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit?.(user)}>
                                <PencilSimple size={16} className="mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              {user.status === "active" ? (
                                <DropdownMenuItem onClick={() => onBan?.(user)}>
                                  <Prohibit size={16} className="mr-2" />
                                  Cấm
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => onActivate?.(user)}
                                >
                                  <CheckCircle size={16} className="mr-2" />
                                  Kích hoạt
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => onDelete?.(user)}
                                className="text-destructive"
                              >
                                <Trash size={16} className="mr-2" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <div className="text-sm text-muted-foreground">
              Hiển thị {(page - 1) * itemsPerPage + 1}-
              {Math.min(page * itemsPerPage, filteredUsers.length)} trong tổng
              số {filteredUsers.length} người dùng
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Trước
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(p)}
                      className="min-w-10"
                    >
                      {p}
                    </Button>
                  ),
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserTable;
