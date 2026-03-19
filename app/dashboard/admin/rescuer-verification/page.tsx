"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  ArrowUp,
  ArrowDown,
  ArrowsDownUp,
  CaretDown,
  Check,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { uploadImageToCloudinary } from "@/utils/uploadFile";
import { DashboardSkeleton } from "@/components/admin";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  useRescuerApplications,
  useReviewRescuerApplication,
} from "@/services/rescuer_application/hooks";
import { RescuerApplicationEntity } from "@/services/rescuer_application/type";
import { useUpdateUserAvatar } from "@/services/user/hooks";

type StatusFilter = "all" | "Pending" | "Approved" | "Rejected";
type SortColumn = "name" | "email" | "rescuerType" | "region" | "status" | "submittedAt";
type SortDir = "asc" | "desc";
type SortState = { column: SortColumn; dir: SortDir } | null;

const ITEMS_PER_PAGE = 15;

const STATUS_OPTIONS = [
  { value: "Pending", label: "Chờ xét duyệt" },
  { value: "Approved", label: "Đã duyệt" },
  { value: "Rejected", label: "Đã từ chối" },
];

const RESCUER_TYPE_OPTIONS = [
  { value: "Core", label: "Cứu hộ hệ thống" },
  { value: "Volunteer", label: "Tình nguyện viên" },
];

// ─── Sort helpers ───────────────────────────────────────────────────────────

const SortIcon = ({ column, sort }: { column: SortColumn; sort: SortState }) => {
  if (sort?.column === column)
    return sort.dir === "asc" ? (
      <ArrowUp size={13} className="text-primary shrink-0" />
    ) : (
      <ArrowDown size={13} className="text-primary shrink-0" />
    );
  return <ArrowsDownUp size={13} className="text-muted-foreground/30 shrink-0" />;
};

const SortHeader = ({
  column,
  label,
  sort,
  onSort,
}: {
  column: SortColumn;
  label: string;
  sort: SortState;
  onSort: (col: SortColumn) => void;
}) => (
  <th className="text-left p-3">
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-sm tracking-tighter font-semibold text-foreground hover:text-foreground/70 transition-colors"
    >
      {label}
      <SortIcon column={column} sort={sort} />
    </button>
  </th>
);

/** Build full name (Vietnamese: lastName firstName) */
const getFullName = (item: RescuerApplicationEntity) =>
  `${item.lastName} ${item.firstName}`;


