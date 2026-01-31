"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye, Clock } from "@phosphor-icons/react";
import type { RescuerVerification } from "@/types/admin-pages";

interface VerificationQueueProps {
  verifications: RescuerVerification[];
  onView?: (verification: RescuerVerification) => void;
  onApprove?: (verification: RescuerVerification) => void;
  onReject?: (verification: RescuerVerification) => void;
}

export function VerificationQueue({
  verifications,
  onView,
  onApprove,
  onReject,
}: VerificationQueueProps) {
  const getStatusBadge = (status: RescuerVerification["status"]) => {
    const variants = {
      pending: {
        label: "Đang chờ",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      },
      verified: {
        label: "Đã xác nhận",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      },
      rejected: {
        label: "Đã từ chối",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
      },
    };
    return variants[status];
  };

  const pendingCount = verifications.filter(
    (v) => v.status === "pending",
  ).length;

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-amber-500" />
            Hàng đợi xác nhận
          </div>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
              {pendingCount} đang chờ
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {verifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Không có yêu cầu xác nhận nào
            </p>
          ) : (
            verifications.map((verification) => {
              const statusBadge = getStatusBadge(verification.status);
              const verifiedDocs = verification.documents.filter(
                (d) => d.verified,
              ).length;
              const totalDocs = verification.documents.length;

              return (
                <div
                  key={verification.id}
                  className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {verification.rescuerName}
                        </h3>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                        <Badge variant="outline">
                          {verifiedDocs}/{totalDocs} tài liệu
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-foreground/80">
                        <p>
                          <span className="font-medium">Email:</span>{" "}
                          {verification.email}
                        </p>
                        <p>
                          <span className="font-medium">Khu vực:</span>{" "}
                          {verification.region}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Gửi:{" "}
                          {new Date(verification.submittedAt).toLocaleString(
                            "vi-VN",
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView?.(verification)}
                      >
                        <Eye size={16} className="mr-1" />
                        Xem chi tiết
                      </Button>
                      {verification.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onApprove?.(verification)}
                            className="text-emerald-600 dark:text-emerald-400"
                          >
                            <CheckCircle size={16} className="mr-1" />
                            Phê duyệt
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReject?.(verification)}
                            className="text-rose-600 dark:text-rose-400"
                          >
                            <XCircle size={16} className="mr-1" />
                            Từ chối
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
