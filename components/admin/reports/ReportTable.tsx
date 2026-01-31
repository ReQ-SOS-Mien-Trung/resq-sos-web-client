"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DownloadSimple, Eye } from "@phosphor-icons/react";
import { ReportTableProps, RescueReport } from "@/type";
import { getStatusBadge } from "@/lib/constants";

const ReportTable = ({ reports, onView, onDownload }: ReportTableProps) => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const paginatedReports = reports.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const getTypeBadge = (type: RescueReport["type"]) => {
    const variants = {
      rescue: {
        label: "Cứu hộ",
        className: "bg-red-500/10 text-red-700 dark:text-red-400",
      },
      evacuation: {
        label: "Sơ tán",
        className: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
      },
      supply: {
        label: "Cung cấp",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      },
      medical: {
        label: "Y tế",
        className: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
      },
      other: {
        label: "Khác",
        className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
      },
    };
    return variants[type];
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle>Danh sách báo cáo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-3 text-sm font-semibold text-foreground">
                  Tiêu đề
                </th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">
                  Loại
                </th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">
                  Vị trí
                </th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">
                  Trạng thái
                </th>
                <th className="text-left p-3 text-sm font-semibold text-foreground">
                  Ngày
                </th>
                <th className="text-right p-3 text-sm font-semibold text-foreground">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-8 text-center text-muted-foreground"
                  >
                    Không có báo cáo nào
                  </td>
                </tr>
              ) : (
                paginatedReports.map((report) => {
                  const typeBadge = getTypeBadge(report.type);
                  const statusBadge = getStatusBadge(report.status);
                  return (
                    <tr
                      key={report.id}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="font-medium text-foreground">
                          {report.title}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className={typeBadge.className}>
                          {typeBadge.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-foreground/80">
                        {report.location}
                      </td>
                      <td className="p-3">
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-foreground/80">
                        {new Date(report.date).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView?.(report)}
                          >
                            <Eye size={16} />
                          </Button>
                          {report.fileUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDownload?.(report)}
                            >
                              <DownloadSimple size={16} />
                            </Button>
                          )}
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
              {Math.min(page * itemsPerPage, reports.length)} trong tổng số{" "}
              {reports.length} báo cáo
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

export default ReportTable;
