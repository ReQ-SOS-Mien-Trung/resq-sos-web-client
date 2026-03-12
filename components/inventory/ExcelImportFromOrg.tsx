"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UploadSimple,
  FileXls,
  Trash,
  FloppyDisk,
  WarningCircle,
  ArrowCounterClockwise,
  DownloadSimple,
  X,
  CheckCircle,
  ArrowLeft,
  Buildings,
  SpinnerGap,
} from "@phosphor-icons/react";
import {
  useInventoryItemTypes,
  useInventoryTargetGroups,
  useInventoryOrganizations,
  useImportInventory,
} from "@/services/inventory/hooks";
import type { ImportInventoryItem } from "@/services/inventory/type";

// ─── System categories (seed) ───
const SYSTEM_CATEGORIES = [
  { label: "Thực phẩm", value: "Food" },
  { label: "Nước uống", value: "Water" },
  { label: "Y tế", value: "Medical" },
  { label: "Vệ sinh cá nhân", value: "Hygiene" },
  { label: "Quần áo", value: "Clothing" },
  { label: "Nơi trú ẩn", value: "Shelter" },
  { label: "Công cụ sửa chữa", value: "RepairTools" },
  { label: "Thiết bị cứu hộ", value: "RescueEquipment" },
  { label: "Sưởi ấm", value: "Heating" },
] as const;

// Vietnamese → category code mapping (for Excel parsing)
const CATEGORY_VI_MAP: Record<string, string> = {
  "thực phẩm": "Food",
  "nước uống": "Water",
  "y tế": "Medical",
  "vệ sinh cá nhân": "Hygiene",
  "quần áo": "Clothing",
  "nơi trú ẩn": "Shelter",
  "công cụ sửa chữa": "RepairTools",
  "thiết bị cứu hộ": "RescueEquipment",
  "sưởi ấm": "Heating",
  food: "Food",
  water: "Water",
  medical: "Medical",
  hygiene: "Hygiene",
  clothing: "Clothing",
  shelter: "Shelter",
  repairtools: "RepairTools",
  rescueequipment: "RescueEquipment",
  heating: "Heating",
};

// ─── Excel column names (matching the template screenshot) ───
const COL = {
  STT: "STT",
  TEN: "Tên vật phẩm",
  DANHMUC: "Danh mục",
  DOITUONG: "Đối tượng",
  LOAI: "Loại vật phẩm",
  DONVI: "Đơn vị",
  SOLUONG: "Số lượng",
  HETHAN: "Ngày hết hạn",
  NHAN: "Ngày nhận",
  GHICHU: "Ghi chú",
} as const;

// ─── Row type ───
interface ImportRow {
  id: string;
  row: number;
  itemName: string;
  categoryCode: string;
  targetGroup: string;
  itemType: string;
  unit: string;
  quantity: number;
  expiredDate: string;
  receivedDate: string;
  notes: string;
  errors: Record<string, string>;
}

// ─── Steps ───
type Step = "upload" | "review";

