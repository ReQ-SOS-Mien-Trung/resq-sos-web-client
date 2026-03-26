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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  MagnifyingGlass,
  Plus,
  PencilSimple,
  CaretDown,
} from "@phosphor-icons/react";
import {
  useInventoryItemTypes,
  useInventoryTargetGroups,
  useInventoryOrganizations,
  useImportInventory,
  useDownloadDonationImportTemplate,
} from "@/services/inventory/hooks";
import type { ImportInventoryItem, ImportInventoryRequest } from "@/services/inventory/type";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { DateTimePickerInput } from "@/components/ui/date-time-picker-input";

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

/** Match category from bilingual format like "Thực phẩm - Food" */
function matchCategoryCode(rawCategory: string): string {
  const lower = rawCategory.toLowerCase().trim();
  if (CATEGORY_VI_MAP[lower]) return CATEGORY_VI_MAP[lower];
  // Bilingual: split by " - " and try each part
  const parts = rawCategory.split(/\s*-\s*/);
  for (const part of parts) {
    const match = CATEGORY_VI_MAP[part.trim().toLowerCase()];
    if (match) return match;
  }
  return "";
}

/** Find the data sheet (has "STT" in A1) — skips lookup / hidden sheets */
function findDataSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    if (!ws["!ref"]) continue;
    const a1 = ws["A1"];
    if (a1 && String(a1.v ?? "").trim().toUpperCase() === "STT") return ws;
  }
  return workbook.Sheets[workbook.SheetNames[0]];
}

// ─── Excel column names (matching the template screenshot) ───
const COL = {
  STT: "STT",
  TEN: "Tên vật phẩm",
  DANHMUC: "Danh mục",
  DOITUONG: "Đối tượng",
  LOAI: "Loại vật phẩm",
  DONVI: "Đơn vị",
  MOTA: "Mô tả vật phẩm",
  SOLUONG: "Số lượng",
  HETHAN: "Ngày hết hạn",
  NHAN: "Ngày nhận",
} as const;

// ─── Row type ───
interface ImportRow {
  id: string;
  row: number;
  itemModelId?: number;
  itemName: string;
  categoryCode: string;
  targetGroups: string[];
  itemType: string;
  unit: string;
  quantity: number;
  expiredDate: string;
  receivedDate: string;
  description: string;
  errors: Record<string, string>;
}

// ─── Steps ───
type Step = "upload" | "review";

// ─── Date helper ───
function parseExcelDate(val: unknown): string {
  if (!val) return "";
  // Excel serial number
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      return `${String(date.y).padStart(4, "0")}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }
  const str = String(val).trim();
  if (!str) return "";
  // yyyy-mm-dd, yyyy/mm/dd, yyyy.mm.dd
  const ymd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  }
  // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, d/m/yyyy (Vietnamese format)
  const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1]);
    const month = parseInt(dmy[2]);
    const year = dmy[3];
    // If month > 12 and day <= 12, it's likely mm/dd/yyyy — swap
    if (month > 12 && day <= 12) {
      return `${year}-${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  // Fallback: ISO strings with time component, etc.
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return str;
}

/** Parse datetime from Excel cell — returns "yyyy-MM-ddTHH:mm" */
function parseExcelDateTime(val: unknown): string {
  if (!val) return "";
  const p2 = (n: number) => String(n).padStart(2, "0");
  // Excel serial number (may include fractional time)
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      return `${String(date.y).padStart(4, "0")}-${p2(date.m)}-${p2(date.d)}T${p2(date.H ?? 0)}:${p2(date.M ?? 0)}`;
    }
  }
  const str = String(val).trim();
  if (!str) return "";
  // dd/mm/yyyy HH:mm or dd/mm/yyyy H:mm (Vietnamese with time)
  const dmyHM = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\s+(\d{1,2}):(\d{2})/);
  if (dmyHM) {
    const [, d, m, y, H, M] = dmyHM;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T${H.padStart(2, "0")}:${M}`;
  }
  // dd/mm/yyyy — date only, default to 00:00
  const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00`;
  }
  // yyyy-mm-ddTHH:mm or yyyy-mm-dd
  const isoLike = str.match(/^(\d{4})[\-](\d{2})[\-](\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (isoLike) {
    const [, y, m, d, H = "00", M = "00"] = isoLike;
    return `${y}-${m}-${d}T${H}:${M}`;
  }
  // Fallback
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    return `${dt.getFullYear()}-${p2(dt.getMonth() + 1)}-${p2(dt.getDate())}T${p2(dt.getHours())}:${p2(dt.getMinutes())}`;
  }
  return "";
}

