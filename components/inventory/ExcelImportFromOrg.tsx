"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
  Eye,
} from "@phosphor-icons/react";
import {
  useInventoryItemTypes,
  useInventoryTargetGroups,
  useInventoryOrganizations,
  useImportInventory,
  useDownloadDonationImportTemplate,
} from "@/services/inventory/hooks";
import type {
  ImportInventoryItem,
  ImportInventoryRequest,
} from "@/services/inventory/type";
import type { InventoryItemEntity } from "@/services/inventory/type";
import { updateItemModel } from "@/services/inventory/api";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { DateTimePickerInput } from "@/components/ui/date-time-picker-input";
import { uploadImageToCloudinary } from "@/utils/uploadFile";
import {
  extractImageUrlFromCell,
  getSheetRowsWithOptionalImageColumn,
  revokeBlobUrl,
} from "@/components/inventory/import-image-helpers";
import {
  assignCreatedInventoryItemsToRows,
  fetchInventorySnapshotByCategoryCodes,
} from "@/components/inventory/import-post-submit-image-helpers";
import { useManagerDepot } from "@/hooks/use-manager-depot";

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

const CATEGORY_NAME_BY_CODE = Object.fromEntries(
  SYSTEM_CATEGORIES.map((category) => [category.value, category.label]),
) as Record<string, string>;

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
    if (
      a1 &&
      String(a1.v ?? "")
        .trim()
        .toUpperCase() === "STT"
    )
      return ws;
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
  ANH: "Ảnh",
  SOLUONG: "Số lượng",
  THETICH: "Thể tích (dm3)",
  CANNANG: "Cân nặng (kg)",
  HETHAN: "Ngày hết hạn",
  NHAN: "Ngày nhận",
} as const;

const LEGACY_COLS = [
  COL.STT,
  COL.TEN,
  COL.DANHMUC,
  COL.DOITUONG,
  COL.LOAI,
  COL.DONVI,
  COL.MOTA,
  COL.SOLUONG,
  COL.THETICH,
  COL.CANNANG,
  COL.HETHAN,
  COL.NHAN,
] as const;

const SHEET_COLS = [
  COL.STT,
  COL.TEN,
  COL.DANHMUC,
  COL.DOITUONG,
  COL.LOAI,
  COL.DONVI,
  COL.MOTA,
  COL.ANH,
  COL.SOLUONG,
  COL.THETICH,
  COL.CANNANG,
  COL.HETHAN,
  COL.NHAN,
] as const;

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
  volumePerUnit?: number;
  weightPerUnit?: number;
  expiredDate: string;
  receivedDate: string;
  description: string;
  imageUrl: string;
  imagePreviewUrl: string;
  imageFile: File | null;
  showErrors: boolean;
  errors: Record<string, string>;
}

type EditableField =
  | "itemModelId"
  | "itemName"
  | "categoryCode"
  | "targetGroups"
  | "itemType"
  | "unit"
  | "quantity"
  | "volumePerUnit"
  | "weightPerUnit"
  | "expiredDate"
  | "receivedDate"
  | "description";

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

