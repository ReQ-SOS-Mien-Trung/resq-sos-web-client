"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Eye } from "@phosphor-icons/react";
import { RescuerListProps, RescuerRegistration } from "@/type";

const RescuerList = ({
  registrations,
  onView,
  onApprove,
  onReject,
}: RescuerListProps) => {
  const getStatusBadge = (status: RescuerRegistration["status"]) => {
    const variants = {
      pending: {
        label: "Đang chờ",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      },
      approved: {
        label: "Đã phê duyệt",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      },
      rejected: {
        label: "Đã từ chối",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
      },
    };
    return variants[status];
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle>Danh sách đăng ký</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {registrations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Không có đăng ký nào
            </p>
          ) : (
            registrations.map((registration) => {
              const statusBadge = getStatusBadge(registration.status);
              return (
                <div
                  key={registration.id}
                  className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {registration.name}
                        </h3>
                        <Badge className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-foreground/80">
                        <p>
                          <span className="font-medium">Email:</span>{" "}
                          {registration.email}
                        </p>
                        <p>
                          <span className="font-medium">SĐT:</span>{" "}
                          {registration.phone}
                        </p>
                        <p>
                          <span className="font-medium">Khu vực:</span>{" "}
                          {registration.region}
                        </p>
                        <p>
                          <span className="font-medium">Kinh nghiệm:</span>{" "}
                          {registration.experience}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {registration.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-muted rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Đăng ký:{" "}
                          {new Date(registration.submittedAt).toLocaleString(
                            "vi-VN",
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView?.(registration)}
                      >
                        <Eye size={16} className="mr-1" />
                        Xem
                      </Button>
                      {registration.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onApprove?.(registration)}
                            className="text-emerald-600 dark:text-emerald-400"
                          >
                            <CheckCircle size={16} className="mr-1" />
                            Phê duyệt
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReject?.(registration)}
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
};

export default RescuerList;
