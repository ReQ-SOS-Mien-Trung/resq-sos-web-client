"use client";

import { useEffect, useState, useMemo } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Eye,
  MagnifyingGlass,
  ShieldCheck,
  ClockCountdown,
  UserCheck,
  UserMinus,
  Envelope,
  Phone,
  MapPin,
  FirstAid,
  CalendarBlank,
  Users,
  ArrowLeft,
  FileText,
  IdentificationCard,
  Briefcase,
  Certificate,
  Download,
} from "@phosphor-icons/react";
import { DashboardSkeleton } from "@/components/admin";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  useRescuerApplications,
  useReviewRescuerApplication,
} from "@/services/rescuer_application/hooks";
import { RescuerApplicationEntity } from "@/services/rescuer_application/type";

type StatusFilter = "all" | "Pending" | "Approved" | "Rejected";

const getDocTypeLabel = (fileType: string) => {
  const map: Record<string, string> = {
    CCCD: "Căn cước công dân",
    RescueCertificate: "Chứng chỉ cứu hộ",
    HealthCertificate: "Giấy khám sức khỏe",
    FirstAidCertificate: "Chứng chỉ sơ cấp cứu",
    ExperienceLetter: "Thư xác nhận kinh nghiệm",
  };
  return map[fileType] ?? fileType;
};

const getDocIcon = (fileType: string) => {
  switch (fileType) {
    case "CCCD":
      return <IdentificationCard size={18} weight="duotone" />;
    case "RescueCertificate":
    case "FirstAidCertificate":
      return <Certificate size={18} weight="duotone" />;
    case "HealthCertificate":
      return <FirstAid size={18} weight="duotone" />;
    case "ExperienceLetter":
      return <Briefcase size={18} weight="duotone" />;
    default:
      return <FileText size={18} weight="duotone" />;
  }
};

const getDocIconColor = (fileType: string) => {
  switch (fileType) {
    case "CCCD":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "RescueCertificate":
    case "FirstAidCertificate":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "HealthCertificate":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "ExperienceLetter":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    default:
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400";
  }
};

const RescuerVerificationPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedItem, setSelectedItem] =
    useState<RescuerApplicationEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    item: RescuerApplicationEntity | null;
    isApproved: boolean;
  }>({ open: false, item: null, isApproved: true });
  const [adminNote, setAdminNote] = useState("");

  const openReviewDialog = (
    item: RescuerApplicationEntity,
    isApproved: boolean,
  ) => {
    setReviewDialog({ open: true, item, isApproved });
    setAdminNote("");
  };

  const handleConfirmReview = () => {
    if (!reviewDialog.item) return;
    reviewApplication(
      {
        applicationId: reviewDialog.item.id,
        isApproved: reviewDialog.isApproved,
        adminNote: adminNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          setReviewDialog({ open: false, item: null, isApproved: true });
          setAdminNote("");
          setSelectedItem(null);
        },
      },
    );
  };

  const renderReviewDialog = () => (
    <Dialog
      open={reviewDialog.open}
      onOpenChange={(open) => {
        if (!open) {
          setReviewDialog({ open: false, item: null, isApproved: true });
          setAdminNote("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`p-2.5 rounded-xl ${
                reviewDialog.isApproved
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-rose-500/10 text-rose-600"
              }`}
            >
              {reviewDialog.isApproved ? (
                <CheckCircle size={22} weight="bold" />
              ) : (
                <XCircle size={22} weight="bold" />
              )}
            </div>
            <div>
              <DialogTitle>
                {reviewDialog.isApproved
                  ? "Phê duyệt cứu hộ viên"
                  : "Từ chối cứu hộ viên"}
              </DialogTitle>
              <DialogDescription>
                {reviewDialog.item?.fullName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              Ghi chú của admin
            </label>
            <Textarea
              placeholder={
                reviewDialog.isApproved
                  ? "Nhập lý do phê duyệt (không bắt buộc)..."
                  : "Nhập lý do từ chối..."
              }
              value={adminNote}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setAdminNote(e.target.value)
              }
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              setReviewDialog({ open: false, item: null, isApproved: true });
              setAdminNote("");
            }}
          >
            Hủy
          </Button>
          <Button
            disabled={isReviewing}
            onClick={handleConfirmReview}
            className={
              reviewDialog.isApproved
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            }
          >
            {isReviewing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Đang xử lý...
              </span>
            ) : reviewDialog.isApproved ? (
              <>
                <CheckCircle size={16} className="mr-1.5" weight="bold" />
                Xác nhận phê duyệt
              </>
            ) : (
              <>
                <XCircle size={16} className="mr-1.5" weight="bold" />
                Xác nhận từ chối
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const { data: applicationsData, isLoading: isLoadingApplications } =
    useRescuerApplications({
      params: { pageNumber: 1, pageSize: 50 },
    });

  const { mutate: reviewApplication, isPending: isReviewing } =
    useReviewRescuerApplication();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const items = applicationsData?.items ?? [];

  const stats = useMemo(() => {
    return {
      total: items.length,
      pending: items.filter((i) => i.status === "Pending").length,
      approved: items.filter((i) => i.status === "Approved").length,
      rejected: items.filter((i) => i.status === "Rejected").length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (statusFilter !== "all") {
      result = result.filter((i) => i.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.fullName.toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          i.phone.includes(q) ||
          i.city.toLowerCase().includes(q),
      );
    }
    return result;
  }, [items, statusFilter, searchQuery]);

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      {
        label: string;
        className: string;
        dotColor: string;
        icon: React.ReactNode;
      }
    > = {
      Pending: {
        label: "Đang chờ xác nhận",
        className:
          "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        dotColor: "bg-amber-500",
        icon: <ClockCountdown size={14} weight="fill" />,
      },
      Approved: {
        label: "Đã xác nhận",
        className:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        dotColor: "bg-emerald-500",
        icon: <CheckCircle size={14} weight="fill" />,
      },
      Rejected: {
        label: "Đã từ chối",
        className:
          "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
        dotColor: "bg-rose-500",
        icon: <XCircle size={14} weight="fill" />,
      },
    };
    return configs[status] ?? configs.Pending;
  };

  if (loading || !dashboardData) {
    return (
      <DashboardLayout
        favorites={[]}
        projects={[]}
        cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
      >
        <DashboardSkeleton variant="table" />
      </DashboardLayout>
    );
  }

  // Detail view for a selected rescuer application
  if (selectedItem) {
    const statusConfig = getStatusConfig(selectedItem.status);
    return (
      <>
        <DashboardLayout
          favorites={dashboardData.favorites}
          projects={dashboardData.projects}
          cloudStorage={dashboardData.cloudStorage}
        >
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
            {/* Back button */}
            <Button
              variant="ghost"
              onClick={() => setSelectedItem(null)}
              className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft size={18} />
              Quay lại danh sách
            </Button>

            {/* Profile Header */}
            <Card className="border border-border/50 overflow-hidden">
              <div className="relative">
                {/* Gradient banner */}
                <div className="h-28 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600" />
                <div className="px-6 pb-6">
                  <div className="flex items-end gap-4 -mt-10">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl shadow-xl border-4 border-background">
                      {selectedItem.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-2xl font-bold text-foreground">
                          {selectedItem.fullName}
                        </h2>
                        <Badge
                          className={`${statusConfig.className} border text-xs gap-1`}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                    {selectedItem.status === "Pending" && (
                      <div className="flex gap-2 pb-1">
                        <Button
                          size="sm"
                          disabled={isReviewing}
                          onClick={() => openReviewDialog(selectedItem, true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all duration-200 hover:shadow-md"
                        >
                          <CheckCircle
                            size={16}
                            className="mr-1.5"
                            weight="bold"
                          />
                          Phê duyệt
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isReviewing}
                          onClick={() => openReviewDialog(selectedItem, false)}
                          className="border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          <XCircle size={16} className="mr-1.5" weight="bold" />
                          Từ chối
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Info */}
              <Card className="border border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <IdentificationCard
                        size={20}
                        className="text-blue-600 dark:text-blue-400"
                        weight="duotone"
                      />
                    </div>
                    <h3 className="font-semibold text-foreground">
                      Thông tin cá nhân
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      {
                        icon: <Envelope size={16} />,
                        label: "Email",
                        value: selectedItem.email,
                      },
                      {
                        icon: <Phone size={16} />,
                        label: "Số điện thoại",
                        value: selectedItem.phone,
                      },
                      {
                        icon: <MapPin size={16} />,
                        label: "Địa chỉ",
                        value: selectedItem.address,
                      },
                      {
                        icon: <MapPin size={16} />,
                        label: "Phường/Xã",
                        value: selectedItem.ward,
                      },
                      {
                        icon: <MapPin size={16} />,
                        label: "Thành phố",
                        value: selectedItem.city,
                      },
                    ].map((field, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground mt-0.5">
                          {field.icon}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            {field.label}
                          </p>
                          <p className="text-sm text-foreground font-medium">
                            {field.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Rescuer Info & Documents */}
              <div className="space-y-6">
                <Card className="border border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <FirstAid
                          size={20}
                          className="text-emerald-600 dark:text-emerald-400"
                          weight="duotone"
                        />
                      </div>
                      <h3 className="font-semibold text-foreground">
                        Thông tin cứu hộ
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground mt-0.5">
                          <Briefcase size={16} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Loại cứu hộ viên
                          </p>
                          <Badge className="mt-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                            {selectedItem.rescuerType}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground mt-0.5">
                          <CalendarBlank size={16} />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Ngày đăng ký
                          </p>
                          <p className="text-sm text-foreground font-medium">
                            {new Date(selectedItem.submittedAt).toLocaleString(
                              "vi-VN",
                            )}
                          </p>
                        </div>
                      </div>
                      {selectedItem.reviewedAt && (
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground mt-0.5">
                            <ShieldCheck size={16} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                              Ngày xét duyệt
                            </p>
                            <p className="text-sm text-foreground font-medium">
                              {new Date(selectedItem.reviewedAt).toLocaleString(
                                "vi-VN",
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedItem.adminNote && (
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground mt-0.5">
                            <FileText size={16} />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                              Ghi chú
                            </p>
                            <p className="text-sm text-foreground font-medium">
                              {selectedItem.adminNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card className="border border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <FileText
                          size={20}
                          className="text-violet-600 dark:text-violet-400"
                          weight="duotone"
                        />
                      </div>
                      <h3 className="font-semibold text-foreground">
                        Tài liệu đính kèm
                      </h3>
                      <Badge variant="outline" className="ml-auto">
                        {selectedItem.documents.length} tài liệu
                      </Badge>
                    </div>
                    {selectedItem.documents.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                          <FileText
                            size={24}
                            className="text-muted-foreground"
                            weight="duotone"
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Chưa có tài liệu đính kèm
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedItem.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 p-3.5 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 hover:border-border transition-all duration-200 group/doc"
                          >
                            <div
                              className={`p-2.5 rounded-xl ${getDocIconColor(doc.fileType)} transition-transform duration-200 group-hover/doc:scale-110`}
                            >
                              {getDocIcon(doc.fileType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {getDocTypeLabel(doc.fileType)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Tải lên{" "}
                                {new Date(doc.uploadedAt).toLocaleDateString(
                                  "vi-VN",
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover/doc:opacity-100 transition-opacity"
                                asChild
                              >
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Xem tài liệu"
                                >
                                  <Eye size={16} />
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover/doc:opacity-100 transition-opacity"
                                asChild
                              >
                                <a
                                  href={doc.fileUrl}
                                  download
                                  title="Tải xuống"
                                >
                                  <Download size={16} />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </DashboardLayout>
        {renderReviewDialog()}
      </>
    );
  }

  // List view
  return (
    <>
      <DashboardLayout
        favorites={dashboardData.favorites}
        projects={dashboardData.projects}
        cloudStorage={dashboardData.cloudStorage}
      >
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
                <ShieldCheck size={22} weight="bold" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Xác nhận cứu hộ viên
                </h1>
                <p className="text-sm text-muted-foreground">
                  Xem xét và phê duyệt hồ sơ cứu hộ viên
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "100ms" }}
          >
            {[
              {
                label: "Tổng hồ sơ",
                value: stats.total,
                icon: <Users size={22} weight="duotone" />,
                bg: "bg-violet-50 dark:bg-violet-950/30",
                text: "text-violet-700 dark:text-violet-400",
              },
              {
                label: "Chờ xác nhận",
                value: stats.pending,
                icon: <ClockCountdown size={22} weight="duotone" />,
                bg: "bg-amber-50 dark:bg-amber-950/30",
                text: "text-amber-700 dark:text-amber-400",
              },
              {
                label: "Đã xác nhận",
                value: stats.approved,
                icon: <UserCheck size={22} weight="duotone" />,
                bg: "bg-emerald-50 dark:bg-emerald-950/30",
                text: "text-emerald-700 dark:text-emerald-400",
              },
              {
                label: "Đã từ chối",
                value: stats.rejected,
                icon: <UserMinus size={22} weight="duotone" />,
                bg: "bg-rose-50 dark:bg-rose-950/30",
                text: "text-rose-700 dark:text-rose-400",
              },
            ].map((stat, idx) => (
              <Card
                key={idx}
                className="border border-border/50 overflow-hidden group hover:shadow-md transition-all duration-300 hover:border-border"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className={`p-2.5 rounded-xl ${stat.bg} ${stat.text} transition-transform duration-300 group-hover:scale-110`}
                    >
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters & Search */}
          <div
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "200ms" }}
          >
            <Card className="border border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                    {(
                      [
                        { key: "all", label: "Tất cả", count: stats.total },
                        {
                          key: "Pending",
                          label: "Chờ duyệt",
                          count: stats.pending,
                        },
                        {
                          key: "Approved",
                          label: "Đã duyệt",
                          count: stats.approved,
                        },
                        {
                          key: "Rejected",
                          label: "Từ chối",
                          count: stats.rejected,
                        },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                          statusFilter === tab.key
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab.label}
                        <span
                          className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                            statusFilter === tab.key
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="w-full sm:w-72">
                    <Input
                      placeholder="Tìm kiếm theo tên, email, SĐT..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      leftIcon={<MagnifyingGlass size={16} />}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Verification List */}
          <div
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: "300ms" }}
          >
            {isLoadingApplications ? (
              <DashboardSkeleton variant="table" />
            ) : filteredItems.length === 0 ? (
              <Card className="border border-border/50">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <ShieldCheck
                      size={28}
                      className="text-muted-foreground"
                      weight="duotone"
                    />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    Không có hồ sơ nào
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    {searchQuery
                      ? "Thử tìm kiếm với từ khóa khác"
                      : "Chưa có hồ sơ cứu hộ viên cần xác nhận"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredItems.map((item, idx) => {
                  const statusConfig = getStatusConfig(item.status);
                  return (
                    <Card
                      key={item.id}
                      className="border border-border/50 overflow-hidden group hover:shadow-lg hover:border-border/80 transition-all duration-300 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${idx * 60}ms` }}
                      onClick={() => setSelectedItem(item)}
                    >
                      <CardContent className="p-0">
                        {/* Top accent */}
                        <div
                          className={`h-1 ${
                            item.status === "Pending"
                              ? "bg-gradient-to-r from-amber-400 to-orange-400"
                              : item.status === "Approved"
                                ? "bg-gradient-to-r from-emerald-400 to-green-400"
                                : "bg-gradient-to-r from-rose-400 to-pink-400"
                          }`}
                        />
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            {/* Avatar */}
                            <div className="relative">
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:shadow-lg transition-shadow">
                                {item.fullName.charAt(0).toUpperCase()}
                              </div>
                              {/* Status dot */}
                              <div
                                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${
                                  item.status === "Pending"
                                    ? "bg-amber-500"
                                    : item.status === "Approved"
                                      ? "bg-emerald-500"
                                      : "bg-rose-500"
                                }`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                                  {item.fullName}
                                </h3>
                                <Badge
                                  className={`${statusConfig.className} border text-[11px] gap-1`}
                                >
                                  {statusConfig.icon}
                                  {statusConfig.label}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <Envelope size={13} className="shrink-0" />
                                  <span className="truncate">{item.email}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <Phone size={13} className="shrink-0" />
                                    <span>{item.phone}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={13} className="shrink-0" />
                                    <span className="truncate">
                                      {item.city}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-3">
                                <Badge
                                  variant="outline"
                                  className="text-[11px] gap-1"
                                >
                                  <FirstAid size={12} weight="fill" />
                                  {item.rescuerType}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground/60">
                                  {new Date(
                                    item.submittedAt,
                                  ).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                            </div>
                            {/* Action */}
                            <div className="flex flex-col gap-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedItem(item);
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Eye size={16} className="mr-1" />
                                Chi tiết
                              </Button>
                              {item.status === "Pending" && (
                                <div className="flex gap-1.5">
                                  <Button
                                    size="icon"
                                    disabled={isReviewing}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openReviewDialog(item, true);
                                    }}
                                    className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                  >
                                    <CheckCircle size={16} weight="bold" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={isReviewing}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openReviewDialog(item, false);
                                    }}
                                    className="h-8 w-8 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                  >
                                    <XCircle size={16} weight="bold" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination info */}
          {applicationsData && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Hiển thị{" "}
                <span className="font-medium text-foreground">
                  {filteredItems.length}
                </span>{" "}
                trong tổng số{" "}
                <span className="font-medium text-foreground">
                  {applicationsData.totalCount}
                </span>{" "}
                hồ sơ
              </p>
              <p>
                Trang {applicationsData.pageNumber}/
                {applicationsData.totalPages}
              </p>
            </div>
          )}
        </div>
      </DashboardLayout>
      {renderReviewDialog()}
    </>
  );
};

export default RescuerVerificationPage;