/** Extract trailing model ID from item name, e.g. "Mì tôm - 1" → { cleanName: "Mì tôm", itemModelId: 1 } */
function parseItemName(raw: string): { cleanName: string; itemModelId?: number } {
  const m = raw.trim().match(/^(.*?)\s*-\s*(\d+)$/);
  if (m) {
    return { cleanName: m[1].trim(), itemModelId: Number(m[2]) };
  }
  return { cleanName: raw.trim() };
}

/**
 * Đọc sheet theo VỊTRI CỘT (không phụ thuộc tên cột / Unicode).
 * Tìm dòng header bằng cách kiểm tra cột 0 = "STT" (ASCII thuần).
 * Sau đó map từng dòng data theo đúng thứ tự cột của colNames.
 */
function getSheetRows(
  sheet: XLSX.WorkSheet,
  colNames: readonly string[],
): Record<string, unknown>[] {
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (rawRows.length === 0) return [];

  // Tìm header: dòng đầu tiên có cột 0 = "STT" (ASCII → không bị ảnh hưởng Unicode)
  const headerRowIndex = rawRows.findIndex(
    (row) => Array.isArray(row) && String(row[0] ?? "").trim().toUpperCase() === "STT",
  );

  // Nếu không tìm thấy STT, giả sử dòng 0 là header
  const dataStart = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;

  return rawRows.slice(dataStart).map((row) => {
    const arr = Array.isArray(row) ? row : [];
    const obj: Record<string, unknown> = {};
    colNames.forEach((name, i) => {
      const raw = arr[i];
      // Các cell formula có thể trả về object {v, f} — lấy .v nếu có
      obj[name] = (raw !== null && raw !== undefined && typeof raw === "object" && "v" in (raw as object))
        ? (raw as { v: unknown }).v ?? ""
        : raw ?? "";
    });
    return obj;
  });
}

