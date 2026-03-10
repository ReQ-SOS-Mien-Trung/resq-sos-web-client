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
  Image as ImageIcon,
  UploadSimple,
  Trash,
  Download,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/components/admin";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  useRescuerApplications,
  useReviewRescuerApplication,
} from "@/services/rescuer_application/hooks";
import { RescuerApplicationEntity } from "@/services/rescuer_application/type";
import { useUpdateUserAvatar } from "@/services/user/hooks";

type StatusFilter = "all" | "Pending" | "Approved" | "Rejected";

/** Build full name (Vietnamese: lastName firstName) */
const getFullName = (item: RescuerApplicationEntity) =>
  `${item.lastName} ${item.firstName}`;


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
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);

  // Avatar upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const { mutateAsync: updateAvatarMutate } = useUpdateUserAvatar();

  const openReviewDialog = (
    item: RescuerApplicationEntity,
    isApproved: boolean,
  ) => {
    setReviewDialog({ open: true, item, isApproved });
    setAdminNote("");
  };

  const handleConfirmReview = async () => {
    if (!reviewDialog.item) return;

    try {
      setIsUploadingAvatar(true);

      // Handle avatar upload on approve
      if (reviewDialog.isApproved && avatarFile) {
        toast.loading("Đang tải ảnh đại diện lên...");

        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "resq_preset");
        formData.append("cloud_name", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dsjsjm1ee");

        const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dsjsjm1ee"}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload fail to Cloudinary");

        const data = await res.json();

        toast.loading("Đang cập nhật hệ thống...");
        await updateAvatarMutate({
          userId: reviewDialog.item.userId,
          avatarUrl: data.secure_url
        });
        toast.dismiss();
      }

      // Existing review logic
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
            setAvatarFile(null);
            setAvatarPreview(null);
            if (!avatarFile) toast.success(reviewDialog.isApproved ? "Phê duyệt thành công!" : "Từ chối thành công!");
          },
        },
      );
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error("Có lỗi xảy ra trong quá trình xử lý!");
    } finally {
      setIsUploadingAvatar(false);
    }
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
      <DialogContent className="sm:max-w-md border border-border/60">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`p-2.5 rounded-xl ${reviewDialog.isApproved
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
                {reviewDialog.item ? getFullName(reviewDialog.item) : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
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
              className="min-h-[100px] resize-none border-border/60"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            className="border-border/60"
            onClick={() => {
              setReviewDialog({ open: false, item: null, isApproved: true });
              setAdminNote("");
            }}
          >
            Hủy
          </Button>
          <Button
            disabled={isReviewing || isUploadingAvatar}
            onClick={handleConfirmReview}
            className={
              reviewDialog.isApproved
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            }
          >
            {(isReviewing || isUploadingAvatar) ? (
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

  const renderPreviewDialog = () => (
    <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
      <DialogContent className="max-w-[100vw] sm:max-w-[75vw] w-full h-[100vh] sm:h-[85vh] p-0 border-none bg-transparent shadow-none flex flex-col items-center justify-center">
        <DialogTitle className="sr-only">
          {previewDoc?.name || "Document Preview"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Preview of the selected document
        </DialogDescription>

        {previewDoc && (
          <div className="relative w-full h-full p-3 sm:p-0">
            {/* Floating Close Button */}
            <button
              onClick={() => setPreviewDoc(null)}
              className="absolute top-2 right-2 sm:-top-4 sm:-right-4 lg:-right-12 lg:-top-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all z-[100] text-black hover:bg-gray-100"
              aria-label="Đóng"
            >
              <X size={20} weight="bold" />
            </button>

            {/* Media Content */}
            <div className="w-full h-full overflow-y-auto flex items-start justify-center rounded-md pb-12 sm:pb-0">
              {previewDoc.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || previewDoc.url.startsWith("blob:") ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-w-full h-auto object-contain rounded-md"
                />
              ) : (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-full min-h-[85vh] max-w-4xl bg-white rounded-md border-0"
                  title={previewDoc.name}
                />
              )}
            </div>
          </div>
        )}
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
          getFullName(i).toLowerCase().includes(q) ||
          i.email.toLowerCase().includes(q) ||
          i.phone.includes(q) ||
          i.province.toLowerCase().includes(q),
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
          "bg-amber-500/8 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        dotColor: "bg-amber-500",
        icon: <ClockCountdown size={14} weight="fill" />,
      },
      Approved: {
        label: "Đã xác nhận",
        className:
          "bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        dotColor: "bg-emerald-500",
        icon: <CheckCircle size={14} weight="fill" />,
      },
      Rejected: {
        label: "Đã từ chối",
        className:
          "bg-rose-500/8 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
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

  // ──── Detail view ────
  if (selectedItem) {
    const statusConfig = getStatusConfig(selectedItem.status);
    return (
      <>
        <DashboardLayout
          favorites={dashboardData.favorites}
          projects={dashboardData.projects}
          cloudStorage={dashboardData.cloudStorage}
        >
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-400">
            {/* Back */}
            <button
              onClick={() => {
                setSelectedItem(null);
                setAvatarFile(null);
                setAvatarPreview(null);
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-6"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              <span className="uppercase tracking-wider text-xs font-bold">
                Quay lại danh sách
              </span>
            </button>

            {/* Profile Header */}
            <div className="border border-border/60 rounded-2xl overflow-hidden bg-card">
              {/* Minimal top bar */}
              <div className="h-1.5 bg-gradient-to-r from-black/80 via-black/60 to-black/30 dark:from-white/30 dark:via-white/20 dark:to-white/5" />
              <div className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar thumbnail */}
                  {selectedItem.avatarUrl ? (
                    <img
                      src={selectedItem.avatarUrl}
                      alt="Current avatar"
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-border/60 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewDoc({ url: selectedItem.avatarUrl!, name: "Ảnh đại diện hiện tại" })}
                    />
                  ) : avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-border/60 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewDoc({ url: avatarPreview, name: "Ảnh đại diện mới" })}
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-black dark:bg-white/10 flex items-center justify-center text-white dark:text-white font-black text-2xl shrink-0">
                      {selectedItem.firstName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col items-start gap-2.5">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                      {getFullName(selectedItem)}
                    </h2>
                    <Badge
                      className={`${statusConfig.className} border text-[11px] gap-1 font-semibold`}
                    >
                      {statusConfig.icon}
                      {statusConfig.label}
                    </Badge>
                  </div>
                  {selectedItem.status === "Pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        disabled={isReviewing}
                        onClick={() => openReviewDialog(selectedItem, true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs uppercase tracking-wider font-bold"
                      >
                        <CheckCircle size={15} className="mr-1.5" weight="bold" />
                        Phê duyệt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isReviewing}
                        onClick={() => openReviewDialog(selectedItem, false)}
                        className="border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs uppercase tracking-wider font-bold"
                      >
                        <XCircle size={15} className="mr-1.5" weight="bold" />
                        Từ chối
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Info */}
              <div className="border border-border/60 rounded-2xl bg-card p-6">
                <div className="border-b border-border/60 mb-8 pb-4">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#FF5722] mb-2 sm:mb-1">
                    Mục I
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
                    Thông tin cá nhân
                  </h2>
                </div>
                <div className="space-y-5">
                  {[
                    {
                      icon: <Briefcase size={15} />,
                      label: "Loại chứng nhận",
                      value: (
                        <Badge className="mt-1 bg-black/5 dark:bg-white/10 text-foreground border border-border/60 font-medium pb-px pt-0.5 px-2">
                          {selectedItem.rescuerType}
                        </Badge>
                      ),
                    },
                    {
                      icon: <Envelope size={15} />,
                      label: "Email",
                      value: selectedItem.email,
                    },
                    {
                      icon: <Phone size={15} />,
                      label: "Số điện thoại",
                      value: selectedItem.phone,
                    },
                    {
                      icon: <MapPin size={15} />,
                      label: "Khu vực",
                      value: `${selectedItem.address ? selectedItem.address + ', ' : ''}${selectedItem.ward ? selectedItem.ward + ', ' : ''}${selectedItem.province}`,
                    },
                    {
                      icon: <CalendarBlank size={15} />,
                      label: "Ngày đăng ký",
                      value: new Date(selectedItem.submittedAt).toLocaleString("vi-VN"),
                    },
                    ...(selectedItem.reviewedAt
                      ? [
                        {
                          icon: <ShieldCheck size={15} />,
                          label: "Ngày xét duyệt",
                          value: new Date(selectedItem.reviewedAt).toLocaleString("vi-VN"),
                        },
                      ]
                      : []),
                    ...(selectedItem.adminNote
                      ? [
                        {
                          icon: <FileText size={15} />,
                          label: "Ghi chú của hệ thống",
                          value: selectedItem.adminNote,
                        },
                      ]
                      : []),
                  ].map((field, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="p-1.5 rounded-lg border border-border/60 text-muted-foreground mt-0.5">
                        {field.icon}
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                          {field.label}
                        </p>
                        {typeof field.value === "string" ? (
                          <p className="text-sm text-foreground font-medium mt-0.5">
                            {field.value}
                          </p>
                        ) : (
                          field.value
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* MỤC II: ẢNH ĐẠI DIỆN */}
              <div className="space-y-6">
                {selectedItem.status === "Pending" ? (
                  <div className="border border-emerald-500/30 rounded-2xl bg-emerald-500/5 p-6 h-full flex flex-col">
                    <div className="border-b border-emerald-500/20 mb-6 pb-4">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2 sm:mb-1">
                        Mục II
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-700 dark:text-emerald-400 mt-1">
                        Ảnh đại diện
                      </h2>
                    </div>
                    <p className="text-[12px] text-emerald-600/80 mb-4 font-medium">
                      Tải lên ảnh 3x4 hoặc ảnh rõ mặt.
                    </p>

                    <div className="flex-1 flex flex-col justify-center">
                      {!avatarPreview ? (
                        <label className="flex flex-col items-center justify-center w-full h-full min-h-[160px] border-2 border-dashed border-emerald-500/40 rounded-xl cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500/60 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadSimple size={24} className="text-emerald-600 mb-2" weight="duotone" />
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                              Ấn để chọn ảnh
                            </p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setAvatarFile(file);
                                const objectUrl = URL.createObjectURL(file);
                                setAvatarPreview(objectUrl);
                              }
                            }}
                          />
                        </label>
                      ) : (
                        <div className="flex items-start gap-4 p-4 border border-emerald-500/40 rounded-xl bg-background">
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-16 h-16 rounded-xl object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity hover:border-emerald-500"
                            onClick={() => setPreviewDoc({ url: avatarPreview, name: "Ảnh đại diện mới" })}
                            title="Phóng to"
                          />
                          <div className="flex-1 min-w-0 pt-1">
                            <p className="text-sm font-bold text-foreground truncate">{avatarFile?.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(avatarFile!.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                              onClick={() => {
                                setAvatarFile(null);
                                setAvatarPreview(null);
                              }}
                              className="text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-wider mt-2 flex items-center gap-1"
                            >
                              <Trash size={12} /> Hủy ảnh này
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border border-border/60 rounded-2xl bg-card p-6 h-full flex flex-col">
                    <div className="border-b border-border/60 mb-8 pb-4">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 sm:mb-1">
                        Mục II
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
                        Ảnh đại diện
                      </h2>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      {selectedItem.avatarUrl ? (
                        <img
                          src={selectedItem.avatarUrl}
                          alt="User Avatar"
                          className="w-64 sm:w-80 h-auto aspect-[3/4] object-cover shadow-sm border border-border/60 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewDoc({ url: selectedItem.avatarUrl!, name: "Ảnh đại diện" })}
                          title="Phóng to"
                        />
                      ) : (
                        <div className="w-64 sm:w-80 aspect-[3/4] bg-muted/40 flex flex-col items-center justify-center border border-dashed border-border/60 text-muted-foreground">
                          <ImageIcon size={48} weight="duotone" className="mb-3 opacity-50" />
                          <span className="text-sm font-medium uppercase tracking-wider">Chưa có ảnh</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MỤC III: NĂNG LỰC CỨU HỘ */}
            {(() => {
              // Categorize abilities by group
              const abilities = selectedItem.abilities || [];
              const rescueAbilities = abilities.filter(a => a.categoryCode === "RESCUE");
              const medicalAbilities = abilities.filter(a => a.categoryCode === "MEDICAL");
              const transportAbilities = abilities.filter(a => a.categoryCode === "TRANSPORTATION");
              const experienceAbilities = abilities.filter(a =>
                a.categoryCode === "EXPERIENCE" ||
                (!["RESCUE", "MEDICAL", "TRANSPORTATION", "EXPERIENCE"].includes(a.categoryCode))
              );

              const totalAbilities = abilities.length;
              const totalPossible = 52;

              const categories = [
                {
                  label: "Kỹ năng cứu hộ",
                  icon: <ShieldCheck size={22} weight="duotone" />,
                  iconBg: "bg-[#FF5722] text-white",
                  dotColor: "text-[#FF5722]",
                  items: rescueAbilities,
                  total: 16,
                  number: "01",
                },
                {
                  label: "Kỹ năng y tế",
                  icon: <FirstAid size={22} weight="duotone" />,
                  iconBg: "bg-[#FF5722] text-white",
                  dotColor: "text-[#FF5722]",
                  items: medicalAbilities,
                  total: 19,
                  number: "02",
                },
                {
                  label: "Kỹ năng vận chuyển",
                  icon: <Briefcase size={22} weight="duotone" />,
                  iconBg: "bg-[#FF5722] text-white",
                  dotColor: "text-[#FF5722]",
                  items: transportAbilities,
                  total: 12,
                  number: "03",
                },
                {
                  label: "Kinh nghiệm thực tiễn",
                  icon: <Certificate size={22} weight="duotone" />,
                  iconBg: "bg-[#FF5722] text-white",
                  dotColor: "text-[#FF5722]",
                  items: experienceAbilities,
                  total: 5,
                  number: "04",
                },
              ];

              return (
                <div className="mt-12 pt-12 border-t border-border/40 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border/60 mb-8 pb-4">
                    <div>
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#FF5722] mb-2 sm:mb-1">
                        Mục III
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                        Năng lực cứu hộ
                      </h2>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-4 sm:mt-0">
                      {totalAbilities} / {totalPossible} kỹ năng
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {categories.map((cat, catIdx) => (
                      <div key={catIdx} className="border border-border/50 rounded-2xl p-6 bg-card">
                        {/* Category Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2.5 rounded-xl ${cat.iconBg}`}>
                            {cat.icon}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {cat.number}
                            </p>
                            <p className="text-sm font-bold text-foreground">
                              {cat.label}
                            </p>
                          </div>
                        </div>

                        {/* Count */}
                        <div className="mb-5">
                          <span className="text-3xl font-black tracking-tight text-foreground">
                            {cat.items.length}
                          </span>
                          <span className="text-lg text-muted-foreground font-medium">
                            /{cat.total}
                          </span>
                        </div>

                        {/* Abilities List */}
                        {cat.items.length > 0 ? (
                          <div className="space-y-2.5">
                            {cat.items.map((ability, aIdx) => (
                              <div key={aIdx} className="flex items-start gap-2">
                                <span className={`text-sm mt-0.5 ${cat.dotColor} font-bold`}>✦</span>
                                <p className="text-sm text-foreground leading-snug">
                                  {ability.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground/60 italic">
                            Không có kỹ năng đã đăng ký
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* FULL WIDTH DOCUMENTS SECTION (MỤC IV) */}
            <div className="mt-12 pt-12 border-t border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border/60 mb-8 pb-4">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#FF5722] mb-2 sm:mb-1">
                    Mục IV
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                    Chứng chỉ & Tài liệu
                  </h2>
                </div>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-4 sm:mt-0">
                  {selectedItem.documents.length} Tài liệu đã nộp
                </p>
              </div>

              {selectedItem.documents.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText
                    size={48}
                    className="text-muted-foreground/30 mx-auto mb-4"
                    weight="duotone"
                  />
                  <p className="text-sm text-muted-foreground font-medium">
                    Chưa có tài liệu đính kèm
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {selectedItem.documents.map((doc, idx) => (
                    <div
                      key={doc.id}
                      className="group cursor-pointer flex flex-col"
                      onClick={() =>
                        setPreviewDoc({
                          url: doc.fileUrl,
                          name: doc.fileTypeName || doc.fileTypeCode,
                        })
                      }
                    >
                      {/* Image Preview Area */}
                      <div className="aspect-[1.6] bg-muted/30 overflow-hidden mb-5 relative border border-border/60 shadow-sm rounded-sm">
                        {doc.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          <img
                            src={doc.fileUrl}
                            alt={doc.fileTypeName || "Document"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted/40 group-hover:bg-muted/60 transition-colors duration-500">
                            <FileText
                              size={56}
                              className="text-muted-foreground/40"
                              weight="duotone"
                            />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />

                        {/* Download button overlaid */}
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-300 shadow-md bg-white/90 hover:bg-white text-black border border-white/20"
                          asChild
                        >
                          <a
                            href={doc.fileUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Tải xuống"
                          >
                            <Download size={15} weight="bold" />
                          </a>
                        </Button>
                      </div>

                      {/* Info Area */}
                      <div className="flex-1 flex flex-col">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF5722] mb-1.5 flex items-center gap-1.5">
                          Tài liệu {String(idx + 1).padStart(2, "0")}
                        </p>
                        <h4 className="text-base font-bold text-foreground mb-1 leading-tight line-clamp-2">
                          {doc.fileTypeName || doc.fileTypeCode}
                        </h4>

                        <div className="mt-auto pt-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 pt-3 border-t border-border/40">
                            Tải lên{" "}
                            {new Date(doc.uploadedAt).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DashboardLayout>
        {renderReviewDialog()}
        {renderPreviewDialog()}
      </>
    );
  }

  // ──── List view ────
  return (
    <>
      <DashboardLayout
        favorites={dashboardData.favorites}
        projects={dashboardData.projects}
        cloudStorage={dashboardData.cloudStorage}
      >
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <ShieldCheck size={20} weight="bold" className="text-foreground" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Quản lý hồ sơ
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
              Xác nhận cứu hộ viên
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Xem xét và phê duyệt hồ sơ của hộ viên
            </p>
          </div>

          {/* Stats Cards — Editorial Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Tổng hồ sơ",
                value: stats.total,
                icon: <Users size={22} weight="duotone" />,
                iconColor: "text-violet-500",
              },
              {
                label: "Chờ xác nhận",
                value: stats.pending,
                icon: <ClockCountdown size={22} weight="duotone" />,
                iconColor: "text-amber-500",
              },
              {
                label: "Đã xác nhận",
                value: stats.approved,
                icon: <UserCheck size={22} weight="duotone" />,
                iconColor: "text-emerald-500",
              },
              {
                label: "Đã từ chối",
                value: stats.rejected,
                icon: <UserMinus size={22} weight="duotone" />,
                iconColor: "text-rose-500",
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="border border-border/60 rounded-2xl p-5 bg-card hover:border-border transition-all duration-300 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-black tracking-tight text-foreground mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`p-2 rounded-xl border border-border/60 ${stat.iconColor} transition-transform duration-300 group-hover:scale-110`}
                  >
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters & Search — Flat editorial toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
            {/* Tab filters */}
            <div className="flex items-center gap-0">
              {(
                [
                  { key: "all", label: "Tất cả", count: stats.total },
                  { key: "Pending", label: "Chờ duyệt", count: stats.pending },
                  { key: "Approved", label: "Đã duyệt", count: stats.approved },
                  { key: "Từ chối", label: "Từ chối", count: stats.rejected },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key === "Từ chối" ? "Rejected" : tab.key)}
                  className={`relative px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors duration-150 ${(tab.key === "Từ chối" ? statusFilter === "Rejected" : statusFilter === tab.key)
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {tab.label}
                  <span className="ml-1.5 font-bold">{tab.count}</span>
                  {(tab.key === "Từ chối" ? statusFilter === "Rejected" : statusFilter === tab.key) && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                  )}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="w-full sm:w-72">
              <div className="relative">
                <MagnifyingGlass
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-transparent border-0 ring-1 ring-border/60 focus:ring-foreground transition-all rounded-md text-xs font-medium placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          </div>

          {/* Table — Clean minimal rows */}
          {isLoadingApplications ? (
            <div className="py-10 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-border/60 rounded-3xl bg-muted/5">
              <Users
                size={40}
                className="mx-auto text-muted-foreground/30 mb-3"
                weight="duotone"
              />
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                Không tìm thấy hồ sơ nào
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredItems.map((item) => {
                const status = getStatusConfig(item.status);
                return (
                  <div
                    key={item.id}
                    className="group border border-border/50 rounded-2xl px-4 sm:px-5 py-2 sm:py-3 bg-card hover:bg-muted/10 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4"
                    onClick={() => setSelectedItem(item)}
                  >
                    {/* User initial/avatar */}
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt="User Avatar"
                        className="w-12 h-12 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform duration-300 border border-border/40"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-black dark:bg-white/10 flex items-center justify-center text-white dark:text-white font-black text-lg shrink-0 group-hover:scale-105 transition-transform duration-300">
                        {item.firstName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                      <div>
                        <h3 className="font-bold text-foreground text-sm uppercase tracking-wide">
                          {getFullName(item)}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-medium">
                            <MapPin size={13} />
                            {item.province}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground/80 font-medium pb-px">
                            <IdentificationCard size={13} />
                            Mã hồ sơ: #{item.id}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-border/40">
                        <Badge
                          className={`${status.className} border text-[10px] gap-1 font-bold uppercase tracking-widest px-2 pb-px`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${status.dotColor}`}
                          />
                          {status.label}
                        </Badge>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest sm:mt-1 ml-auto sm:ml-0">
                          {new Date(item.submittedAt).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center justify-center p-2 rounded-lg bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0">
                      <Eye size={16} weight="bold" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
      {renderReviewDialog()}
      {renderPreviewDialog()}
    </>
  );
};

export default RescuerVerificationPage;