const RescuerVerificationPage = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedItem, setSelectedItem] =
    useState<RescuerApplicationEntity | null>(null);
  const [loading, setLoading] = useState(true);

  useGSAP(
    () => {
      if (selectedItem) {
        gsap.fromTo(
          ".gsap-item",
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, stagger: 0.1, duration: 0.5, ease: "power2.out", clearProps: "all" }
        );
      }
    },
    { scope: containerRef, dependencies: [selectedItem] }
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(null);
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

        const url = await uploadImageToCloudinary(avatarFile);

        toast.loading("Đang cập nhật hệ thống...");
        await updateAvatarMutate({
          userId: reviewDialog.item.userId,
          avatarUrl: url
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
      params: { pageNumber: 1, pageSize: 1000 },
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

  const filteredAndSorted = useMemo(() => {
    let result = items;

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

    if (selectedStatuses.length > 0) {
      result = result.filter((i) => selectedStatuses.includes(i.status));
    }

    if (selectedTypes.length > 0) {
      result = result.filter((i) => selectedTypes.includes(i.rescuerType));
    }

    if (sort) {
      result = [...result].sort((a, b) => {
        let aVal = "";
        let bVal = "";
        if (sort.column === "name") { aVal = getFullName(a); bVal = getFullName(b); }
        else if (sort.column === "email") { aVal = a.email; bVal = b.email; }
        else if (sort.column === "rescuerType") { aVal = a.rescuerType ?? ""; bVal = b.rescuerType ?? ""; }
        else if (sort.column === "region") { aVal = a.province; bVal = b.province; }
        else if (sort.column === "status") { aVal = a.status; bVal = b.status; }
        else if (sort.column === "submittedAt") { aVal = a.submittedAt; bVal = b.submittedAt; }
        const cmp = aVal.localeCompare(bVal, "vi");
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [items, searchQuery, selectedStatuses, selectedTypes, sort]);

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
          <div ref={containerRef} className="space-y-8">
            {/* Back */}
            <button
              onClick={() => {
                setSelectedItem(null);
                setAvatarFile(null);
                setAvatarPreview(null);
              }}
              className="gsap-item flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-6"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              <span className="uppercase tracking-wider text-sm font-semibold">
                Quay lại
              </span>
            </button>

            {/* Profile Header */}
            <div className="gsap-item border border-border/60 rounded-2xl overflow-hidden bg-card">
              {/* Minimal top bar */}
              <div className="h-1.5 bg-linear-to-r from-black/80 via-black/60 to-black/30 dark:from-white/30 dark:via-white/20 dark:to-white/5" />
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
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tighter text-foreground">
                      {getFullName(selectedItem)}
                    </h2>
                    <Badge
                      className={`${statusConfig.className} border text-[14px] gap-2 font-semibold`}
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
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm uppercase tracking-tighter font-semibold"
                      >
                        <CheckCircle size={15} className="mr-1" weight="bold" />
                        Phê duyệt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isReviewing}
                        onClick={() => openReviewDialog(selectedItem, false)}
                        className="border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-sm uppercase tracking-tighter font-semibold"
                      >
                        <XCircle size={15} className="mr-1" weight="bold" />
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
              <div className="gsap-item border border-border/60 rounded-2xl bg-card p-6">
                <div className="border-b border-border/60 mb-8 pb-4">
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#FF5722] mb-2 sm:mb-1">
                    Mục I
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground mt-1">
                    Thông tin cá nhân
                  </h2>
                </div>
                <div className="space-y-5">
                  {[
                    {
                      icon: <Briefcase size={20} />,
                      label: "Loại chứng nhận",
                      value: (
                        <Badge className="mt-1 bg-black/5 dark:bg-white/10 text-foreground border border-border/60 font-medium pb-px pt-0.5 px-2">
                          {selectedItem.rescuerType}
                        </Badge>
                      ),
                    },
                    {
                      icon: <Envelope size={20} />,
                      label: "Email",
                      value: selectedItem.email,
                    },
                    {
                      icon: <Phone size={20} />,
                      label: "Số điện thoại",
                      value: selectedItem.phone,
                    },
                    {
                      icon: <MapPin size={20} />,
                      label: "Địa chỉ",
                      value: `${selectedItem.address ? selectedItem.address + ', ' : ''}${selectedItem.ward ? selectedItem.ward + ', ' : ''}${selectedItem.province}`,
                    },
                    {
                      icon: <CalendarBlank size={20} />,
                      label: "Ngày đăng ký",
                      value: new Date(selectedItem.submittedAt).toLocaleString("vi-VN"),
                    },
                    ...(selectedItem.reviewedAt
                      ? [
                        {
                          icon: <ShieldCheck size={20} />,
                          label: "Ngày xét duyệt",
                          value: new Date(selectedItem.reviewedAt).toLocaleString("vi-VN"),
                        },
                      ]
                      : []),
                    ...(selectedItem.adminNote
                      ? [
                        {
                          icon: <FileText size={20} />,
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
              <div className="gsap-item space-y-6">
                {selectedItem.status === "Pending" ? (
                  <div className="border border-emerald-500/30 rounded-2xl bg-emerald-500/5 p-6 h-full flex flex-col">
                    <div className="border-b border-emerald-500/20 mb-6 pb-4">
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2 sm:mb-1">
                        Mục II
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-emerald-700 dark:text-emerald-400 mt-1">
                        Ảnh đại diện
                      </h2>
                    </div>
                    <p className="text-[14px] text-emerald-600/80 mb-4 tracking-tighter font-medium">
                      Tải lên ảnh 3x4 hoặc ảnh rõ mặt.
                    </p>

                    <div className="flex-1 flex flex-col justify-center">
                      {!avatarPreview ? (
                        <label className="flex flex-col items-center justify-center w-full h-full min-h-40 border-2 border-dashed border-emerald-500/40 rounded-xl cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500/60 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadSimple size={24} className="text-emerald-600 mb-2" weight="duotone" />
                            <p className="text-sm tracking-tighter font-medium text-emerald-700 dark:text-emerald-400">
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
                            <p className="text-sm tracking-tighter font-bold text-foreground truncate">{avatarFile?.name}</p>
                            <p className="text-xs tracking-tighter text-muted-foreground mt-0.5">
                              {(avatarFile!.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                              onClick={() => {
                                setAvatarFile(null);
                                setAvatarPreview(null);
                              }}
                              className="text-sm tracking-tighter font-semibold text-rose-500 hover:text-rose-600 mt-2 flex items-center gap-1"
                            >
                              <Trash size={20} /> Hủy ảnh này
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
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground mt-1">
                        Ảnh đại diện
                      </h2>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      {selectedItem.avatarUrl ? (
                        <img
                          src={selectedItem.avatarUrl}
                          alt="User Avatar"
                          className="w-64 sm:w-80 h-auto aspect-3/4 object-cover shadow-sm border border-border/60 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewDoc({ url: selectedItem.avatarUrl!, name: "Ảnh đại diện" })}
                          title="Phóng to"
                        />
                      ) : (
                        <div className="w-64 sm:w-80 aspect-3/4 bg-muted/40 flex flex-col items-center justify-center border border-dashed border-border/60 text-muted-foreground">
                          <ImageIcon size={48} weight="duotone" className="mb-3 opacity-50" />
                          <span className="text-sm font-medium uppercase tracking-tighter">Chưa có ảnh</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MỤC III: NĂNG LỰC CỨU HỘ */}
            {(() => {
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
                <div className="gsap-item mt-12 pt-12 border-t border-border/40 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border/60 mb-8 pb-4">
                    <div>
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#FF5722] mb-2 sm:mb-1">
                        Mục III
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground">
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
                            <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
                              {cat.number}
                            </p>
                            <p className="text-lg font-bold tracking-tighter text-foreground">
                              {cat.label}
                            </p>
                          </div>
                        </div>

                        {/* Count */}
                        <div className="mb-5">
                          <span className="text-3xl font-black tracking-tighter text-foreground">
                            {cat.items.length}
                          </span>
                          <span className="text-lg tracking-tighter text-muted-foreground font-medium">
                            /{cat.total}
                          </span>
                        </div>

                        {/* Abilities List */}
                        {cat.items.length > 0 ? (
                          <div className="space-y-2.5">
                            {cat.items.map((ability, aIdx) => (
                              <div key={aIdx} className="flex items-start gap-2">
                                <span className={`text-sm mt-0.5 ${cat.dotColor} font-bold`}>✦</span>
                                <p className="text-sm tracking-tighter text-foreground leading-snug">
                                  {ability.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm tracking-tighter text-muted-foreground/60 italic">
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
            <div className="gsap-item mt-12 pt-12 border-t border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-border/60 mb-8 pb-4">
                <div>
                  <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#FF5722] mb-2 sm:mb-1">
                    Mục IV
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground">
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
                  <p className="text-sm tracking-tighter text-muted-foreground font-medium">
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
                        <h4 className="text-base font-bold tracking-tighter text-foreground mb-1 leading-tight line-clamp-2">
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
  const handleSort = (column: SortColumn) => {
    setPage(1);
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, dir: "asc" };
      if (prev.dir === "asc") return { column, dir: "desc" };
      return null;
    });
  };

  const toggleStatus = (value: string) => {
    setPage(1);
    setSelectedStatuses((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const toggleType = (value: string) => {
    setPage(1);
    setSelectedTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };

  const hasFilters = !!(searchQuery || selectedStatuses.length > 0 || selectedTypes.length > 0);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedItems = filteredAndSorted.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );
  const startItem = filteredAndSorted.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(safePage * ITEMS_PER_PAGE, filteredAndSorted.length);

  return (
    <>
      <DashboardLayout
        favorites={dashboardData.favorites}
        projects={dashboardData.projects}
        cloudStorage={dashboardData.cloudStorage}
      >
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <ShieldCheck size={20} weight="bold" className="text-foreground" />
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Quản lý hồ sơ
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Xác nhận cứu hộ viên
            </h1>
            <p className="text-[16px] tracking-tighter text-muted-foreground mt-1.5">
              Xem xét và phê duyệt hồ sơ của cứu hộ viên
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Tổng hồ sơ",
                value: stats.total,
                icon: Users,
                color: "text-blue-600 dark:text-blue-400",
                bgColor: "bg-blue-50 dark:bg-blue-950/30",
              },
              {
                label: "Chờ xét duyệt",
                value: stats.pending,
                icon: ClockCountdown,
                color: "text-amber-600 dark:text-amber-400",
                bgColor: "bg-amber-50 dark:bg-amber-950/30",
              },
              {
                label: "Đã duyệt",
                value: stats.approved,
                icon: UserCheck,
                color: "text-emerald-600 dark:text-emerald-400",
                bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
              },
              {
                label: "Đã từ chối",
                value: stats.rejected,
                icon: UserMinus,
                color: "text-rose-600 dark:text-rose-400",
                bgColor: "bg-rose-50 dark:bg-rose-950/30",
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="border border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm tracking-tighter text-muted-foreground font-medium mb-1">
                          {stat.label}
                        </p>
                        <p className="text-2xl tracking-tighter font-bold text-foreground">
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                      >
                        <Icon size={24} className={stat.color} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Table Card */}
          <Card className="border border-border/50">
            <CardContent>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border/40">
                {/* Search */}
                <div className="relative flex-1 min-w-52">
                  <Input
                    placeholder="Tìm theo tên, email, số điện thoại..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="pl-9 h-9 text-sm"
                    autoComplete="off"
                  />
                  <MagnifyingGlass
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                </div>

                {/* Loại cứu hộ filter */}
                <Popover open={typeFilterOpen} onOpenChange={setTypeFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal text-sm">
                      Loại cứu hộ
                      {selectedTypes.length > 0 ? (
                        <Badge className="h-4.5 px-1.5 text-xs tracking-tighter rounded-full bg-primary text-primary-foreground">
                          {selectedTypes.length}
                        </Badge>
                      ) : (
                        <CaretDown size={13} className="text-muted-foreground" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-1.5" align="start">
                    {RESCUER_TYPE_OPTIONS.map(({ value, label }) => {
                      const checked = selectedTypes.includes(value);
                      return (
                        <button
                          key={value}
                          onClick={() => toggleType(value)}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm tracking-tighter rounded-md hover:bg-muted/60 transition-colors"
                        >
                          <span
                            className={`flex items-center justify-center size-4 rounded border shrink-0 transition-colors ${
                              checked
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border bg-background"
                            }`}
                          >
                            {checked && <Check size={11} weight="bold" />}
                          </span>
                          <span className={checked ? "font-medium tracking-tighter" : ""}>{label}</span>
                        </button>
                      );
                    })}
                    {selectedTypes.length > 0 && (
                      <button
                        onClick={() => { setSelectedTypes([]); setPage(1); }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 mt-1 text-xs text-muted-foreground border-t border-border/40 hover:text-foreground transition-colors"
                      >
                        <X size={11} />
                        Xóa lọc loại
                      </button>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Status filter */}
                <Popover open={statusFilterOpen} onOpenChange={setStatusFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal text-sm">
                      Trạng thái
                      {selectedStatuses.length > 0 ? (
                        <Badge className="h-4.5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
                          {selectedStatuses.length}
                        </Badge>
                      ) : (
                        <CaretDown size={13} className="text-muted-foreground" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1.5" align="start">
                    {STATUS_OPTIONS.map(({ value, label }) => {
                      const checked = selectedStatuses.includes(value);
                      return (
                        <button
                          key={value}
                          onClick={() => toggleStatus(value)}
                          className="flex items-center gap-2.5 w-full px-3 py-2 text-sm tracking-tighter rounded-md hover:bg-muted/60 transition-colors"
                        >
                          <span
                            className={`flex items-center justify-center size-4 rounded border shrink-0 transition-colors ${
                              checked
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border bg-background"
                            }`}
                          >
                            {checked && <Check size={11} weight="bold" />}
                          </span>
                          <span className={checked ? "font-medium" : ""}>{label}</span>
                        </button>
                      );
                    })}
                    {selectedStatuses.length > 0 && (
                      <button
                        onClick={() => { setSelectedStatuses([]); setPage(1); }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 mt-1 text-xs text-muted-foreground border-t border-border/40 hover:text-foreground transition-colors"
                      >
                        <X size={11} />
                        Xóa lọc trạng thái
                      </button>
                    )}
                  </PopoverContent>
                </Popover>

                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 text-muted-foreground gap-1 text-sm"
                  >
                    <X size={13} />
                    Xóa bộ lọc
                  </Button>
                )}

                <div className="ml-auto text-sm tracking-tighter text-muted-foreground whitespace-nowrap">
                  {hasFilters
                    ? `${filteredAndSorted.length} / ${items.length.toLocaleString("vi-VN")} hồ sơ`
                    : `${items.length.toLocaleString("vi-VN")} hồ sơ`}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <SortHeader column="name" label="Họ và tên" sort={sort} onSort={handleSort} />
                      <SortHeader column="email" label="Email" sort={sort} onSort={handleSort} />
                      <th className="text-left tracking-tighter p-3 text-sm font-semibold text-foreground">
                        Số điện thoại
                      </th>
                      <SortHeader column="rescuerType" label="Loại cứu hộ" sort={sort} onSort={handleSort} />
                      <SortHeader column="region" label="Khu vực" sort={sort} onSort={handleSort} />
                      <SortHeader column="status" label="Trạng thái" sort={sort} onSort={handleSort} />
                      <SortHeader column="submittedAt" label="Ngày nộp" sort={sort} onSort={handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingApplications ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/30">
                          {Array.from({ length: 7 }).map((__, j) => (
                            <td key={j} className="p-3">
                              <Skeleton className="h-4 w-full rounded" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : paginatedItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-10 text-center tracking-tighter text-muted-foreground text-sm"
                        >
                          Không tìm thấy hồ sơ nào
                        </td>
                      </tr>
                    ) : (
                      paginatedItems.map((item) => {
                        const statusConfig = getStatusConfig(item.status);
                        const typeBadge =
                          item.rescuerType === "Core"
                            ? { label: "Cứu hộ hệ thống", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" }
                            : item.rescuerType === "Volunteer"
                            ? { label: "Tình nguyện viên", className: "bg-violet-500/10 text-violet-700 dark:text-violet-400" }
                            : { label: item.rescuerType ?? "—", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400" };
                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                          >
                            <td className="p-3">
                              <div className="text-sm tracking-tighter font-medium text-foreground">
                                {getFullName(item)}
                              </div>
                            </td>
                            <td className="p-3 text-sm tracking-tighter text-foreground/70">
                              {item.email}
                            </td>
                            <td className="p-3 text-sm tracking-tighter text-foreground/80">
                              {item.phone || "—"}
                            </td>
                            <td className="p-3">
                              <Badge className={typeBadge.className}>{typeBadge.label}</Badge>
                            </td>
                            <td className="p-3 text-sm tracking-tighter text-foreground/80">
                              {item.province || "Chưa cập nhật"}
                            </td>
                            <td className="p-3">
                              <Badge className={`${statusConfig.className} border gap-1`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                                {statusConfig.label}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm tracking-tighter text-foreground/60">
                              {new Date(item.submittedAt).toLocaleDateString("vi-VN")}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <div className="text-sm tracking-tighter text-muted-foreground">
                    Hiển thị {startItem}–{endItem} trong {filteredAndSorted.length} hồ sơ
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                    >
                      Trước
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                        .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                          if (
                            idx > 0 &&
                            typeof arr[idx - 1] === "number" &&
                            (p as number) - (arr[idx - 1] as number) > 1
                          ) {
                            acc.push("...");
                          }
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === "..." ? (
                            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">
                              …
                            </span>
                          ) : (
                            <Button
                              key={p}
                              variant={p === safePage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(p as number)}
                              className="min-w-10"
                            >
                              {p}
                            </Button>
                          )
                        )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
      {renderReviewDialog()}
      {renderPreviewDialog()}
    </>
  );
};

export default RescuerVerificationPage;
