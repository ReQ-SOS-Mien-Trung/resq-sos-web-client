"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  deriveSOSNeeds,
  getSituationLabel,
  getSosTypeLabel,
  getMedicalIssueLabel,
} from "@/lib/sos";
import type { SOSRequestEntity } from "@/services/sos_request/type";
import {
  MapPin,
  Clock,
  Phone,
  FirstAid,
  Users,
  Warning,
  ForkKnife,
  Anchor,
  Shield,
  Siren,
  Stethoscope,
} from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  Pending: { label: "Chờ xử lý", className: "bg-amber-500/10 text-amber-700 border-amber-200" },
  InProgress: { label: "Đang thực thi", className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  Assigned: { label: "Đã giao", className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  Incident: { label: "Sự cố", className: "bg-orange-500/10 text-orange-700 border-orange-200" },
  Resolved: { label: "Đã giải quyết", className: "bg-teal-500/10 text-teal-700 border-teal-200" },
  Completed: { label: "Hoàn thành", className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  Cancelled: { label: "Đã huỷ", className: "bg-slate-500/10 text-slate-700 border-slate-200" },
};

const PRIORITY_LABELS: Record<string, string> = {
  Critical: "Nguy cấp",
  High: "Cao",
  Medium: "Trung bình",
  Low: "Thấp",
};

export interface SOSDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sosRequest: SOSRequestEntity | null;
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[14px] font-bold text-primary tracking-tight mb-3">
    {children}
  </p>
);

const FieldRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="grid grid-cols-[130px_1fr] gap-3 items-start py-2.5 border-b border-border/25 last:border-0">
    <span className="text-sm tracking-tighter text-muted-foreground leading-5">{label}</span>
    <span className="text-sm tracking-tighter text-foreground leading-5 font-medium">{value ?? "—"}</span>
  </div>
);