function parseOptionalExcelNumber(val: unknown): number | undefined {
  if (val === null || val === undefined || String(val).trim() === "")
    return undefined;
  const parsed = Number(String(val).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
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
  const dmyHM = str.match(
    /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\s+(\d{1,2}):(\d{2})/,
  );
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
  const isoLike = str.match(
    /^(\d{4})[\-](\d{2})[\-](\d{2})(?:T(\d{2}):(\d{2}))?/,
  );
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
function parseItemName(raw: string): {
  cleanName: string;
  itemModelId?: number;
} {
  const m = raw.trim().match(/^(.*?)\s*-\s*(\d+)$/);
  if (m) {
    return { cleanName: m[1].trim(), itemModelId: Number(m[2]) };
  }
  return { cleanName: raw.trim() };
}

// ─── Component ───
export default function ExcelImportFromOrg() {
  const router = useRouter();
  const { selectedDepotId } = useManagerDepot();
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
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const orgInputRef = useRef<HTMLInputElement>(null);
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const previousPreviewUrlsRef = useRef<Record<string, string>>({});

  // Fetch metadata from API
  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: targetGroupsData } = useInventoryTargetGroups();
  const { data: organizationsData } = useInventoryOrganizations();
  const importMutation = useImportInventory();
  const { mutateAsync: downloadTemplate } = useDownloadDonationImportTemplate();

  const itemTypes = useMemo(() => itemTypesData ?? [], [itemTypesData]);
  const targetGroups = useMemo(
    () => targetGroupsData ?? [],
    [targetGroupsData],
  );
  const organizations = useMemo(
    () => organizationsData ?? [],
    [organizationsData],
  );

  const filteredOrgs = useMemo(() => {
    if (!orgSearchValue.trim()) return organizations;
    const q = orgSearchValue.toLowerCase();
    return organizations.filter((o) => o.value.toLowerCase().includes(q));
  }, [organizations, orgSearchValue]);

  // Derived display label for review step
  const orgDisplayLabel = useMemo(() => {
    if (selectedOrgId) {
      return (
        organizations.find((o) => o.key === selectedOrgId)?.value ??
        orgSearchValue
      );
    }
    return orgSearchValue || "Chưa chọn tổ chức";
  }, [selectedOrgId, orgSearchValue, organizations]);

  useEffect(() => {
    const nextPreviewUrls: Record<string, string> = {};
    rows.forEach((row) => {
      if (row.imagePreviewUrl) {
        nextPreviewUrls[row.id] = row.imagePreviewUrl;
      }
    });

    Object.entries(previousPreviewUrlsRef.current).forEach(
      ([rowId, previewUrl]) => {
        if (previewUrl !== nextPreviewUrls[rowId]) {
          revokeBlobUrl(previewUrl);
        }
      },
    );

    previousPreviewUrlsRef.current = nextPreviewUrls;
  }, [rows]);

  useEffect(
    () => () => {
      Object.values(previousPreviewUrlsRef.current).forEach((previewUrl) => {
        revokeBlobUrl(previewUrl);
      });
    },
    [],
  );

  // ─── Validate a single row ───
  const validateRow = useCallback(
    (row: Omit<ImportRow, "errors">): Record<string, string> => {
      const errors: Record<string, string> = {};
      if (!row.itemName) errors.itemName = "Tên vật phẩm không được trống";
      if (!row.categoryCode) errors.categoryCode = "Danh mục không hợp lệ";
      if (!row.quantity || row.quantity <= 0)
        errors.quantity = "Số lượng phải > 0";
      if (!row.unit) errors.unit = "Đơn vị không được trống";
      if (!row.itemType) errors.itemType = "Loại vật phẩm không được trống";
      if (!row.targetGroups?.length)
        errors.targetGroups = "Đối tượng không được trống";
      if (row.itemType === "Reusable" && !row.targetGroups?.includes("Rescuer"))
        errors.targetGroups =
          "Đối với vật phẩm ‘Tái sử dụng’, đối tượng áp dụng là ‘Lực lượng cứu hộ’.";
      if (!row.itemModelId && !row.imageFile && !row.imageUrl)
        errors.imageUrl = "Vui lòng tải ảnh cho vật phẩm mới";
      if (row.volumePerUnit === undefined)
        errors.volumePerUnit = "Thể tích không được trống";
      else if (row.volumePerUnit < 0)
        errors.volumePerUnit = "Thể tích không được âm";

      if (row.weightPerUnit === undefined)
        errors.weightPerUnit = "Cân nặng không được trống";
      else if (row.weightPerUnit < 0)
        errors.weightPerUnit = "Cân nặng không được âm";
      if (!row.receivedDate) errors.receivedDate = "Ngày nhận không được trống";
      else if (new Date(row.receivedDate) > new Date())
        errors.receivedDate =
          "Ngày nhận không được là thời điểm trong tương lai";
      return errors;
    },
    [],
  );

  const applyRowValidation = useCallback(
    (row: Omit<ImportRow, "errors">): ImportRow => ({
      ...row,
      errors: row.showErrors ? validateRow(row) : {},
    }),
    [validateRow],
  );

  // ─── Parse Excel ───
  const parseExcel = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = findDataSheet(workbook);
          const jsonData = getSheetRowsWithOptionalImageColumn(
            sheet,
            LEGACY_COLS,
            SHEET_COLS,
          );
          const dataRows = jsonData.filter(
            (raw) => String(raw[COL.TEN] ?? "").trim() !== "",
          );
          if (dataRows.length === 0) {
            toast.error("Không tìm thấy dòng nào có dữ liệu");
            return;
          }

          const parsed: ImportRow[] = dataRows.map((raw, idx) => {
            const rawCategory = String(raw[COL.DANHMUC] ?? "").trim();
            const categoryCode = matchCategoryCode(rawCategory);

            const { cleanName: itemName, itemModelId } = parseItemName(
              String(raw[COL.TEN] ?? ""),
            );

            const rawTargetGroup = String(raw[COL.DOITUONG] ?? "").trim();
            const targetGroupsValue = rawTargetGroup
              .split(/[,;،]/)
              .map((seg) => {
                const seg2 = seg.trim();
                if (!seg2) return null;
                const parts = seg2
                  .split(/\s*-\s*/)
                  .map((p) => p.trim().toLowerCase());
                const matched = targetGroups.find((t) =>
                  parts.some(
                    (p) =>
                      t.value.toLowerCase() === p || t.key.toLowerCase() === p,
                  ),
                );
                return matched?.key ?? seg2;
              })
              .filter((v): v is string => !!v);

            const rawItemType = String(raw[COL.LOAI] ?? "").trim();
            const itParts = rawItemType
              .split(/\s*-\s*/)
              .map((p) => p.trim().toLowerCase());
            const matchedItemType = itemTypes.find((t) =>
              itParts.some(
                (p) => t.value.toLowerCase() === p || t.key.toLowerCase() === p,
              ),
            );
            const itemType = matchedItemType?.key ?? rawItemType;

            // Auto-set targetGroups to ["Rescuer"] when item is Reusable
            const targetGroupsFinal =
              itemType === "Reusable" ? ["Rescuer"] : targetGroupsValue;

            const unit = String(raw[COL.DONVI] ?? "").trim();
            const quantity = Number(raw[COL.SOLUONG] ?? 0);
            const expiredDate = parseExcelDate(raw[COL.HETHAN]);
            const description = String(raw[COL.MOTA] ?? "").trim();
            const imageUrl = itemModelId
              ? ""
              : extractImageUrlFromCell(raw[COL.ANH]);

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
              volumePerUnit: parseOptionalExcelNumber(raw[COL.THETICH]),
              weightPerUnit: parseOptionalExcelNumber(raw[COL.CANNANG]),
              expiredDate,
              receivedDate: parseExcelDateTime(raw[COL.NHAN]),
              description,
              imageUrl,
              imagePreviewUrl: imageUrl,
              imageFile: null,
              showErrors: true,
            };

            return applyRowValidation(rowData);
          });

          setRows(parsed);
          setFileName(file.name);
          setStep("review");

          const errCount = parsed.filter(
            (r) => Object.keys(r.errors).length > 0,
          ).length;
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
    [applyRowValidation, itemTypes, targetGroups],
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
        volumePerUnit: undefined,
        weightPerUnit: undefined,
        expiredDate: "",
        receivedDate: "",
        description: "",
        imageUrl: "",
        imagePreviewUrl: "",
        imageFile: null,
        showErrors: false,
        errors: {},
      };
      return [...prev, applyRowValidation(newRow)];
    });
  }, [applyRowValidation]);

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
          const jsonData = getSheetRowsWithOptionalImageColumn(
            sheet,
            LEGACY_COLS,
            SHEET_COLS,
          );
          if (jsonData.length === 0) {
            toast.error("File Excel không có dữ liệu");
            return;
          }
          setRows((prev) => {
            const offset = prev.length;
            const dataRows = jsonData.filter(
              (raw) => String(raw[COL.TEN] ?? "").trim() !== "",
            );
            if (dataRows.length === 0) {
              toast.error("Không tìm thấy dòng nào có dữ liệu");
              return prev;
            }
            const parsed: ImportRow[] = dataRows.map((raw, idx) => {
              const rawCategory = String(raw[COL.DANHMUC] ?? "").trim();
              const categoryCode = matchCategoryCode(rawCategory);

              const rawTargetGroup = String(raw[COL.DOITUONG] ?? "").trim();
              const targetGroupsValue = rawTargetGroup
                .split(/[,;،]/)
                .map((seg) => {
                  const seg2 = seg.trim();
                  if (!seg2) return null;
                  const parts = seg2
                    .split(/\s*-\s*/)
                    .map((p) => p.trim().toLowerCase());
                  const matched = targetGroups.find((t) =>
                    parts.some(
                      (p) =>
                        t.value.toLowerCase() === p ||
                        t.key.toLowerCase() === p,
                    ),
                  );
                  return matched?.key ?? seg2;
                })
                .filter((v): v is string => !!v);

              const rawItemType = String(raw[COL.LOAI] ?? "").trim();
              const itParts = rawItemType
                .split(/\s*-\s*/)
                .map((p) => p.trim().toLowerCase());
              const matchedItemType = itemTypes.find((t) =>
                itParts.some(
                  (p) =>
                    t.value.toLowerCase() === p || t.key.toLowerCase() === p,
                ),
              );
              const itemType = matchedItemType?.key ?? rawItemType;

              // Auto-set targetGroups to ["Rescuer"] when item is Reusable
              const targetGroupsFinal =
                itemType === "Reusable" ? ["Rescuer"] : targetGroupsValue;

              const { cleanName: itemName, itemModelId } = parseItemName(
                String(raw[COL.TEN] ?? ""),
              );
              const imageUrl = itemModelId
                ? ""
                : extractImageUrlFromCell(raw[COL.ANH]);
              const rowData = {
                id: `row-${offset + idx}-${Date.now()}`,
                row: offset + idx + 1,
                itemModelId,
                itemName,
                categoryCode,
                targetGroups: targetGroupsFinal,
                itemType,
                unit: String(raw[COL.DONVI] ?? "").trim(),
                quantity:
                  Number(raw[COL.SOLUONG] ?? 0) > 0
                    ? Number(raw[COL.SOLUONG])
                    : 0,
                volumePerUnit: parseOptionalExcelNumber(raw[COL.THETICH]),
                weightPerUnit: parseOptionalExcelNumber(raw[COL.CANNANG]),
                expiredDate: parseExcelDate(raw[COL.HETHAN]),
                receivedDate: parseExcelDateTime(raw[COL.NHAN]),
                description: String(raw[COL.MOTA] ?? "").trim(),
                imageUrl,
                imagePreviewUrl: imageUrl,
                imageFile: null,
                showErrors: true,
              };
              return applyRowValidation(rowData);
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
    [applyRowValidation, itemTypes, targetGroups],
  );

  // ─── Row editing ───
  const updateRow = useCallback(
    (
      id: string,
      field: EditableField,
      value: string | number | string[] | undefined,
    ) => {
      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;
          const updated = { ...row, [field]: value } as ImportRow;
          // Auto-set targetGroups when itemType changes to Reusable
          if (field === "itemType" && value === "Reusable") {
            updated.targetGroups = ["Rescuer"];
          }
          return applyRowValidation(updated);
        }),
      );
    },
    [applyRowValidation],
  );

  const handleRowImageChange = useCallback(
    (id: string, file?: File | null) => {
      if (file && !file.type.startsWith("image/")) {
        toast.error("Chỉ chấp nhận file ảnh");
        return;
      }

      setRows((prev) =>
        prev.map((row) => {
          if (row.id !== id) return row;

          const previewUrl = file ? URL.createObjectURL(file) : "";
          const updated: ImportRow = {
            ...row,
            imageFile: file ?? null,
            imageUrl: file ? "" : "",
            imagePreviewUrl: previewUrl,
            errors: row.errors,
          };

          return applyRowValidation(updated);
        }),
      );
    },
    [applyRowValidation],
  );

  const clearRowImage = useCallback(
    (id: string) => {
      handleRowImageChange(id, null);
      if (imageInputRefs.current[id]) {
        imageInputRefs.current[id]!.value = "";
      }
    },
    [handleRowImageChange],
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
  const handleSubmit = useCallback(async () => {
    if (rows.length === 0) {
      toast.error("Không có dữ liệu để nhập kho");
      return;
    }

    const validatedRows = rows.map((row) =>
      applyRowValidation({ ...row, showErrors: true }),
    );
    const nextErrorCount = validatedRows.filter(
      (row) => Object.keys(row.errors).length > 0,
    ).length;

    if (nextErrorCount > 0) {
      setRows(validatedRows);
      toast.error(
        `Còn ${nextErrorCount} dòng lỗi. Vui lòng sửa trước khi nhập.`,
      );
      return;
    }
    if (!orgSearchValue.trim()) {
      setOrgError("Vui lòng chọn hoặc nhập tên tổ chức viện trợ");
      toast.error(
        "Vui lòng chọn hoặc nhập tên tổ chức viện trợ trước khi xác nhận nhập kho.",
      );
      return;
    }

    const rowsNeedingImageUpload = rows.filter(
      (row) => !row.itemModelId && row.imageFile,
    );
    const deferredImageCategoryCodes = Array.from(
      new Set(rowsNeedingImageUpload.map((row) => row.categoryCode)),
    );

    let beforeImportItems: InventoryItemEntity[] = [];
    if (deferredImageCategoryCodes.length > 0) {
      try {
        beforeImportItems = await fetchInventorySnapshotByCategoryCodes(
          deferredImageCategoryCodes,
          selectedDepotId ?? 0,
        );
      } catch {
        toast.error(
          "Không thể lấy dữ liệu kho trước khi nhập để đối chiếu ảnh.",
        );
        return;
      }
    }

    const imageUrlByRowId = new Map(
      rows.map((row) => [row.id, row.imageUrl.trim() || ""]),
    );

    const items: ImportInventoryItem[] = rows.map((r) => ({
      row: r.row,
      ...(r.itemModelId ? { itemModelId: r.itemModelId } : {}),
      itemName: r.itemName,
      categoryCode: r.categoryCode,
      imageUrl:
        r.itemModelId || r.imageFile ? null : imageUrlByRowId.get(r.id) || null,
      quantity: r.quantity,
      unit: r.unit,
      itemType: r.itemType,
      targetGroups: r.targetGroups,
      volumePerUnit: r.volumePerUnit ?? null,
      weightPerUnit: r.weightPerUnit ?? null,
      receivedDate: r.receivedDate
        ? new Date(r.receivedDate).toISOString()
        : r.receivedDate,
      expiredDate: r.expiredDate || null,
      description: r.description || null,
    }));

    const payload: ImportInventoryRequest = {
      depotId: selectedDepotId ?? 0,
      items,
    };
    if (selectedOrgId) {
      payload.organizationId = Number(selectedOrgId);
    }
    if (orgSearchValue.trim()) {
      payload.organizationName = orgSearchValue.trim();
    }
    if (batchNote.trim()) {
      payload.batchNote = batchNote.trim();
    }

    try {
      await importMutation.mutateAsync(payload);
      let uploadedImageCount = 0;
      let deferredImageFailures = 0;

      if (rowsNeedingImageUpload.length > 0) {
        setIsUploadingImages(true);
        const uploadToastId = toast.loading(
          `Nhập kho thành công. Đang tải ${rowsNeedingImageUpload.length} ảnh vật phẩm...`,
        );

        try {
          const afterImportItems = await fetchInventorySnapshotByCategoryCodes(
            deferredImageCategoryCodes,
            selectedDepotId ?? 0,
          );
          const assignments = assignCreatedInventoryItemsToRows(
            rowsNeedingImageUpload.map((row) => ({
              key: row.id,
              itemName: row.itemName,
              categoryCode: row.categoryCode,
              itemType: row.itemType,
              targetGroups: row.targetGroups,
            })),
            beforeImportItems,
            afterImportItems,
            (categoryCode) =>
              CATEGORY_NAME_BY_CODE[categoryCode] ?? categoryCode,
          );

          const uploadedImages = await Promise.all(
            rowsNeedingImageUpload.map(async (row) => {
              const matchedItem = assignments.get(row.id);
              if (!matchedItem || !row.imageFile) {
                deferredImageFailures += 1;
                return null;
              }

              const imageUrl = await uploadImageToCloudinary(
                row.imageFile,
                "item_model_img",
              );

              await updateItemModel(matchedItem.itemModelId, {
                categoryId: matchedItem.categoryId,
                name: row.itemName,
                description: row.description || null,
                unit: row.unit,
                itemType: row.itemType,
                targetGroups: row.targetGroups,
                imageUrl,
                volumePerUnit: row.volumePerUnit ?? 0,
                weightPerUnit: row.weightPerUnit ?? 0,
              });

              return { rowId: row.id, imageUrl };
            }),
          );

          uploadedImages.forEach((entry) => {
            if (!entry) return;
            uploadedImageCount += 1;
            imageUrlByRowId.set(entry.rowId, entry.imageUrl);
          });

          if (uploadedImageCount > 0) {
            setRows((prev) =>
              prev.map((row) =>
                imageUrlByRowId.get(row.id)
                  ? {
                      ...row,
                      imageUrl: imageUrlByRowId.get(row.id) ?? row.imageUrl,
                    }
                  : row,
              ),
            );
          }

          toast.dismiss(uploadToastId);
        } catch {
          toast.dismiss(uploadToastId);
          setIsUploadingImages(false);
          toast.warning("Phiếu nhập đã tạo nhưng có ảnh chưa tải lên được.");
          router.push("/dashboard/inventory");
          return;
        }

        setIsUploadingImages(false);
      }

      if (deferredImageFailures > 0) {
        toast.warning(
          `Nhập kho thành công ${rows.length} vật phẩm, nhưng còn ${deferredImageFailures} ảnh chưa gắn được.`,
        );
      } else if (uploadedImageCount > 0) {
        toast.success(
          `Nhập kho thành công ${rows.length} vật phẩm và đã tải ${uploadedImageCount} ảnh.`,
        );
      } else {
        toast.success(
          `Nhập kho thành công ${rows.length} vật phẩm từ tổ chức!`,
        );
      }
      router.push("/dashboard/inventory");
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || "Lỗi không xác định";
      toast.error(`Nhập kho thất bại: ${errorMsg}`);
    }
  }, [
    applyRowValidation,
    rows,
    selectedOrgId,
    orgSearchValue,
    batchNote,
    selectedDepotId,
    importMutation,
    router,
  ]);

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
    field: EditableField,
    placeholder: string,
    type: "text" | "number" = "text",
  ) => {
    const error = row.errors[field];
    const rawValue = row[field];
    const value = type === "number" ? rawValue || "" : String(rawValue ?? "");
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
        {error && (
          <p className="text-[10px] text-red-500 leading-tight text-wrap break-words">
            {error}
          </p>
        )}
      </div>
    );
  };

  const renderOptionalDecimalCell = (
    row: ImportRow,
    field: "volumePerUnit" | "weightPerUnit",
    placeholder: string,
  ) => {
    const error = row.errors[field];
    const rawValue = row[field];
    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            type="number"
            lang="en-US"
            step="any"
            min={0}
            value={rawValue ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              updateRow(
                row.id,
                field,
                val === "" ? undefined : parseFloat(val),
              );
            }}
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
        {error && (
          <p className="text-[10px] text-red-500 leading-tight text-wrap break-words">
            {error}
          </p>
        )}
      </div>
    );
  };

  const renderSelectCell = (
    row: ImportRow,
    field: EditableField,
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
        {error && (
          <p className="text-[10px] text-red-500 leading-tight text-wrap break-words">
            {error}
          </p>
        )}
      </div>
    );
  };

  const renderImageCell = (row: ImportRow) => {
    const error = row.errors.imageUrl;

    if (row.itemModelId) {
      return (
        <div className="w-28">
          <div className="inline-flex h-7 items-center rounded-md bg-emerald-50 px-2 text-sm font-medium text-emerald-700">
            Đã có
          </div>
        </div>
      );
    }

    return (
      <div className="w-28 space-y-1.5">
        {!row.imagePreviewUrl && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 gap-1 px-2 text-sm"
              onClick={() => imageInputRefs.current[row.id]?.click()}
            >
              <UploadSimple className="h-3 w-3" />
              Tải
            </Button>
            <input
              ref={(el) => {
                imageInputRefs.current[row.id] = el;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleRowImageChange(row.id, file);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {row.imagePreviewUrl ? (
          <div className="flex h-8 w-full min-w-0 items-center gap-1 rounded-md border border-input px-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 min-w-0 flex-1 justify-start gap-1 px-1 text-sm text-foreground hover:text-foreground"
              onClick={() =>
                setPreviewImage({
                  src: row.imagePreviewUrl,
                  alt: `Ảnh ${row.itemName || `dòng ${row.row}`}`,
                })
              }
            >
              <span className="inline-flex items-center justify-center rounded-md bg-emerald-50 p-1 text-emerald-700">
                <Eye className="h-3.5 w-3.5" weight="bold" />
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-red-500"
              onClick={() => clearRowImage(row.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}

        {error && (
          <p className="text-[10px] text-red-500 leading-tight text-wrap break-words">
            {error}
          </p>
        )}
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
        : selected
            .map((v) => options.find((o) => o.value === v)?.label ?? v)
            .join(", ");
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
          <PopoverContent
            className="p-1 w-48"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
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
        {error && (
          <p className="text-[10px] text-red-500 leading-tight text-wrap break-words">
            {error}
          </p>
        )}
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
      <motion.div
        className="shrink-0 border-b bg-background px-6 py-4"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
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
                <Buildings
                  className="h-5 w-5 text-[#FF5722]"
                  weight="duotone"
                />
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
              variant="default"
              size="sm"
              className="gap-2 tracking-tighter bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleDownloadTemplate}
            >
              <DownloadSimple className="h-4 w-4" />
              Tải file mẫu Excel
            </Button>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-muted/30 p-6">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              className="max-w-7xl mx-auto"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Info */}
                <motion.div
                  className="space-y-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut", delay: 0.1 }}
                >
                  {/* Organization Combobox */}
                  <div className="rounded-xl border bg-card p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[16px] tracking-tighter font-medium">
                        Tổ chức viện trợ
                      </label>
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
                            className={cn(
                              "pl-9 pr-9 tracking-tighter",
                              orgError &&
                                "border-red-400 focus-visible:ring-red-400",
                            )}
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
                                  selectedOrgId === org.key &&
                                    "bg-muted font-medium",
                                )}
                              >
                                <Buildings className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="truncate tracking-tighter">
                                  {org.value}
                                </span>
                                {selectedOrgId === org.key && (
                                  <CheckCircle
                                    className="ml-auto h-4 w-4 text-green-600 shrink-0"
                                    weight="fill"
                                  />
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </PopoverContent>
                    </Popover>
                    {orgError && (
                      <p className="text-[10px] text-red-500 leading-tight text-wrap break-words">
                        {orgError}
                      </p>
                    )}
                    <p className="text-sm tracking-tighter text-muted-foreground">
                      Chọn từ danh sách hoặc nhập tên tổ chức từ thiện bất kỳ
                    </p>
                  </div>

                  {/* Column Preview */}
                  <div className="rounded-xl border bg-card p-6">
                    <p className="text-[16px] tracking-tighter font-medium mb-3">
                      Các cột trong file Excel:
                    </p>
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
                </motion.div>

                {/* Right Column - Two options */}
                <motion.div
                  className="flex flex-col gap-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.38, ease: "easeOut", delay: 0.15 }}
                >
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
                        <p className="font-semibold tracking-tighter text-base mb-1">
                          Kéo thả file Excel vào đây
                        </p>
                        <p className="text-sm tracking-tighter text-muted-foreground">
                          hoặc{" "}
                          <span className="text-[#FF5722] tracking-tighter font-medium underline underline-offset-2">
                            nhấp để chọn file
                          </span>
                        </p>
                      </div>
                      <p className="text-xs tracking-tighter text-muted-foreground">
                        Chấp nhận{" "}
                        <code className="px-1.5 py-0.5 rounded bg-muted">
                          .xlsx
                        </code>{" "}
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
                      <p className="font-semibold tracking-tighter text-base">
                        Nhập thủ công
                      </p>
                      <p className="text-sm tracking-tighter mt-0.5">
                        Thêm từng dòng vật phẩm bằng tay
                      </p>
                    </div>
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {step === "review" && (
            <motion.div
              key="review"
              className="space-y-4 flex flex-col h-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 tracking-tighter rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    {fileName ? (
                      <FileXls
                        className="h-5 w-5 text-green-600"
                        weight="duotone"
                      />
                    ) : (
                      <PencilSimple
                        className="h-5 w-5 text-[#FF5722]"
                        weight="duotone"
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-medium tracking-tighter text-sm">
                      {fileName || "Nhập thủ công"}
                    </p>
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
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAppendExcel(f);
                      e.target.value = "";
                    }}
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
                <span className="text-sm tracking-tighter font-medium shrink-0">
                  Tổ chức viện trợ
                </span>
                {!orgSearchValue.trim() && (
                  <span className="text-xs tracking-tighter text-red-500 shrink-0">
                    (bắt buộc)
                  </span>
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
                            !orgSearchValue.trim() &&
                              "border-red-400 focus-visible:ring-red-400",
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
                                selectedOrgId === org.key &&
                                  "bg-muted font-medium",
                              )}
                            >
                              <Buildings className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="truncate tracking-tighter">
                                {org.value}
                              </span>
                              {selectedOrgId === org.key && (
                                <CheckCircle
                                  className="ml-auto h-4 w-4 text-green-600 shrink-0"
                                  weight="fill"
                                />
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
                {selectedOrgId && (
                  <CheckCircle
                    className="h-4 w-4 text-green-600 shrink-0"
                    weight="fill"
                  />
                )}
              </div>

              {/* Batch Note */}
              <div className="shrink-0 rounded-xl border bg-card px-4 py-3 flex items-center gap-3">
                <PencilSimple className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm tracking-tighter font-medium shrink-0">
                  Ghi chú lần nhập
                </span>
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
                      <TableHead className="min-w-24 text-center">
                        ID Vật phẩm
                      </TableHead>
                      <TableHead className="min-w-40">Danh mục</TableHead>
                      <TableHead className="min-w-36">Đối tượng</TableHead>
                      <TableHead className="min-w-36">Loại vật phẩm</TableHead>
                      <TableHead className="min-w-24">Đơn vị</TableHead>
                      <TableHead className="min-w-48">Mô tả vật phẩm</TableHead>
                      <TableHead className="min-w-32 w-32">Ảnh</TableHead>
                      <TableHead className="min-w-24">Số lượng</TableHead>
                      <TableHead className="min-w-28">
                        Thể tích / đơn vị
                      </TableHead>
                      <TableHead className="min-w-28">
                        Cân nặng / đơn vị
                      </TableHead>
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
                          className={cn(
                            hasErrors && "bg-red-50/50 dark:bg-red-950/10",
                          )}
                        >
                          {/* STT */}
                          <TableCell className="text-center text-xs text-muted-foreground font-mono">
                            {row.row}
                          </TableCell>

                          {/* Tên vật phẩm */}
                          <TableCell>
                            {renderInputCell(row, "itemName", "Tên vật phẩm")}
                          </TableCell>

                          {/* ID Model */}
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={row.itemModelId ?? ""}
                              onChange={(e) =>
                                updateRow(
                                  row.id,
                                  "itemModelId",
                                  e.target.value
                                    ? Number(e.target.value)
                                    : undefined,
                                )
                              }
                              placeholder="X"
                              disabled={!row.itemModelId}
                              className="h-8 text-sm w-20 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </TableCell>

                          {/* Danh mục */}
                          <TableCell>
                            {renderSelectCell(
                              row,
                              "categoryCode",
                              SYSTEM_CATEGORIES.map((c) => ({
                                label: c.label,
                                value: c.value,
                              })),
                              "Chọn danh mục",
                            )}
                          </TableCell>

                          {/* Đối tượng */}
                          <TableCell>
                            {renderMultiSelectCell(
                              row,
                              targetGroupOptions,
                              "Chọn đối tượng",
                            )}
                            {row.itemType === "Reusable" &&
                              row.targetGroups?.includes("Rescuer") &&
                              !row.errors.targetGroups && (
                                <p className="text-[11px] text-blue-500 mt-0.5">
                                  Mặc định chọn với loại Tái sử dụng
                                </p>
                              )}
                          </TableCell>

                          {/* Loại vật phẩm */}
                          <TableCell>
                            {itemTypeOptions.length > 0
                              ? renderSelectCell(
                                  row,
                                  "itemType",
                                  itemTypeOptions,
                                  "Chọn loại",
                                )
                              : renderInputCell(
                                  row,
                                  "itemType",
                                  "Loại vật phẩm",
                                )}
                          </TableCell>

                          {/* Đơn vị */}
                          <TableCell>
                            {renderInputCell(row, "unit", "Đơn vị")}
                          </TableCell>

                          {/* Mô tả vật phẩm */}
                          <TableCell>
                            <Input
                              value={row.description}
                              onChange={(e) =>
                                updateRow(row.id, "description", e.target.value)
                              }
                              placeholder="Mô tả vật phẩm..."
                              className="h-8 text-sm"
                            />
                          </TableCell>

                          {/* Ảnh */}
                          <TableCell>{renderImageCell(row)}</TableCell>

                          {/* Số lượng */}
                          <TableCell>
                            {renderInputCell(row, "quantity", "0", "number")}
                          </TableCell>

                          {/* Thể tích / đơn vị */}
                          <TableCell>
                            {renderOptionalDecimalCell(
                              row,
                              "volumePerUnit",
                              "dm3",
                            )}
                          </TableCell>

                          {/* Cân nặng / đơn vị */}
                          <TableCell>
                            {renderOptionalDecimalCell(
                              row,
                              "weightPerUnit",
                              "kg",
                            )}
                          </TableCell>

                          {/* Ngày hết hạn */}
                          <TableCell>
                            <DatePickerInput
                              value={row.expiredDate}
                              onChange={(v) =>
                                updateRow(row.id, "expiredDate", v)
                              }
                              placeholder="Chọn ngày..."
                            />
                          </TableCell>

                          {/* Ngày nhận */}
                          <TableCell>
                            <div className="space-y-1">
                              <DateTimePickerInput
                                value={row.receivedDate}
                                onChange={(v) =>
                                  updateRow(row.id, "receivedDate", v)
                                }
                                placeholder="Chọn ngày giờ..."
                                hasError={!!row.errors.receivedDate}
                              />
                              {row.errors.receivedDate && (
                                <p className="text-[10px] text-red-500 leading-tight text-wrap break-words">
                                  {row.errors.receivedDate}
                                </p>
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
                        <TableCell
                          colSpan={15}
                          className="h-32 text-center text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <Trash className="h-8 w-8" weight="duotone" />
                            <p className="text-sm">Chưa có dữ liệu</p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={addRow}
                              >
                                <Plus className="h-3.5 w-3.5" /> Thêm dòng
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() =>
                                  excelReviewInputRef.current?.click()
                                }
                              >
                                <FileXls className="h-3.5 w-3.5" /> Nhập từ
                                Excel
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-2"
                >
                  <ArrowCounterClockwise className="h-4 w-4" />
                  Hủy
                </Button>
                <Button
                  size="sm"
                  className="gap-2 bg-[#FF5722] hover:bg-[#E64A19] text-white"
                  onClick={handleSubmit}
                  disabled={
                    rows.length === 0 ||
                    importMutation.isPending ||
                    isUploadingImages
                  }
                >
                  {importMutation.isPending || isUploadingImages ? (
                    <SpinnerGap className="h-4 w-4 animate-spin" />
                  ) : (
                    <FloppyDisk className="h-4 w-4" weight="fill" />
                  )}
                  {isUploadingImages
                    ? "Đang tải ảnh..."
                    : importMutation.isPending
                      ? "Đang nhập kho..."
                      : "Xác nhận nhập kho"}
                  {rows.length > 0 &&
                    !importMutation.isPending &&
                    !isUploadingImages && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-xs">
                        {rows.length}
                      </span>
                    )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null);
        }}
      >
        <DialogContent className="max-w-3xl border-0 bg-transparent p-2 shadow-none">
          <DialogTitle className="sr-only">Xem ảnh vật phẩm</DialogTitle>
          {previewImage && (
            <div className="overflow-hidden rounded-xl bg-background p-3 shadow-xl">
              <div className="relative mx-auto aspect-square max-h-[75vh] w-full max-w-2xl">
                <Image
                  src={previewImage.src}
                  alt={previewImage.alt}
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
