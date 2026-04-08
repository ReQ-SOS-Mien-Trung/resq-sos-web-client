"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Money,
  Storefront,
  CurrencyDollar,
  FileText,
  Spinner,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/admin/dashboard";
import { useAllocateDisbursement } from "@/services/campaign_disbursement";
import { useDepotMetadata } from "@/services/depot/hooks";

/* ── Main Page ────────────────────────────────────────────── */

export default function FundAllocatePage() {
  const router = useRouter();

  const [fundCampaignId, setFundCampaignId] = useState("");
  const [depotId, setDepotId] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");

  const { data: depotOptions = [], isLoading: loadingDepots } =
    useDepotMetadata();

  const { mutate: allocate, isPending } = useAllocateDisbursement();

  const isValid =
    fundCampaignId.trim() !== "" &&
    depotId !== "" &&
    amount.trim() !== "" &&
    Number(amount) > 0 &&
    purpose.trim() !== "";

  const handleSubmit = () => {
    if (!isValid) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    allocate(
      {
        fundCampaignId: Number(fundCampaignId),
        depotId: Number(depotId),
        amount: Number(amount),
        purpose: purpose.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Cấp quỹ thành công!");
          setFundCampaignId("");
          setDepotId("");
          setAmount("");
          setPurpose("");
        },
        onError: (err) => {
          toast.error("Cấp quỹ thất bại. Vui lòng thử lại.");
          console.error("Allocate error:", err);
        },
      },
    );
  };

  const selectedDepot = depotOptions.find((d) => d.key === Number(depotId));

  return (
    <DashboardLayout
      favorites={[]}
      projects={[]}
      cloudStorage={{ used: 0, total: 0, percentage: 0, unit: "GB" }}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/admin/reports")}
            className="gap-1.5 text-muted-foreground mb-3 -ml-2"
          >
            <ArrowLeft size={14} />
            Quay lại
          </Button>
          <div className="flex items-center gap-2.5 mb-1">
            <Money size={20} weight="bold" className="text-emerald-600" />
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Cấp quỹ
            </p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
            Cấp quỹ cho kho
          </h1>
          <p className="text-base tracking-tighter text-muted-foreground mt-1.5">
            Admin chủ động phân bổ ngân sách từ chiến dịch quỹ cho các kho
          </p>
        </div>

        {/* Form */}
        <Card className="border border-border/50">
          <CardContent className="p-6 space-y-5">
            {/* Campaign ID */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CurrencyDollar size={12} weight="bold" />
                Campaign ID (quỹ nguồn)
              </label>
              <Input
                type="number"
                placeholder="Nhập ID chiến dịch quỹ..."
                value={fundCampaignId}
                onChange={(e) => setFundCampaignId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground tracking-tight">
                ID của chiến dịch gây quỹ từ thiện mà bạn muốn rút tiền
              </p>
            </div>

            {/* Depot */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Storefront size={12} weight="bold" />
                Kho nhận quỹ
              </label>
              {loadingDepots ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : (
                <Select value={depotId} onValueChange={setDepotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn kho..." />
                  </SelectTrigger>
                  <SelectContent>
                    {depotOptions.map((d) => (
                      <SelectItem key={d.key} value={String(d.key)}>
                        {d.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Selected depot info */}
              {selectedDepot && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm tracking-tight">
                  <div className="flex items-center gap-2">
                    <Storefront
                      size={14}
                      className="text-muted-foreground"
                    />
                    <span className="font-semibold">
                      {selectedDepot.value}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Money size={12} weight="bold" />
                Số tiền (VNĐ)
              </label>
              <Input
                type="number"
                placeholder="Nhập số tiền cấp quỹ..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
              />
              {amount && Number(amount) > 0 && (
                <p className="text-sm text-emerald-600 font-semibold tracking-tight">
                  {Number(amount).toLocaleString("vi-VN")}đ
                </p>
              )}
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText size={12} weight="bold" />
                Mục đích
              </label>
              <Textarea
                placeholder="Mô tả mục đích cấp quỹ cho kho..."
                value={purpose}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setPurpose(e.target.value)
                }
                className="min-h-25 resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2 border-t border-border/40">
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-11"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner size={16} className="animate-spin" />
                    Đang xử lý...
                  </span>
                ) : (
                  <>
                    <CheckCircle size={18} weight="bold" />
                    Xác nhận cấp quỹ
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/admin/reports")}
                className="h-11"
              >
                Hủy
              </Button>
            </div>

            {!isValid && (fundCampaignId || depotId || amount || purpose) && (
              <div className="flex items-center gap-2 text-xs text-amber-600 tracking-tight">
                <WarningCircle size={13} />
                Vui lòng điền đầy đủ tất cả các trường
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