const SOSDetailSheet = ({ open, onOpenChange, sosRequest }: SOSDetailSheetProps) => {
  if (!sosRequest) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-140 overflow-y-auto p-0 flex flex-col" />
      </Sheet>
    );
  }

  const needs = deriveSOSNeeds(sosRequest.structuredData, sosRequest.sosType);
  const statusConfig = STATUS_LABELS[sosRequest.status] || { label: sosRequest.status, className: "bg-muted" };
  const typeLabel = getSosTypeLabel(sosRequest.sosType);
  const peopleCount = sosRequest.structuredData?.people_count;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-140 overflow-y-auto p-0 flex flex-col">
        {/* Header */}
        <div className="px-6 pt-10 pb-6 border-b border-border/30 bg-muted/10">
          <SheetHeader className="mb-5">
            <SheetTitle className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Siren className="text-primary" weight="fill" />
              Chi tiết Yêu cầu SOS #{sosRequest.id}
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`border ${statusConfig.className}`}>
                {statusConfig.label}
              </Badge>
              <Badge variant={sosRequest.priorityLevel === "Critical" ? "destructive" : "secondary"}>
                Ưu tiên: {PRIORITY_LABELS[sosRequest.priorityLevel] || sosRequest.priorityLevel}
              </Badge>
              <Badge variant="outline">{typeLabel}</Badge>
            </div>

            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Tạo lúc: {new Date(sosRequest.createdAt).toLocaleString("vi-VN")} (
              {formatDistanceToNow(new Date(sosRequest.createdAt), { addSuffix: true, locale: vi })})
            </p>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {/* Thông tin liên hệ */}
          <div className="px-6 py-6 border-b border-border/30">
            <SectionLabel>THÔNG TIN NGƯỜI GỬI / NẠN NHÂN</SectionLabel>
            <div className="bg-muted/20 p-4 rounded-lg border border-border/50">
              <FieldRow 
                label="Họ tên người gửi" 
                value={sosRequest.reporterInfo?.user_name || sosRequest.senderInfo?.user_name || "Chưa cập nhật"} 
              />
              <FieldRow 
                label="SĐT người gửi" 
                value={
                  <span className="flex items-center gap-1.5">
                    <Phone size={14} className="text-muted-foreground" />
                    {sosRequest.reporterInfo?.user_phone || sosRequest.senderInfo?.user_phone || "Chưa cập nhật"}
                  </span>
                } 
              />
              <FieldRow 
                label="Họ tên nạn nhân" 
                value={sosRequest.victimInfo?.user_name || "Chưa cập nhật"} 
              />
              <FieldRow 
                label="SĐT nạn nhân" 
                value={
                  <span className="flex items-center gap-1.5">
                    <Phone size={14} className="text-muted-foreground" />
                    {sosRequest.victimInfo?.user_phone || "Chưa cập nhật"}
                  </span>
                } 
              />
              {sosRequest.isSentOnBehalf && (
                <div className="mt-3 text-sm text-blue-600 bg-blue-50 p-2 rounded flex items-center gap-2">
                  <Shield size={16} /> Đây là yêu cầu được gửi hộ.
                </div>
              )}
            </div>
          </div>

          {/* Địa điểm */}
          <div className="px-6 py-6 border-b border-border/30">
            <SectionLabel>ĐỊA ĐIỂM</SectionLabel>
            <div className="flex items-start gap-3 bg-muted/20 p-4 rounded-lg border border-border/50">
              <MapPin size={20} className="text-rose-500 shrink-0 mt-0.5" weight="fill" />
              <div>
                <p className="font-medium text-sm">
                  {sosRequest.structuredData?.address || "Chưa có thông tin địa chỉ"}
                </p>
                {(sosRequest.latitude !== undefined && sosRequest.longitude !== undefined) && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    Tọa độ: {sosRequest.latitude.toFixed(5)}, {sosRequest.longitude.toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Nội dung cầu cứu */}
          <div className="px-6 py-6 border-b border-border/30">
            <SectionLabel>NỘI DUNG CẦU CỨU</SectionLabel>
            <div className="bg-muted/20 p-4 rounded-lg border border-border/50 whitespace-pre-wrap text-sm leading-relaxed">
              {sosRequest.msg || "Không có nội dung tin nhắn."}
            </div>
          </div>

          {/* Tình trạng & Nhu cầu */}
          <div className="px-6 py-6 border-b border-border/30">
            <SectionLabel>TÌNH TRẠNG & YÊU CẦU</SectionLabel>
            
            {sosRequest.structuredData?.situation && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Hoàn cảnh:</p>
                <Badge variant="secondary" className="text-sm">
                  {getSituationLabel(sosRequest.structuredData.situation)}
                </Badge>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm font-semibold mb-2">Số người cần cứu trợ:</p>
              {peopleCount ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-blue-700">{peopleCount.adult}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Người lớn</div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-amber-700">{peopleCount.child}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Trẻ em</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-purple-700">{peopleCount.elderly}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Người già</div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Không rõ số người.</p>
              )}
            </div>

            <div className="mb-4">
              <p className="text-sm font-semibold mb-2">Nhu cầu hỗ trợ:</p>
              <div className="flex flex-wrap gap-2">
                {needs.medical && (
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-transparent shadow-none gap-1 py-1">
                    <Stethoscope size={14} weight="fill" /> Y tế
                  </Badge>
                )}
                {needs.food && (
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-transparent shadow-none gap-1 py-1">
                    <ForkKnife size={14} weight="fill" /> Nhu yếu phẩm
                  </Badge>
                )}
                {needs.boat && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-transparent shadow-none gap-1 py-1">
                    <Anchor size={14} weight="fill" /> Phương tiện (Xuồng)
                  </Badge>
                )}
                {!needs.medical && !needs.food && !needs.boat && (
                  <span className="text-sm text-muted-foreground">Không có yêu cầu cụ thể</span>
                )}
              </div>
            </div>

            {sosRequest.structuredData?.medical_issues && sosRequest.structuredData.medical_issues.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <FirstAid size={16} className="text-rose-500" weight="fill" /> Vấn đề y tế:
                </p>
                <div className="flex flex-wrap gap-2">
                  {sosRequest.structuredData.medical_issues.map((issue: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                      {getMedicalIssueLabel(issue)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default SOSDetailSheet;