// ─── Component ───
export default function ExcelImportFromOrg() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  // Organization: either select from list (→ send id) or type manually (→ send name only)
  const [orgSearchValue, setOrgSearchValue] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgError, setOrgError] = useState("");
  const [isOrgOpen, setIsOrgOpen] = useState(false);
  const [batchNote, setBatchNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const orgInputRef = useRef<HTMLInputElement>(null);

  // Fetch metadata from API
  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: targetGroupsData } = useInventoryTargetGroups();
  const { data: organizationsData } = useInventoryOrganizations();
  const importMutation = useImportInventory();
  const { mutateAsync: downloadTemplate } = useDownloadDonationImportTemplate();

  const itemTypes = useMemo(() => itemTypesData ?? [], [itemTypesData]);
  const targetGroups = useMemo(() => targetGroupsData ?? [], [targetGroupsData]);
  const organizations = useMemo(() => organizationsData ?? [], [organizationsData]);

  const filteredOrgs = useMemo(() => {
    if (!orgSearchValue.trim()) return organizations;
    const q = orgSearchValue.toLowerCase();
    return organizations.filter((o) => o.value.toLowerCase().includes(q));
  }, [organizations, orgSearchValue]);

  // Derived display label for review step
  const orgDisplayLabel = useMemo(() => {
    if (selectedOrgId) {
      return organizations.find((o) => o.key === selectedOrgId)?.value ?? orgSearchValue;
    }
    return orgSearchValue || "Chưa chọn tổ chức";
  }, [selectedOrgId, orgSearchValue, organizations]);

  // ─── Validate a single row ───
  const validateRow = useCallback((row: Omit<ImportRow, "errors">): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!row.itemName) errors.itemName = "Tên vật phẩm không được trống";
    if (!row.categoryCode) errors.categoryCode = "Danh mục không hợp lệ";
    if (!row.quantity || row.quantity <= 0) errors.quantity = "Số lượng phải > 0";
    if (!row.unit) errors.unit = "Đơn vị không được trống";
    if (!row.itemType) errors.itemType = "Loại vật phẩm không được trống";
    if (!row.targetGroups?.length) errors.targetGroups = "Đối tượng không được trống";
    if (row.itemType === "Reusable" && !row.targetGroups?.includes("Rescuer"))
      errors.targetGroups = "Đối với vật phẩm ‘Tái sử dụng’, đối tượng áp dụng là ‘Lực lượng cứu hộ’.";
    if (!row.receivedDate) errors.receivedDate = "Ngày nhận không được trống";
    else if (new Date(row.receivedDate) > new Date()) errors.receivedDate = "Ngày nhận không được là thời điểm trong tương lai";
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
          const sheet = findDataSheet(workbook);
          const jsonData = getSheetRows(sheet, Object.values(COL));
          const dataRows = jsonData.filter((raw) => String(raw[COL.TEN] ?? "").trim() !== "");
          if (dataRows.length === 0) { toast.error("Không tìm thấy dòng nào có dữ liệu"); return; }

          const parsed: ImportRow[] = dataRows.map((raw, idx) => {
            const rawCategory = String(raw[COL.DANHMUC] ?? "").trim();
            const categoryCode = matchCategoryCode(rawCategory);

            const { cleanName: itemName, itemModelId } = parseItemName(String(raw[COL.TEN] ?? ""));

            const rawTargetGroup = String(raw[COL.DOITUONG] ?? "").trim();
            const targetGroupsValue = rawTargetGroup
              .split(/[,;،]/)
              .map((seg) => {
                const seg2 = seg.trim();
                if (!seg2) return null;
                const parts = seg2.split(/\s*-\s*/).map((p) => p.trim().toLowerCase());
                const matched = targetGroups.find((t) =>
                  parts.some((p) => t.value.toLowerCase() === p || t.key.toLowerCase() === p),
                );
                return matched?.key ?? seg2;
              })
              .filter((v): v is string => !!v);

            const rawItemType = String(raw[COL.LOAI] ?? "").trim();
            const itParts = rawItemType.split(/\s*-\s*/).map((p) => p.trim().toLowerCase());
            const matchedItemType = itemTypes.find(
              (t) => itParts.some((p) => t.value.toLowerCase() === p || t.key.toLowerCase() === p),
            );
            const itemType = matchedItemType?.key ?? rawItemType;

            // Auto-set targetGroups to ["Rescuer"] when item is Reusable
            const targetGroupsFinal = itemType === "Reusable" ? ["Rescuer"] : targetGroupsValue;

            const unit = String(raw[COL.DONVI] ?? "").trim();
            const quantity = Number(raw[COL.SOLUONG] ?? 0);
            const expiredDate = parseExcelDate(raw[COL.HETHAN]);
            const description = String(raw[COL.MOTA] ?? "").trim();

            const rowData = {
              id: `row-${idx}-${Date.now()}`,
              row: idx + 1,
              itemModelId,
              itemName,
              categoryCode,
              targetGroups: targetGroupsFinal,
              itemType,
              unit,
              quantity: quantity > 0 ? quantity : 0,
              expiredDate,
              receivedDate: parseExcelDateTime(raw[COL.NHAN]),
              description,
            };

            return { ...rowData, errors: validateRow(rowData) };
          });

          setRows(parsed);
          setFileName(file.name);
          setStep("review");

          const errCount = parsed.filter((r) => Object.keys(r.errors).length > 0).length;
          toast.success(
            errCount > 0
              ? `${parsed.length} dòng đã đọc. ${errCount} dòng có lỗi cần kiểm tra.`
              : `${parsed.length} dòng đã đọc thành công`,
          );
        } catch {
          toast.error("Không thể đọc file Excel. Vui lòng kiểm tra lại file.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [validateRow, itemTypes, targetGroups],
  );
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

  // ─── Add blank row ───
  const addRow = useCallback(() => {
    setRows((prev) => {
      const newRow: ImportRow = {
        id: `row-manual-${Date.now()}-${Math.random()}`,
        row: prev.length + 1,
        itemModelId: undefined,
        itemName: "",
        categoryCode: "",
        targetGroups: [],
        itemType: "",
        unit: "",
        quantity: 0,
        expiredDate: "",
        receivedDate: "",
        description: "",
        errors: {},
      };
      newRow.errors = validateRow(newRow);
      return [...prev, newRow];
    });
  }, [validateRow]);

  // ─── Start manual entry ───
  const handleManualEntry = useCallback(() => {
    setRows([]);
    setFileName("");
    setStep("review");
  }, []);

  // ─── Append rows from a new Excel file (in review step) ───
  const excelReviewInputRef = useRef<HTMLInputElement>(null);
  const handleAppendExcel = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Chỉ chấp nhận file .xlsx");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = findDataSheet(workbook);
          const jsonData = getSheetRows(sheet, Object.values(COL));
          if (jsonData.length === 0) { toast.error("File Excel không có dữ liệu"); return; }
          setRows((prev) => {
            const offset = prev.length;
            const dataRows = jsonData.filter((raw) => String(raw[COL.TEN] ?? "").trim() !== "");
            if (dataRows.length === 0) { toast.error("Không tìm thấy dòng nào có dữ liệu"); return prev; }
            const parsed: ImportRow[] = dataRows.map((raw, idx) => {
              const rawCategory = String(raw[COL.DANHMUC] ?? "").trim();
              const categoryCode = matchCategoryCode(rawCategory);

              const rawTargetGroup = String(raw[COL.DOITUONG] ?? "").trim();
              const targetGroupsValue = rawTargetGroup
                .split(/[,;،]/)
                .map((seg) => {
                  const seg2 = seg.trim();
                  if (!seg2) return null;
                  const parts = seg2.split(/\s*-\s*/).map((p) => p.trim().toLowerCase());
                  const matched = targetGroups.find((t) =>
                    parts.some((p) => t.value.toLowerCase() === p || t.key.toLowerCase() === p),
                  );
                  return matched?.key ?? seg2;
                })
                .filter((v): v is string => !!v);

              const rawItemType = String(raw[COL.LOAI] ?? "").trim();
              const itParts = rawItemType.split(/\s*-\s*/).map((p) => p.trim().toLowerCase());
              const matchedItemType = itemTypes.find(
                (t) => itParts.some((p) => t.value.toLowerCase() === p || t.key.toLowerCase() === p),
              );
              const itemType = matchedItemType?.key ?? rawItemType;

              // Auto-set targetGroups to ["Rescuer"] when item is Reusable
              const targetGroupsFinal = itemType === "Reusable" ? ["Rescuer"] : targetGroupsValue;

              const { cleanName: itemName, itemModelId } = parseItemName(String(raw[COL.TEN] ?? ""));
              const rowData = {
                id: `row-${offset + idx}-${Date.now()}`,
                row: offset + idx + 1,
                itemModelId,
                itemName,
                categoryCode,
                targetGroups: targetGroupsFinal,
                itemType,
                unit: String(raw[COL.DONVI] ?? "").trim(),
                quantity: Number(raw[COL.SOLUONG] ?? 0) > 0 ? Number(raw[COL.SOLUONG]) : 0,
                expiredDate: parseExcelDate(raw[COL.HETHAN]),
                receivedDate: parseExcelDateTime(raw[COL.NHAN]),
                description: String(raw[COL.MOTA] ?? "").trim(),
              };
              return { ...rowData, errors: validateRow(rowData) };
            });
            const merged = [...prev, ...parsed];
            return merged.map((r, i) => ({ ...r, row: i + 1 }));
          });
          setFileName(file.name);
          toast.success(`Đã thêm ${jsonData.length} dòng từ file Excel`);
        } catch {
          toast.error("Không thể đọc file Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [validateRow, itemTypes, targetGroups],
  );

  // ─── Row editing ───
  const updateRow = useCallback(
    (id: string, field: keyof ImportRow, value: string | number | string[] | undefined) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;
          const updated = { ...row, [field]: value } as ImportRow;
          // Auto-set targetGroups when itemType changes to Reusable
          if (field === "itemType" && value === "Reusable") {
            updated.targetGroups = ["Rescuer"];
          }
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
    if (!orgSearchValue.trim()) {
      setOrgError("Vui lòng chọn hoặc nhập tên tổ chức viện trợ");
      return;
    }

    const items: ImportInventoryItem[] = rows.map((r) => ({
      row: r.row,
      ...(r.itemModelId ? { itemModelId: r.itemModelId } : {}),
      itemName: r.itemName,
      categoryCode: r.categoryCode,
      quantity: r.quantity,
      unit: r.unit,
      itemType: r.itemType,
      targetGroups: r.targetGroups,
      receivedDate: r.receivedDate ? new Date(r.receivedDate).toISOString() : r.receivedDate,
      expiredDate: r.expiredDate || null,
      description: r.description || null,
    }));

    const payload: ImportInventoryRequest = { items };
    if (selectedOrgId) {
      payload.organizationId = Number(selectedOrgId);
    }
    if (orgSearchValue.trim()) {
      payload.organizationName = orgSearchValue.trim();
    }
    if (batchNote.trim()) {
      payload.batchNote = batchNote.trim();
    }

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
  }, [rows, errorCount, selectedOrgId, orgSearchValue, batchNote, importMutation, router]);

  // ─── Reset ───
  const handleReset = useCallback(() => {
    setStep("upload");
    setRows([]);
    setFileName("");
    setBatchNote("");
  }, []);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const { blob, filename } = await downloadTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Đã tải file mẫu");
    } catch {
      toast.error("Không thể tải file mẫu");
    }
  }, [downloadTemplate]);

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
              "text-sm",
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

  const renderMultiSelectCell = (
    row: ImportRow,
    options: { label: string; value: string }[],
    placeholder: string,
  ) => {
    const error = row.errors.targetGroups;
    const selected = row.targetGroups ?? [];
    const labelText =
      selected.length === 0
        ? placeholder
        : selected.map((v) => options.find((o) => o.value === v)?.label ?? v).join(", ");
    return (
      <div className="space-y-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 w-full justify-between text-sm font-normal px-3",
                error && "border-red-500 focus-visible:ring-red-500",
                selected.length === 0 && "text-muted-foreground",
              )}
            >
              <span className="truncate text-left">{labelText}</span>
              <CaretDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-1 w-48" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            {options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const next = checked
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value];
                    updateRow(row.id, "targetGroups", next);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md w-full hover:bg-muted text-sm cursor-pointer"
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 text-[10px] font-bold",
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {checked && "✓"}
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
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
                <h1 className="text-xl font-semibold tracking-tighter">
                  Nhập kho từ thiện
                </h1>
                <p className="text-sm tracking-tighter text-muted-foreground">
                  Nhập thủ công hoặc tải file Excel từ tổ chức viện trợ
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
                {/* Organization Combobox */}
                <div className="rounded-xl border bg-card p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[16px] tracking-tighter font-medium">Tổ chức viện trợ</label>
                  </div>
                  <Popover open={isOrgOpen} onOpenChange={setIsOrgOpen}>
                    <PopoverTrigger asChild>
                      <div className="relative cursor-text">
                        <Input
                          ref={orgInputRef}
                          value={orgSearchValue}
                          onChange={(e) => {
                            setOrgSearchValue(e.target.value);
                            setSelectedOrgId(null);
                            setOrgError("");
                            setIsOrgOpen(true);
                          }}
                          onFocus={() => setIsOrgOpen(true)}
                          placeholder="Tìm hoặc nhập tên tổ chức..."
                          className={cn("pl-9 pr-9 tracking-tighter", orgError && "border-red-400 focus-visible:ring-red-400")}
                        />
                        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                        {orgSearchValue && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrgSearchValue("");
                              setSelectedOrgId(null);
                              setOrgError("");
                              orgInputRef.current?.focus();
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground tracking-tighter hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-1 w-(--radix-popover-trigger-width)"
                      align="start"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      {filteredOrgs.length > 0 && (
                        <ul className="max-h-52 overflow-auto">
                          {filteredOrgs.map((org) => (
                            <li
                              key={org.key}
                              onClick={() => {
                                setOrgSearchValue(org.value);
                                setSelectedOrgId(org.key);
                                setIsOrgOpen(false);
                              }}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-muted transition-colors",
                                selectedOrgId === org.key && "bg-muted font-medium",
                              )}
                            >
                              <Buildings className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{org.value}</span>
                              {selectedOrgId === org.key && (
                                <CheckCircle className="ml-auto h-4 w-4 text-green-600 shrink-0" weight="fill" />
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </PopoverContent>
                  </Popover>
                  {orgError && (
                    <p className="text-[11px] text-red-500">{orgError}</p>
                  )}
                  <p className="text-sm tracking-tighter text-muted-foreground">
                    Chọn từ danh sách hoặc nhập tên tổ chức từ thiện bất kỳ
                  </p>
                </div>

                {/* Column Preview */}
                <div className="rounded-xl border bg-card p-6">
                  <p className="text-[16px] tracking-tighter font-medium mb-3">Các cột trong file Excel:</p>
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

              {/* Right Column - Two options */}
              <div className="flex flex-col gap-4">
                {/* Option 1: Excel upload */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex-1 border-2 border-dashed rounded-xl p-10 flex items-center justify-center cursor-pointer transition-all duration-200",
                    isDragging
                      ? "border-[#FF5722] bg-orange-50 dark:bg-orange-950/20"
                      : "border-muted-foreground/25 hover:border-[#FF5722]/50 hover:bg-muted/50",
                  )}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div
                      className={cn(
                        "h-20 w-20 rounded-2xl flex items-center justify-center transition-colors",
                        isDragging
                          ? "bg-[#FF5722]/15 text-[#FF5722]"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <UploadSimple className="h-10 w-10" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-semibold tracking-tighter text-base mb-1">Kéo thả file Excel vào đây</p>
                      <p className="text-sm tracking-tighter text-muted-foreground">
                        hoặc{" "}
                        <span className="text-[#FF5722] tracking-tighter font-medium underline underline-offset-2">
                          nhấp để chọn file
                        </span>
                      </p>
                    </div>
                    <p className="text-xs tracking-tighter text-muted-foreground">
                      Chấp nhận{" "}
                      <code className="px-1.5 py-0.5 rounded bg-muted">.xlsx</code>{" "}
                      — tối đa 500 dòng
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">hoặc</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Option 2: Manual entry */}
                <button
                  type="button"
                  onClick={handleManualEntry}
                  className="rounded-xl border-2 border-dashed border-muted-foreground/25 py-8 flex flex-col items-center gap-3 text-muted-foreground hover:border-[#FF5722]/50 hover:text-[#FF5722] hover:bg-orange-50/50 dark:hover:bg-orange-950/10 transition-all"
                >
                  <div className="h-14 w-14 rounded-2xl tracking-tighter bg-muted flex items-center justify-center">
                    <PencilSimple className="h-7 w-7" weight="duotone" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold tracking-tighter text-base">Nhập thủ công</p>
                    <p className="text-sm tracking-tighter mt-0.5">Thêm từng dòng vật phẩm bằng tay</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4 flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 tracking-tighter rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  {fileName
                    ? <FileXls className="h-5 w-5 text-green-600" weight="duotone" />
                    : <PencilSimple className="h-5 w-5 text-[#FF5722]" weight="duotone" />}
                </div>
                <div>
                  <p className="font-medium tracking-tighter text-sm">{fileName || "Nhập thủ công"}</p>
                  <p className="text-xs tracking-tighter text-muted-foreground">
                    {rows.length} dòng • {orgDisplayLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium tracking-tighter">
                  <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                  {validCount} hợp lệ
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium tracking-tighter">
                    <WarningCircle className="h-3.5 w-3.5" weight="fill" />
                    {errorCount} lỗi
                  </div>
                )}
                {/* Append Excel */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 ml-2"
                  onClick={() => excelReviewInputRef.current?.click()}
                >
                  <FileXls className="h-4 w-4" />
                  Nhập từ Excel
                </Button>
                <input
                  ref={excelReviewInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAppendExcel(f); e.target.value = ""; }}
                  className="hidden"
                />
                {/* Add blank row */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={addRow}
                >
                  <Plus className="h-4 w-4" />
                  Thêm dòng
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                  onClick={handleReset}
                >
                  <ArrowCounterClockwise className="h-4 w-4" />
                  Nhập lại
                </Button>
              </div>
            </div>

            {/* Organization picker (compact, always visible in review) */}
            <div className="shrink-0 rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
              <Buildings className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm tracking-tighter font-medium shrink-0">Tổ chức viện trợ</span>
              {!orgSearchValue.trim() && (
                <span className="text-xs tracking-tighter text-red-500 shrink-0">(bắt buộc)</span>
              )}
              <div className="flex-1 relative">
                <Popover open={isOrgOpen} onOpenChange={setIsOrgOpen}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input
                        ref={orgInputRef}
                        value={orgSearchValue}
                        onChange={(e) => {
                          setOrgSearchValue(e.target.value);
                          setSelectedOrgId(null);
                          setIsOrgOpen(true);
                        }}
                        onFocus={() => setIsOrgOpen(true)}
                        placeholder="Tìm hoặc nhập tên tổ chức..."
                        className={cn(
                          "h-8 text-sm pl-3 pr-8 tracking-tighter",
                          !orgSearchValue.trim() && "border-red-400 focus-visible:ring-red-400",
                        )}
                      />
                      {orgSearchValue ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrgSearchValue("");
                            setSelectedOrgId(null);
                            orgInputRef.current?.focus();
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 tracking-tighter text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <MagnifyingGlass className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      )}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-1 w-(--radix-popover-trigger-width)"
                    align="start"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    {filteredOrgs.length > 0 && (
                      <ul className="max-h-48 overflow-auto">
                        {filteredOrgs.map((org) => (
                          <li
                            key={org.key}
                            onClick={() => {
                              setOrgSearchValue(org.value);
                              setSelectedOrgId(org.key);
                              setIsOrgOpen(false);
                            }}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-muted transition-colors",
                              selectedOrgId === org.key && "bg-muted font-medium",
                            )}
                          >
                            <Buildings className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{org.value}</span>
                            {selectedOrgId === org.key && (
                              <CheckCircle className="ml-auto h-4 w-4 text-green-600 shrink-0" weight="fill" />
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              {selectedOrgId && (
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" weight="fill" />
              )}
            </div>

            {/* Batch Note */}
            <div className="shrink-0 rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
              <PencilSimple className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm tracking-tighter font-medium shrink-0">Ghi chú lần nhập</span>
              <Input
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                placeholder="Ghi chú cho lần nhập kho này..."
                className="h-8 text-sm flex-1"
              />
            </div>

            {/* Editable Table */}
            <div className="border rounded-xl bg-card overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">STT</TableHead>
                    <TableHead className="min-w-48">Tên vật phẩm</TableHead>
                    <TableHead className="min-w-24 text-center">ID Vật phẩm</TableHead>
                    <TableHead className="min-w-40">Danh mục</TableHead>
                    <TableHead className="min-w-36">Đối tượng</TableHead>
                    <TableHead className="min-w-36">Loại vật phẩm</TableHead>
                    <TableHead className="min-w-24">Đơn vị</TableHead>
                    <TableHead className="min-w-48">Mô tả vật phẩm</TableHead>
                    <TableHead className="min-w-24">Số lượng</TableHead>
                    <TableHead className="min-w-36">Ngày hết hạn</TableHead>
                    <TableHead className="min-w-36">Ngày nhận</TableHead>
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

                        {/* ID Model */}
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={row.itemModelId ?? ""}
                            onChange={(e) => updateRow(row.id, "itemModelId", e.target.value ? Number(e.target.value) : undefined)}
                            placeholder="Mới"
                            className="h-8 text-sm w-20"
                          />
                        </TableCell>

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
                          {renderMultiSelectCell(row, targetGroupOptions, "Chọn đối tượng")}
                          {row.itemType === "Reusable" && row.targetGroups?.includes("Rescuer") && !row.errors.targetGroups && (
                            <p className="text-[11px] text-blue-500 mt-0.5">Mặc định chọn với loại Tái sử dụng</p>
                          )}
                        </TableCell>

                        {/* Loại vật phẩm */}
                        <TableCell>
                          {itemTypeOptions.length > 0
                            ? renderSelectCell(row, "itemType", itemTypeOptions, "Chọn loại")
                            : renderInputCell(row, "itemType", "Loại vật phẩm")}
                        </TableCell>

                        {/* Đơn vị */}
                        <TableCell>{renderInputCell(row, "unit", "Đơn vị")}</TableCell>

                        {/* Mô tả vật phẩm */}
                        <TableCell>
                          <Input
                            value={row.description}
                            onChange={(e) => updateRow(row.id, "description", e.target.value)}
                            placeholder="Mô tả vật phẩm..."
                            className="h-8 text-sm"
                          />
                        </TableCell>

                        {/* Số lượng */}
                        <TableCell>{renderInputCell(row, "quantity", "0", "number")}</TableCell>

                        {/* Ngày hết hạn */}
                        <TableCell>
                          <DatePickerInput
                            value={row.expiredDate}
                            onChange={(v) => updateRow(row.id, "expiredDate", v)}
                            placeholder="Chọn ngày..."
                          />
                        </TableCell>

                        {/* Ngày nhận */}
                        <TableCell>
                          <div className="space-y-1">
                            <DateTimePickerInput
                              value={row.receivedDate}
                              onChange={(v) => updateRow(row.id, "receivedDate", v)}
                              placeholder="Chọn ngày giờ..."
                              hasError={!!row.errors.receivedDate}
                            />
                            {row.errors.receivedDate && (
                              <p className="text-[11px] text-red-500">{row.errors.receivedDate}</p>
                            )}
                          </div>
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
                      <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <Trash className="h-8 w-8" weight="duotone" />
                          <p className="text-sm">Chưa có dữ liệu</p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
                              <Plus className="h-3.5 w-3.5" /> Thêm dòng
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => excelReviewInputRef.current?.click()}>
                              <FileXls className="h-3.5 w-3.5" /> Nhập từ Excel
                            </Button>
                          </div>
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