// ─── Date helper ───
function parseExcelDate(val: unknown): string {
  if (!val) return "";
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      return `${String(date.y).padStart(4, "0")}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }
  const str = String(val).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return str;
}

// ─── Component ───
export default function ExcelImportFromOrg() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch metadata from API
  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: targetGroupsData } = useInventoryTargetGroups();
  const { data: organizationsData } = useInventoryOrganizations();
  const importMutation = useImportInventory();

  const itemTypes = useMemo(() => itemTypesData ?? [], [itemTypesData]);
  const targetGroups = useMemo(() => targetGroupsData ?? [], [targetGroupsData]);
  const organizations = useMemo(() => organizationsData ?? [], [organizationsData]);

  // ─── Validate a single row ───
  const validateRow = useCallback((row: Omit<ImportRow, "errors">): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!row.itemName) errors.itemName = "Tên vật phẩm không được trống";
    if (!row.categoryCode) errors.categoryCode = "Danh mục không hợp lệ";
    if (!row.quantity || row.quantity <= 0) errors.quantity = "Số lượng phải > 0";
    if (!row.unit) errors.unit = "Đơn vị không được trống";
    if (!row.itemType) errors.itemType = "Loại vật phẩm không được trống";
    if (!row.targetGroup) errors.targetGroup = "Đối tượng không được trống";
    if (!row.receivedDate) errors.receivedDate = "Ngày nhận không được trống";
    return errors;
  }, []);

  // ─── Parse Excel ───
  const parseExcel = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

          if (jsonData.length === 0) {
            toast.error("File Excel không có dữ liệu");
            return;
          }

          const parsed: ImportRow[] = jsonData.map((raw, idx) => {
            const rawCategory = String(raw[COL.DANHMUC] ?? "").trim();
            const categoryCode = CATEGORY_VI_MAP[rawCategory.toLowerCase()] ?? "";

            const itemName = String(raw[COL.TEN] ?? "").trim();
            const targetGroup = String(raw[COL.DOITUONG] ?? "").trim();
            const itemType = String(raw[COL.LOAI] ?? "").trim();
            const unit = String(raw[COL.DONVI] ?? "").trim();
            const quantity = Number(raw[COL.SOLUONG] ?? 0);
            const expiredDate = parseExcelDate(raw[COL.HETHAN]);
            const receivedDate = parseExcelDate(raw[COL.NHAN]);
            const notes = String(raw[COL.GHICHU] ?? "").trim();

            const rowData = {
              id: `row-${idx}-${Date.now()}`,
              row: idx + 1,
              itemName,
              categoryCode,
              targetGroup,
              itemType,
              unit,
              quantity: quantity > 0 ? quantity : 0,
              expiredDate,
              receivedDate,
              notes,
            };

            return { ...rowData, errors: validateRow(rowData) };
          });

          setRows(parsed);
          setFileName(file.name);
          setStep("review");

          const errCount = parsed.filter((r) => Object.keys(r.errors).length > 0).length;
          if (errCount > 0) {
            toast.warning(`${parsed.length} dòng đã đọc. ${errCount} dòng có lỗi cần kiểm tra.`);
          } else {
            toast.success(`${parsed.length} dòng đã đọc thành công`);
          }
        } catch {
          toast.error("Không thể đọc file Excel. Vui lòng kiểm tra lại file.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [validateRow],
  );

  // ─── File handling ───
  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Chỉ chấp nhận file .xlsx");
        return;
      }
      parseExcel(file);
    },
    [parseExcel],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  // ─── Row editing ───
  const updateRow = useCallback(
    (id: string, field: keyof ImportRow, value: string | number) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;
          const updated = { ...row, [field]: value };
          updated.errors = validateRow(updated);
          return updated;
        }),
      );
    },
    [validateRow],
  );

  const deleteRow = useCallback((id: string) => {
    setRows((prev) =>
      prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, row: i + 1 })),
    );
  }, []);

  // ─── Summary ───
  const errorCount = useMemo(
    () => rows.filter((r) => Object.keys(r.errors).length > 0).length,
    [rows],
  );
  const validCount = rows.length - errorCount;

  // ─── Submit ───
  const handleSubmit = useCallback(() => {
    if (rows.length === 0) {
      toast.error("Không có dữ liệu để nhập kho");
      return;
    }
    if (errorCount > 0) {
      toast.error(`Còn ${errorCount} dòng lỗi. Vui lòng sửa trước khi nhập.`);
      return;
    }
    if (!organizationId) {
      toast.error("Vui lòng chọn tổ chức viện trợ");
      return;
    }

    const items: ImportInventoryItem[] = rows.map((r) => ({
      row: r.row,
      itemName: r.itemName,
      categoryCode: r.categoryCode,
      quantity: r.quantity,
      unit: r.unit,
      itemType: r.itemType,
      targetGroup: r.targetGroup,
      receivedDate: r.receivedDate,
      expiredDate: r.expiredDate || null,
      notes: r.notes || null,
    }));

    const payload = { organizationId: Number(organizationId), items };

    importMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(`Nhập kho thành công ${rows.length} vật phẩm từ tổ chức!`);
        router.push("/dashboard/inventory");
      },
      onError: (err: any) => {
        const errorMsg = err.response?.data?.message || err.message || "Lỗi không xác định";
        toast.error(`Nhập kho thất bại: ${errorMsg}`);
      },
    });
  }, [rows, errorCount, organizationId, importMutation, router]);

  // ─── Reset ───
  const handleReset = useCallback(() => {
    setStep("upload");
    setRows([]);
    setFileName("");
  }, []);

  // ─── Download template ───
  const handleDownloadTemplate = useCallback(() => {
    // Tải file Excel có sẵn từ thư mục public/templates/
    const link = document.createElement("a");
    link.href = "/templates/mau_nhap_kho_to_chuc.xlsx";
    link.download = "mau_nhap_kho_to_chuc.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Đã tải file mẫu");
  }, []);

  // ─── Render: Cell with error ───
  const renderInputCell = (
    row: ImportRow,
    field: keyof Omit<ImportRow, "errors" | "id">,
    placeholder: string,
    type: "text" | "number" = "text",
  ) => {
    const error = row.errors[field];
    const rawValue = row[field];
    const value = type === "number" ? (rawValue || "") : String(rawValue ?? "");
    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            type={type}
            min={type === "number" ? 1 : undefined}
            value={value}
            onChange={(e) =>
              updateRow(
                row.id,
                field,
                type === "number" ? Number(e.target.value) : e.target.value,
              )
            }
            placeholder={placeholder}
            className={cn(
              "h-8 text-sm",
              error && "border-red-500 focus-visible:ring-red-500",
            )}
          />
          {error && (
            <WarningCircle
              className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500"
              weight="fill"
            />
          )}
        </div>
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    );
  };

  const renderSelectCell = (
    row: ImportRow,
    field: keyof Omit<ImportRow, "errors" | "id">,
    options: { label: string; value: string }[],
    placeholder: string,
  ) => {
    const error = row.errors[field];
    const currentValue = String(row[field] ?? "");
    return (
      <div className="space-y-1">
        <Select
          value={currentValue}
          onValueChange={(val) => updateRow(row.id, field, val)}
        >
          <SelectTrigger
            className={cn(
              "h-8 text-sm",
              error && "border-red-500 focus:ring-red-500",
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    );
  };

  // Map API metadata to select options
  const itemTypeOptions = useMemo(
    () => itemTypes.map((t) => ({ label: t.value, value: t.key })),
    [itemTypes],
  );
  const targetGroupOptions = useMemo(
    () => targetGroups.map((t) => ({ label: t.value, value: t.key })),
    [targetGroups],
  );

  // ─── Render ───
  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/inventory")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FF5722]/10 flex items-center justify-center">
                <Buildings className="h-5 w-5 text-[#FF5722]" weight="duotone" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Nhập kho từ tổ chức
                </h1>
                <p className="text-sm text-muted-foreground">
                  Tải lên file Excel danh sách vật phẩm nhận từ tổ chức viện trợ
                </p>
              </div>
            </div>
          </div>
          {/* Download Template Button - Top Right */}
          {step === "upload" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleDownloadTemplate}
            >
              <DownloadSimple className="h-4 w-4" />
              Tải file mẫu Excel
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-muted/30 p-6">
        {step === "upload" && (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Info */}
              <div className="space-y-6">
                {/* Organization Select */}
                <div className="rounded-xl border bg-card p-6 space-y-3">
                  <label className="text-sm font-medium">
                    Tổ chức viện trợ <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={organizationId}
                    onValueChange={setOrganizationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn tổ chức viện trợ" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.key} value={org.key}>
                          {org.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Chọn tổ chức đã gửi hàng viện trợ đến kho
                  </p>
                </div>

                {/* Column Preview */}
                <div className="rounded-xl border bg-card p-6">
                  <p className="text-sm font-medium mb-3">Các cột trong file Excel:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(COL).map((col) => (
                      <span
                        key={col}
                        className="px-2.5 py-1 rounded-md bg-muted border text-xs font-mono"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Upload Zone */}
              <div className="flex items-stretch">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full border-2 border-dashed rounded-xl p-24 min-h-[500px] flex items-center justify-center cursor-pointer transition-all duration-200",
                    isDragging
                      ? "border-[#FF5722] bg-orange-50 dark:bg-orange-950/20"
                      : "border-muted-foreground/25 hover:border-[#FF5722]/50 hover:bg-muted/50",
                  )}
                >
                  <div className="flex flex-col items-center gap-6 text-center">
                    <div
                      className={cn(
                        "h-28 w-28 rounded-3xl flex items-center justify-center transition-colors",
                        isDragging
                          ? "bg-[#FF5722]/15 text-[#FF5722]"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <UploadSimple className="h-14 w-14" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-semibold text-xl mb-2">Kéo thả file Excel vào đây</p>
                      <p className="text-base text-muted-foreground">
                        hoặc{" "}
                        <span className="text-[#FF5722] font-medium underline underline-offset-2">
                          nhấp để chọn file
                        </span>
                      </p>
                    </div>
                    <div className="mt-4 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Chấp nhận file <code className="px-1.5 py-0.5 rounded bg-muted">.xlsx</code>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tối đa 500 dòng
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <FileXls className="h-5 w-5 text-green-600" weight="duotone" />
                </div>
                <div>
                  <p className="font-medium text-sm">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {rows.length} dòng • {organizations.find((o) => o.key === organizationId)?.value ?? `Tổ chức #${organizationId}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Validation badges */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                  <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                  {validCount} hợp lệ
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                    <WarningCircle className="h-3.5 w-3.5" weight="fill" />
                    {errorCount} lỗi
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground ml-2"
                  onClick={handleReset}
                >
                  <ArrowCounterClockwise className="h-4 w-4" />
                  Chọn file khác
                </Button>
              </div>
            </div>

            {/* Editable Table */}
            <div className="border rounded-xl bg-card overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">STT</TableHead>
                    <TableHead className="min-w-48">Tên vật phẩm</TableHead>
                    <TableHead className="min-w-40">Danh mục</TableHead>
                    <TableHead className="min-w-36">Đối tượng</TableHead>
                    <TableHead className="min-w-36">Loại vật phẩm</TableHead>
                    <TableHead className="min-w-24">Đơn vị</TableHead>
                    <TableHead className="min-w-24">Số lượng</TableHead>
                    <TableHead className="min-w-36">Ngày hết hạn</TableHead>
                    <TableHead className="min-w-36">Ngày nhận</TableHead>
                    <TableHead className="min-w-48">Ghi chú</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const hasErrors = Object.keys(row.errors).length > 0;
                    return (
                      <TableRow
                        key={row.id}
                        className={cn(hasErrors && "bg-red-50/50 dark:bg-red-950/10")}
                      >
                        {/* STT */}
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                          {row.row}
                        </TableCell>

                        {/* Tên vật phẩm */}
                        <TableCell>{renderInputCell(row, "itemName", "Tên vật phẩm")}</TableCell>

                        {/* Danh mục */}
                        <TableCell>
                          {renderSelectCell(
                            row,
                            "categoryCode",
                            SYSTEM_CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
                            "Chọn danh mục",
                          )}
                        </TableCell>

                        {/* Đối tượng */}
                        <TableCell>
                          {targetGroupOptions.length > 0
                            ? renderSelectCell(row, "targetGroup", targetGroupOptions, "Chọn đối tượng")
                            : renderInputCell(row, "targetGroup", "Đối tượng")}
                        </TableCell>

                        {/* Loại vật phẩm */}
                        <TableCell>
                          {itemTypeOptions.length > 0
                            ? renderSelectCell(row, "itemType", itemTypeOptions, "Chọn loại")
                            : renderInputCell(row, "itemType", "Loại vật phẩm")}
                        </TableCell>

                        {/* Đơn vị */}
                        <TableCell>{renderInputCell(row, "unit", "Đơn vị")}</TableCell>

                        {/* Số lượng */}
                        <TableCell>{renderInputCell(row, "quantity", "0", "number")}</TableCell>

                        {/* Ngày hết hạn */}
                        <TableCell>
                          <Input
                            type="date"
                            value={row.expiredDate}
                            onChange={(e) => updateRow(row.id, "expiredDate", e.target.value)}
                            className="h-8 text-sm"
                          />
                        </TableCell>

                        {/* Ngày nhận */}
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="date"
                              value={row.receivedDate}
                              onChange={(e) => updateRow(row.id, "receivedDate", e.target.value)}
                              className={cn(
                                "h-8 text-sm",
                                row.errors.receivedDate && "border-red-500 focus-visible:ring-red-500",
                              )}
                            />
                            {row.errors.receivedDate && (
                              <p className="text-[11px] text-red-500">{row.errors.receivedDate}</p>
                            )}
                          </div>
                        </TableCell>

                        {/* Ghi chú */}
                        <TableCell>
                          <Input
                            value={row.notes}
                            onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                            placeholder="Ghi chú..."
                            className="h-8 text-sm"
                          />
                        </TableCell>

                        {/* Delete */}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            onClick={() => deleteRow(row.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Trash className="h-8 w-8" weight="duotone" />
                          <p>Đã xóa hết dữ liệu</p>
                          <Button variant="outline" size="sm" onClick={handleReset}>
                            Chọn file khác
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                <ArrowCounterClockwise className="h-4 w-4" />
                Hủy
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-[#FF5722] hover:bg-[#E64A19] text-white"
                onClick={handleSubmit}
                disabled={rows.length === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <SpinnerGap className="h-4 w-4 animate-spin" />
                ) : (
                  <FloppyDisk className="h-4 w-4" weight="fill" />
                )}
                {importMutation.isPending ? "Đang nhập kho..." : "Xác nhận nhập kho"}
                {rows.length > 0 && !importMutation.isPending && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-xs">
                    {rows.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
