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
  FilePdf,
  Trash,
  FloppyDisk,
  WarningCircle,
  ArrowCounterClockwise,
  DownloadSimple,
  X,
  CheckCircle,
  ArrowLeft,
  Package,
  SpinnerGap,
  Receipt,
  Plus,
  PencilSimple,
} from "@phosphor-icons/react";
import {
  useInventoryItemTypes,
  useInventoryTargetGroups,
  useImportRegularInventory,
} from "@/services/inventory/hooks";
import type { ImportPurchaseItem, VatInvoice } from "@/services/inventory/type";
import { uploadRawToCloudinary } from "@/utils/uploadFile";
import { DatePickerInput } from "@/components/ui/date-picker-input";

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

const COL = {
  STT: "STT",
  TEN: "Tên vật phẩm",
  DANHMUC: "Danh mục",
  DOITUONG: "Đối tượng",
  LOAI: "Loại vật phẩm",
  DONVI: "Đơn vị",
  DONGIA: "Đơn giá",
  SOLUONG: "Số lượng",
  HETHAN: "Ngày hết hạn",
  NHAN: "Ngày nhận",
  GHICHU: "Ghi chú",
} as const;

interface VatFormState {
  invoiceSerial: string;
  invoiceNumber: string;
  supplierName: string;
  supplierTaxCode: string;
  invoiceDate: string;
  totalAmount: string;
}

interface ImportRow {
  id: string;
  row: number;
  itemName: string;
  categoryCode: string;
  targetGroup: string;
  itemType: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  expiredDate: string;
  receivedDate: string;
  notes: string;
  errors: Record<string, string>;
}

type Step = "upload" | "review";

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

/** Auto-detects the real header row (skips title/note rows) and returns parsed data rows. */
function getSheetRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  const headerRowIndex = rawRows.findIndex(
    (row) =>
      Array.isArray(row) &&
      row.some(
        (cell) =>
          String(cell ?? "").trim() === "STT" ||
          String(cell ?? "").trim() === "Tên vật phẩm",
      ),
  );
  const range = headerRowIndex >= 0 ? headerRowIndex : 0;
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { range, defval: "" });
}

function cleanNumber(s: string): string {
  return s.replace(/[,. ]/g, "").replace(/[^\d]/g, "");
}

function formatMoney(value: string | number): string {
  const raw = typeof value === "string" ? value.replace(/\D/g, "") : String(Math.round(value));
  const n = parseInt(raw, 10);
  if (!raw || isNaN(n)) return "";
  return n.toLocaleString("vi-VN");
}

interface PdfLine {
  text: string;
  minX: number;
  maxX: number;
}

function extractVatFields(pdfLines: PdfLine[]): Partial<VatFormState> {
  const result: Partial<VatFormState> = {};
  const texts = pdfLines.map((l) => l.text);
  const fullText = texts.join("\n");

  function afterColon(line: string): string {
    const ci = line.lastIndexOf(":");
    return ci >= 0 ? line.slice(ci + 1).trim() : "";
  }

  function labelValue(labelPat: RegExp): string | null {
    for (let i = 0; i < texts.length; i++) {
      if (!labelPat.test(texts[i])) continue;

      const after = afterColon(texts[i]);
      if (after.length > 1 && !/^[:\s]*$/.test(after)) return after;

      for (let j = i + 1; j < Math.min(i + 5, texts.length); j++) {
        const next = texts[j].trim();
        if (!next) continue;
        const ci = next.indexOf(":");
        if (ci > 1 && ci < next.length - 2) break;
        return next;
      }
    }
    return null;
  }

  {
    const serialPat = /k[yý]\s*hi[eệ]u\s*[:\s]+([A-Za-z0-9][A-Za-z0-9\/\-]{1,10})/i;
    const m = fullText.match(serialPat);
    if (m) result.invoiceSerial = m[1].trim();

    if (!result.invoiceSerial) {
      const v = labelValue(/k[yý]\s*hi[eệ]u/i);
      if (v) {
        const vm = v.match(/^([A-Za-z0-9][A-Za-z0-9\/\-]{1,10})/);
        if (vm) result.invoiceSerial = vm[1];
      }
    }
  }

  {
    const explicit = [
      /s[oố]\s*h[oó]a\s*[dđ][oơ]n\s*[:\s]+0*(\d{1,7})/i,
      /\bNo\.?\s*[:\s]+0*(\d{4,7})/i,
    ];
    for (const pat of explicit) {
      const m = fullText.match(pat);
      if (m) { result.invoiceNumber = m[1].padStart(7, "0"); break; }
    }

    if (!result.invoiceNumber) {
      for (const line of texts) {
        if (/k[yý]\s*hi[eệ]u/i.test(line)) {
          const m = line.match(/s[oố]\s*[:\s]+0*(\d{4,7})/i);
          if (m) { result.invoiceNumber = m[1].padStart(7, "0"); break; }
        }
      }
    }

    if (!result.invoiceNumber) {
      for (let i = 0; i < texts.length; i++) {
        const line = texts[i];
        if (!/\bs[oố]\b/i.test(line)) continue;
        if (/thu[eế]|[Mm][aã]|[Aa]ddress|[Đđ][iị]a/i.test(line)) continue;
        const self = line.match(/0*(\d{4,7})\s*$/);
        if (self) { result.invoiceNumber = self[1].padStart(7, "0"); break; }
        const next = texts[i + 1] ?? "";
        const nextM = next.match(/^0*(\d{4,7})$/);
        if (nextM) { result.invoiceNumber = nextM[1].padStart(7, "0"); break; }
      }
    }
  }

  {
    const labelPat = /([Đđ][oơ]n\s*v[iị]\s*b[aá]n|[Tt][eê]n\s*[Đđ][oơ]n\s*v[iị]|[Nn]g[uư][oờ]i\s*b[aá]n|[Nn]h[aà]\s*cung\s*c[aấ]p)/i;
    const v = labelValue(labelPat);
    if (v && v.length >= 3) {
      const trimmed = v.split(/\s{3,}|\t/)[0].trim();
      result.supplierName = trimmed;
    }
  }

  {
    const buyerStart = texts.findIndex((l) =>
      /ng[uư][oờ]i\s*mua|[Kk]h[aá]ch\s*h[aà]ng|[Đđ][oơ]n\s*v[iị]\s*mua/i.test(l),
    );

    const mstRe = /m[aã]\s*s[oố]\s*thu[eế]/i;
    const sellerMstIdx = texts.findIndex(
      (l, i) => mstRe.test(l) && (buyerStart < 0 || i < buyerStart),
    );
    const mstIdx = sellerMstIdx >= 0 ? sellerMstIdx : texts.findIndex((l) => mstRe.test(l));

    if (mstIdx >= 0) {
      const mstLine = texts[mstIdx];
      const inline = mstLine.match(/([\d]{10,13})/);
      if (inline) {
        result.supplierTaxCode = inline[1];
      } else {
        const afterC = afterColon(mstLine);
        const acM = afterC.match(/([\d\-]{10,14})/);
        if (acM) result.supplierTaxCode = acM[1].replace(/-/g, "");
        else {
          const next = texts[mstIdx + 1] ?? "";
          const nm = next.match(/^([\d\-]{10,14})$/);
          if (nm) result.supplierTaxCode = nm[1].replace(/-/g, "");
        }
      }
    }
  }

  {
    const viDate = fullText.match(
      /[Nn]g[aà]y\s+(\d{1,2})\s+th[aá]ng\s+(\d{1,2})\s+n[aă]m\s+(20\d{2})/,
    );
    if (viDate) {
      result.invoiceDate = `${viDate[3]}-${viDate[2].padStart(2, "0")}-${viDate[1].padStart(2, "0")}`;
    }

    if (!result.invoiceDate) {
      const dmy = fullText.match(/\b(\d{2})[\/\-](\d{2})[\/\-](20\d{2})\b/);
      if (dmy) {
        result.invoiceDate = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
      }
    }

    if (!result.invoiceDate) {
      const iso = fullText.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
      if (iso) result.invoiceDate = `${iso[1]}-${iso[2]}-${iso[3]}`;
    }
  }

  {
    const totalLabels = [
      /t[oổ]ng\s*ti[eề]n\s*thanh\s*to[aá]n/i,
      /t[oổ]ng\s*c[oộ]ng\s*ti[eề]n\s*thanh\s*to[aá]n/i,
      /t[oổ]ng\s*thanh\s*to[aá]n/i,
      /t[oổ]ng\s*s[oố]\s*ti[eề]n/i,
      /c[oộ]ng\s*ti[eề]n\s*h[aà]ng/i,
    ];

    for (const pat of totalLabels) {
      const idx = texts.findIndex((l) => pat.test(l));
      if (idx < 0) continue;

      const nums = texts[idx].match(/[\d][0-9,.]+/g);
      if (nums && nums.length > 0) {
        const raw = nums
          .map((n) => cleanNumber(n))
          .filter((n) => n.length >= 3)
          .sort((a, b) => b.length - a.length || parseInt(b) - parseInt(a))[0];
        if (raw) { result.totalAmount = raw; break; }
      }

      const nextLine = texts[idx + 1] ?? "";
      const nextNums = nextLine.match(/[\d][0-9,.]+/g);
      if (nextNums) {
        const raw = cleanNumber(nextNums[nextNums.length - 1]);
        if (raw.length >= 3) { result.totalAmount = raw; break; }
      }
    }
  }

  return result;
}

async function parseVatPdf(file: File): Promise<Partial<VatFormState>> {
  try {
    const pdfjs = await import("pdfjs-dist");
    (pdfjs as any).GlobalWorkerOptions.workerSrc =
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${(pdfjs as any).version}/build/pdf.worker.min.mjs`;

    const buffer = await file.arrayBuffer();
    const pdf = await (pdfjs as any).getDocument({ data: buffer }).promise;

    interface TItem { str: string; x: number; y: number; w: number; h: number; }
    const allLines: PdfLine[] = [];

    const pageCount = Math.min(pdf.numPages, 3);
    for (let p = 1; p <= pageCount; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();

      const items: TItem[] = (content.items as any[])
        .filter((item) => "str" in item && typeof item.str === "string")
        .map((item) => ({
          str: (item.str as string).normalize("NFC"),
          x: item.transform[4] as number,
          y: item.transform[5] as number,
          w: (typeof item.width === "number" && item.width > 0)
            ? item.width
            : Math.abs(item.transform[0]) * (item.str as string).length * 0.55,
          h: (typeof item.height === "number" && item.height > 0)
            ? item.height
            : Math.abs(item.transform[3]),
        }))
        .filter((it) => it.str.trim().length > 0);

      if (items.length === 0) continue;

      const hBuckets = new Map<number, number>();
      for (const it of items) {
        const k = Math.round(it.h);
        if (k > 0) hBuckets.set(k, (hBuckets.get(k) ?? 0) + 1);
      }
      let modeH = 10;
      let maxCnt = 0;
      for (const [h, c] of hBuckets) {
        if (c > maxCnt) { maxCnt = c; modeH = h; }
      }
      const yTol = Math.max(5, modeH * 0.6);

      items.sort((a, b) => b.y - a.y || a.x - b.x);

      const groups: TItem[][] = [];
      for (const item of items) {
        const match = groups.find((g) => {
          const avgY = g.reduce((s, i) => s + i.y, 0) / g.length;
          return Math.abs(avgY - item.y) <= yTol;
        });
        if (match) match.push(item);
        else groups.push([item]);
      }

      const spaceThreshold = modeH * 0.3;
      for (const group of groups) {
        group.sort((a, b) => a.x - b.x);
        let text = group[0].str;
        for (let i = 1; i < group.length; i++) {
          const prev = group[i - 1];
          const curr = group[i];
          const gap = curr.x - (prev.x + prev.w);
          const needSpace =
            gap > spaceThreshold ||
            text.endsWith(" ") ||
            curr.str.startsWith(" ");
          text += needSpace ? " " + curr.str : curr.str;
        }
        const normalized = text.normalize("NFC").replace(/\s+/g, " ").trim();
        if (normalized) {
          allLines.push({
            text: normalized,
            minX: group[0].x,
            maxX: group[group.length - 1].x + group[group.length - 1].w,
          });
        }
      }
    }

    return extractVatFields(allLines);
  } catch {
    return {};
  }
}

const EMPTY_VAT_FORM: VatFormState = {
  invoiceSerial: "",
  invoiceNumber: "",
  supplierName: "",
  supplierTaxCode: "",
  invoiceDate: "",
  totalAmount: "",
};

interface PurchaseGroup {
  id: string;
  vatFile: File | null;
  vatParsing: boolean;
  vatForm: VatFormState;
  rows: ImportRow[];
  fileName: string;
}

function createEmptyGroup(): PurchaseGroup {
  return {
    id: `grp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    vatFile: null,
    vatParsing: false,
    vatForm: { ...EMPTY_VAT_FORM },
    rows: [],
    fileName: "",
  };
}

export default function ExcelImportRegular() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [groups, setGroups] = useState<PurchaseGroup[]>([createEmptyGroup()]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const vatInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const excelReviewInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const GROUP_COLORS = [
    { border: "border-l-blue-500",   header: "bg-blue-50/60 dark:bg-blue-950/20",   icon: "text-blue-600",   badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
    { border: "border-l-purple-500", header: "bg-purple-50/60 dark:bg-purple-950/20", icon: "text-purple-600", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
    { border: "border-l-amber-500",  header: "bg-amber-50/60 dark:bg-amber-950/20",  icon: "text-amber-600",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
    { border: "border-l-emerald-500",header: "bg-emerald-50/60 dark:bg-emerald-950/20",icon: "text-emerald-600",badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    { border: "border-l-rose-500",   header: "bg-rose-50/60 dark:bg-rose-950/20",   icon: "text-rose-600",   badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
    { border: "border-l-cyan-500",   header: "bg-cyan-50/60 dark:bg-cyan-950/20",   icon: "text-cyan-600",   badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
  ] as const;

  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: targetGroupsData } = useInventoryTargetGroups();
  const importMutation = useImportRegularInventory();

  const itemTypes = useMemo(() => itemTypesData ?? [], [itemTypesData]);
  const targetGroups = useMemo(() => targetGroupsData ?? [], [targetGroupsData]);

  const patchGroup = useCallback(
    (id: string, patch: Partial<PurchaseGroup> | ((g: PurchaseGroup) => PurchaseGroup)) => {
      setGroups((prev) =>
        prev.map((g) =>
          g.id !== id ? g : typeof patch === "function" ? patch(g) : { ...g, ...patch },
        ),
      );
    },
    [],
  );

  const validateRow = useCallback((row: Omit<ImportRow, "errors">): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!row.itemName) errors.itemName = "Tên vật phẩm không được trống";
    if (!row.categoryCode) errors.categoryCode = "Danh mục không hợp lệ";
    if (!row.quantity || row.quantity <= 0) errors.quantity = "Số lượng phải > 0";
    if (row.unitPrice < 0) errors.unitPrice = "Đơn giá không hợp lệ";
    if (!row.unit) errors.unit = "Đơn vị không được trống";
    if (!row.itemType) errors.itemType = "Loại vật phẩm không được trống";
    if (!row.targetGroup) errors.targetGroup = "Đối tượng không được trống";
    if (row.itemType === "Reusable" && row.targetGroup !== "Rescuer")
      errors.targetGroup = "Đối với vật phẩm ‘Tái sử dụng’, đối tượng áp dụng là ‘Lực lượng cứu hộ’.";
    if (!row.receivedDate) errors.receivedDate = "Ngày nhận không được trống";
    else if (row.receivedDate > new Date().toISOString().slice(0, 10)) errors.receivedDate = "Ngày nhận không được là ngày trong tương lai";
    return errors;
  }, []);

  const handleVatFile = useCallback(
    async (groupId: string, file: File) => {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Chỉ chấp nhận file PDF");
        return;
      }
      patchGroup(groupId, { vatFile: file, vatForm: { ...EMPTY_VAT_FORM }, vatParsing: true });
      try {
        const parsedFields = await parseVatPdf(file);
        patchGroup(groupId, (g) => ({
          ...g,
          vatParsing: false,
          vatForm: {
            ...g.vatForm,
            invoiceSerial: parsedFields.invoiceSerial ?? g.vatForm.invoiceSerial,
            invoiceNumber: parsedFields.invoiceNumber ?? g.vatForm.invoiceNumber,
            supplierName: parsedFields.supplierName ?? g.vatForm.supplierName,
            supplierTaxCode: parsedFields.supplierTaxCode ?? g.vatForm.supplierTaxCode,
            invoiceDate: parsedFields.invoiceDate ?? g.vatForm.invoiceDate,
            totalAmount: parsedFields.totalAmount ?? g.vatForm.totalAmount,
          },
        }));
        const filledCount = Object.values(parsedFields).filter(Boolean).length;
        if (filledCount > 0) {
          toast.success(`Đọc được ${filledCount}/6 trường từ PDF`);
        } else {
          toast.warning("Không đọc được thông tin từ PDF. Vui lòng điền thủ công.");
        }
      } catch {
        patchGroup(groupId, { vatParsing: false });
        toast.warning("Không đọc được thông tin từ PDF. Vui lòng điền thủ công.");
      }
    },
    [patchGroup],
  );

  const updateVatForm = useCallback(
    (groupId: string, field: keyof VatFormState, value: string) => {
      patchGroup(groupId, (g) => ({ ...g, vatForm: { ...g.vatForm, [field]: value } }));
    },
    [patchGroup],
  );

  const parseRowsFromSheet = useCallback(
    (jsonData: Record<string, unknown>[], offset = 0): ImportRow[] => {
      return jsonData.map((raw, idx) => {
        const rawCategory = String(raw[COL.DANHMUC] ?? "").trim();
        const categoryCode = CATEGORY_VI_MAP[rawCategory.toLowerCase()] ?? "";

        const rawTargetGroup = String(raw[COL.DOITUONG] ?? "").trim();
        const matchedTargetGroup = targetGroups.find(
          (t) => t.value.toLowerCase() === rawTargetGroup.toLowerCase() || t.key.toLowerCase() === rawTargetGroup.toLowerCase(),
        );
        const targetGroupRaw = matchedTargetGroup?.key ?? rawTargetGroup;

        const rawItemType = String(raw[COL.LOAI] ?? "").trim();
        const matchedItemType = itemTypes.find(
          (t) => t.value.toLowerCase() === rawItemType.toLowerCase() || t.key.toLowerCase() === rawItemType.toLowerCase(),
        );
        const itemType = matchedItemType?.key ?? rawItemType;

        // Auto-set targetGroup to Rescuer when item is Reusable
        const targetGroup = itemType === "Reusable" ? "Rescuer" : targetGroupRaw;

        const rowData = {
          id: `row-${offset + idx}-${Date.now()}`,
          row: offset + idx + 1,
          itemName: String(raw[COL.TEN] ?? "").trim(),
          categoryCode,
          targetGroup,
          itemType,
          unit: String(raw[COL.DONVI] ?? "").trim(),
          quantity: Number(raw[COL.SOLUONG] ?? 0) > 0 ? Number(raw[COL.SOLUONG]) : 0,
          unitPrice: Number(raw[COL.DONGIA] ?? 0) >= 0 ? Number(raw[COL.DONGIA]) : 0,
          expiredDate: parseExcelDate(raw[COL.HETHAN]),
          receivedDate: parseExcelDate(raw[COL.NHAN]),
          notes: String(raw[COL.GHICHU] ?? "").trim(),
        };
        return { ...rowData, errors: validateRow(rowData) };
      });
    },
    [validateRow, targetGroups, itemTypes],
  );

  const parseExcelForGroup = useCallback(
    (groupId: string, file: File, append = false) => {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Chỉ chấp nhận file .xlsx");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = getSheetRows(sheet);
          if (jsonData.length === 0) { toast.error("File Excel không có dữ liệu"); return; }

          patchGroup(groupId, (g) => {
            const offset = append ? g.rows.length : 0;
            const parsed = parseRowsFromSheet(jsonData, offset);
            const newRows = append
              ? [...g.rows, ...parsed].map((r, i) => ({ ...r, row: i + 1 }))
              : parsed;
            return { ...g, rows: newRows, fileName: file.name };
          });

          if (!append) setStep("review");
          toast.success(append ? `Đã thêm ${jsonData.length} dòng` : `Đọc ${jsonData.length} dòng thành công`);
        } catch {
          toast.error("Không thể đọc file Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [patchGroup, parseRowsFromSheet],
  );

  const updateRow = useCallback(
    (groupId: string, rowId: string, field: keyof ImportRow, value: string | number) => {
      patchGroup(groupId, (g) => ({
        ...g,
        rows: g.rows.map((r) => {
          if (r.id !== rowId) return r;
          const updated = { ...r, [field]: value };
          // Auto-set targetGroup when itemType changes to Reusable
          if (field === "itemType" && value === "Reusable") {
            updated.targetGroup = "Rescuer";
          }
          updated.errors = validateRow(updated);
          return updated;
        }),
      }));
    },
    [patchGroup, validateRow],
  );

  const deleteRow = useCallback(
    (groupId: string, rowId: string) => {
      patchGroup(groupId, (g) => ({
        ...g,
        rows: g.rows.filter((r) => r.id !== rowId).map((r, i) => ({ ...r, row: i + 1 })),
      }));
    },
    [patchGroup],
  );

  const addRow = useCallback(
    (groupId: string) => {
      patchGroup(groupId, (g) => {
        const newRow: ImportRow = {
          id: `row-manual-${Date.now()}-${Math.random()}`,
          row: g.rows.length + 1,
          itemName: "", categoryCode: "", targetGroup: "", itemType: "",
          unit: "", quantity: 0, unitPrice: 0, expiredDate: "", receivedDate: "", notes: "",
          errors: {},
        };
        newRow.errors = validateRow(newRow);
        return { ...g, rows: [...g.rows, newRow] };
      });
    },
    [patchGroup, validateRow],
  );

  const addGroup = useCallback(() => setGroups((prev) => [...prev, createEmptyGroup()]), []);

  const removeGroup = useCallback((id: string) => {
    setGroups((prev) => {
      if (prev.length <= 1) { toast.error("Phải có ít nhất 1 hóa đơn"); return prev; }
      return prev.filter((g) => g.id !== id);
    });
  }, []);

  const handleReset = useCallback(() => {
    setStep("upload");
    setGroups([createEmptyGroup()]);
  }, []);

  const handleDownloadTemplate = useCallback(() => {
    const link = document.createElement("a");
    link.href = "/templates/mau_nhap_kho_thuong.xlsx";
    link.download = "mau_nhap_kho_thuong.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Đã tải file mẫu");
  }, []);

  const totalRows = useMemo(() => groups.reduce((s, g) => s + g.rows.length, 0), [groups]);
  const totalErrors = useMemo(
    () => groups.reduce((s, g) => s + g.rows.filter((r) => Object.keys(r.errors).length > 0).length, 0),
    [groups],
  );
  const isBusy = useMemo(() => groups.some((g) => g.vatParsing), [groups]);

  const handleSubmit = useCallback(async () => {
    if (totalRows === 0) { toast.error("Không có dữ liệu để nhập kho"); return; }
    if (totalErrors > 0) { toast.error(`Còn ${totalErrors} dòng lỗi. Vui lòng sửa trước khi nhập.`); return; }
    for (const g of groups) {
      const idx = groups.indexOf(g) + 1;
      if (!g.vatFile) { toast.error(`Hóa đơn #${idx} chưa chọn file PDF.`); return; }
      const vatErrors: string[] = [];
      if (!g.vatForm.invoiceSerial.trim()) vatErrors.push("ký hiệu hóa đơn");
      if (!g.vatForm.invoiceNumber.trim()) vatErrors.push("số hóa đơn");
      if (!g.vatForm.supplierName.trim()) vatErrors.push("tên nhà cung cấp");
      if (!g.vatForm.supplierTaxCode.trim()) vatErrors.push("mã số thuế");
      if (!g.vatForm.invoiceDate.trim()) vatErrors.push("ngày hóa đơn");
      else if (g.vatForm.invoiceDate > new Date().toISOString().slice(0, 10)) vatErrors.push("ngày hóa đơn (không được là tương lai)");
      if (!g.vatForm.totalAmount.trim() || parseFloat(g.vatForm.totalAmount.replace(/[^\d.]/g, "")) <= 0) vatErrors.push("tổng tiền hóa đơn");
      if (vatErrors.length > 0) { toast.error(`Hóa đơn #${idx}: Vui lòng điền đầy đủ thông tin (${vatErrors.join(", ")})`); return; }
    }

    setIsUploading(true);
    const uploadToastId = toast.loading(`Đang tải ${groups.length} hóa đơn PDF lên...`);
    let fileUrls: string[];
    try {
      fileUrls = await Promise.all(groups.map((g) => uploadRawToCloudinary(g.vatFile!)));
    } catch {
      setIsUploading(false);
      toast.dismiss(uploadToastId);
      toast.error("Tải PDF thất bại. Vui lòng thử lại.");
      return;
    }
    setIsUploading(false);
    toast.dismiss(uploadToastId);

    const payload = { invoices: groups.map((g, i) => ({
      vatInvoice: {
        invoiceSerial: g.vatForm.invoiceSerial.trim(),
        invoiceNumber: g.vatForm.invoiceNumber.trim(),
        supplierName: g.vatForm.supplierName.trim(),
        supplierTaxCode: g.vatForm.supplierTaxCode.trim(),
        invoiceDate: g.vatForm.invoiceDate,
        totalAmount: parseFloat(g.vatForm.totalAmount.replace(/[^\d.]/g, "")) || 0,
        fileUrl: fileUrls[i],
      } as VatInvoice,
      items: g.rows.map((r) => ({
        row: r.row,
        itemName: r.itemName,
        categoryCode: r.categoryCode,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        unit: r.unit,
        itemType: r.itemType,
        targetGroup: r.targetGroup,
        receivedDate: r.receivedDate,
        expiredDate: r.expiredDate || null,
        notes: r.notes || null,
      } as ImportPurchaseItem)),
    })) };

    importMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(`Nhập kho thành công ${totalRows} vật phẩm!`);
        router.push("/dashboard/inventory");
      },
      onError: (err: any) => {
        toast.error(`Nhập kho thất bại: ${err.response?.data?.message || err.message || "Lỗi không xác định"}`);
      },
    });
  }, [groups, totalRows, totalErrors, importMutation, router]);

  const itemTypeOptions = useMemo(
    () => itemTypes.map((t) => ({ label: t.value, value: t.key })),
    [itemTypes],
  );
  const targetGroupOptions = useMemo(
    () => targetGroups.map((t) => ({ label: t.value, value: t.key })),
    [targetGroups],
  );

  const renderInputCell = (
    groupId: string,
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
            min={type === "number" ? 0 : undefined}
            value={value}
            onChange={(e) =>
              updateRow(groupId, row.id, field, type === "number" ? Number(e.target.value) : e.target.value)
            }
            placeholder={placeholder}
            className={cn("h-8 text-sm", error && "border-red-500 focus-visible:ring-red-500")}
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
    groupId: string,
    row: ImportRow,
    field: keyof Omit<ImportRow, "errors" | "id">,
    options: { label: string; value: string }[],
    placeholder: string,
  ) => {
    const error = row.errors[field];
    const currentValue = String(row[field] ?? "");
    return (
      <div className="space-y-1">
        <Select value={currentValue} onValueChange={(val) => updateRow(groupId, row.id, field, val)}>
          <SelectTrigger className={cn("text-sm", error && "border-red-500")}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    );
  };

  const renderCurrencyCell = (
    groupId: string,
    row: ImportRow,
    field: keyof Omit<ImportRow, "errors" | "id">,
  ) => {
    const error = row.errors[field];
    const rawValue = row[field] as number;
    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            type="text"
            inputMode="numeric"
            value={rawValue > 0 ? formatMoney(rawValue) : ""}
            onChange={(e) => {
              const stripped = e.target.value.replace(/\./g, "").replace(/[^\d]/g, "");
              updateRow(groupId, row.id, field, stripped ? parseInt(stripped, 10) : 0);
            }}
            placeholder="0"
            className={cn("h-8 text-sm", error && "border-red-500 focus-visible:ring-red-500")}
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

  const vatField = (
    groupId: string,
    vatForm: VatFormState,
    hasFile: boolean,
    label: string,
    key: keyof VatFormState,
    placeholder: string,
    type: "text" | "date" | "number" = "text",
    required = false,
    currency = false,
  ) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <Input
        type={currency ? "text" : type}
        value={currency ? formatMoney(vatForm[key]) : vatForm[key]}
        onChange={(e) => {
          const val = currency
            ? e.target.value.replace(/\./g, "").replace(/[^\d]/g, "")
            : e.target.value;
          updateVatForm(groupId, key, val);
        }}
        placeholder={placeholder}
        className={cn(
          "h-8 text-sm",
          type === "date" && "pr-2 [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:cursor-pointer",
          hasFile && required && !vatForm[key].trim() && "border-red-400 focus-visible:ring-red-400",
          hasFile && type === "date" && vatForm[key] && vatForm[key] > new Date().toISOString().slice(0, 10) && "border-red-400 focus-visible:ring-red-400",
        )}
      />
      {hasFile && required && !vatForm[key].trim() && (
        <p className="text-[11px] tracking-tighter text-red-500">Không được phép để trống</p>
      )}
      {hasFile && type === "date" && vatForm[key] && vatForm[key] > new Date().toISOString().slice(0, 10) && (
        <p className="text-[11px] tracking-tighter text-red-500">Ngày không được là ngày trong tương lai</p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
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
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" weight="duotone" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tighter">Nhập kho thường</h1>
                <p className="text-sm tracking-tighter text-muted-foreground">
                  Nhập hàng hóa mua sắm kèm hóa đơn đỏ VAT
                </p>
              </div>
            </div>
          </div>
          {step === "upload" && (
            <Button variant="outline" size="sm" className="gap-2 tracking-tighter" onClick={handleDownloadTemplate}>
              <DownloadSimple className="h-4 w-4" />
              Tải file mẫu Excel
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/30 p-6">
        {step === "upload" && (
          <div className="max-w-7xl mx-auto space-y-5">
            {groups.map((group, idx) => {
              const color = GROUP_COLORS[idx % GROUP_COLORS.length];
              return (
              <div key={group.id} className={cn("rounded-xl border bg-card overflow-hidden border-l-4", color.border)}>
                <div className={cn("flex items-center justify-between px-5 py-3 border-b", color.header)}>
                  <div className="flex items-center gap-2 tracking-tighter">
                    <Receipt className={cn("h-4 w-4", color.icon)} weight="duotone" />
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full tracking-tighter", color.badge)}>Hóa đơn #{idx + 1}</span>
                    {group.vatFile && !group.vatParsing && <CheckCircle className="h-3.5 w-3.5 text-green-500" weight="fill" />}
                    {group.rows.length > 0 && (
                      <span className="text-xs tracking-tighter text-muted-foreground">· {group.rows.length} vật phẩm</span>
                    )}
                  </div>
                  {groups.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-500"
                      onClick={() => removeGroup(group.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
                  <div className="space-y-4">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium tracking-tighter">Hóa đơn đỏ VAT</p>
                      <span className="text-xs text-red-500 ml-0.5">*</span>
                    </div>
                    {!group.vatFile ? (
                      <div
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleVatFile(group.id, f); }}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => vatInputRefs.current[group.id]?.click()}
                        className="border-2 border-dashed border-muted-foreground/25 rounded-xl py-8 flex flex-col items-center gap-3 text-muted-foreground hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all cursor-pointer"
                      >
                        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                          <FilePdf className="h-7 w-7" weight="duotone" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm tracking-tighter">Kéo thả hoặc nhấp để tải PDF</p>
                          <p className="text-xs tracking-tighter mt-0.5">Chỉ chấp nhận file PDF</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted border">
                          <FilePdf className="h-5 w-5 text-red-500 shrink-0" weight="duotone" />
                          <p className="flex-1 text-sm tracking-tighter font-medium truncate">{group.vatFile.name}</p>
                          {group.vatParsing ? (
                            <SpinnerGap className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" weight="fill" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => patchGroup(group.id, { vatFile: null, vatForm: { ...EMPTY_VAT_FORM } })}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {group.vatParsing && (
                          <p className="text-xs tracking-tighter text-blue-600 flex items-center gap-1.5">
                            <SpinnerGap className="h-3.5 w-3.5 animate-spin" />
                            Đang đọc thông tin từ PDF...
                          </p>
                        )}
                        {!group.vatParsing && group.vatFile && (
                          <p className="text-xs tracking-tighter text-green-600 flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                            PDF sẵn sàng. Kiểm tra và chỉnh sửa các trường bên dưới nếu cần.
                          </p>
                        )}
                        {!group.vatParsing && (
                          <div className="grid grid-cols-2 gap-3 tracking-tighter">
                            {vatField(group.id, group.vatForm, !!group.vatFile, "Ký hiệu", "invoiceSerial", "VD: AA/26E", "text", true)}
                            {vatField(group.id, group.vatForm, !!group.vatFile, "Số hóa đơn", "invoiceNumber", "VD: 0000123", "text", true)}
                            <div className="col-span-2">
                              {vatField(group.id, group.vatForm, !!group.vatFile, "Tên nhà cung cấp", "supplierName", "Tên đơn vị bán hàng", "text", true)}
                            </div>
                            {vatField(group.id, group.vatForm, !!group.vatFile, "Mã số thuế", "supplierTaxCode", "VD: 0123456789", "text", true)}
                            {vatField(group.id, group.vatForm, !!group.vatFile, "Ngày hóa đơn", "invoiceDate", "", "date", true)}
                            {vatField(group.id, group.vatForm, !!group.vatFile, "Tổng tiền (VNĐ)", "totalAmount", "VD: 5.000.000", "number", true, true)}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground tracking-tighter w-full justify-center"
                          onClick={() => vatInputRefs.current[group.id]?.click()}
                        >
                          <UploadSimple className="h-3.5 w-3.5" />
                          Đổi file PDF
                        </Button>
                      </div>
                    )}
                    <input
                      ref={(el) => { vatInputRefs.current[group.id] = el; }}
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVatFile(group.id, f); e.target.value = ""; }}
                      className="hidden"
                    />
                  </div>

                  <div className="flex flex-col gap-4">
                    {group.fileName ? (
                      <div className="flex-1 border rounded-xl p-4 bg-muted/30 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <FileXls className="h-5 w-5 text-green-600 shrink-0" weight="duotone" />
                          <span className="text-sm font-medium tracking-tighter flex-1 truncate">{group.fileName}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{group.rows.length} dòng</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-red-500"
                            onClick={() => patchGroup(group.id, { rows: [], fileName: "" })}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 w-full tracking-tighter"
                          onClick={() => fileInputRefs.current[group.id]?.click()}
                        >
                          <UploadSimple className="h-3.5 w-3.5" />
                          Đổi file Excel
                        </Button>
                      </div>
                    ) : (
                      <div
                        onDrop={(e) => { e.preventDefault(); setDraggingId(null); const f = e.dataTransfer.files[0]; if (f) parseExcelForGroup(group.id, f); }}
                        onDragOver={(e) => { e.preventDefault(); setDraggingId(group.id); }}
                        onDragLeave={() => setDraggingId(null)}
                        onClick={() => fileInputRefs.current[group.id]?.click()}
                        className={cn(
                          "flex-1 border-2 border-dashed rounded-xl p-10 flex items-center justify-center cursor-pointer transition-all duration-200 min-h-48",
                          draggingId === group.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                            : "border-muted-foreground/25 hover:border-blue-400/60 hover:bg-muted/50",
                        )}
                      >
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className={cn(
                            "h-16 w-16 rounded-2xl flex items-center justify-center transition-colors",
                            draggingId === group.id ? "bg-blue-500/15 text-blue-600" : "bg-muted text-muted-foreground",
                          )}>
                            <UploadSimple className="h-8 w-8" weight="duotone" />
                          </div>
                          <div className="text-muted-foreground">
                            <p className="font-semibold text-sm tracking-tighter">Kéo thả file Excel</p>
                            <p className="text-xs tracking-tighter mt-0.5">hoặc <span className="text-blue-600 font-medium underline underline-offset-2">nhấp để chọn</span></p>
                          </div>
                        </div>
                      </div>
                    )}
                    <input
                      ref={(el) => { fileInputRefs.current[group.id] = el; }}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) parseExcelForGroup(group.id, f); e.target.value = ""; }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => { patchGroup(group.id, { rows: [], fileName: "" }); setStep("review"); }}
                      className="rounded-xl border-2 border-dashed border-muted-foreground/25 py-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-blue-400/60 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all"
                    >
                      <PencilSimple className="h-5 w-5" weight="duotone" />
                      <span className="text-sm font-medium tracking-tighter">Nhập thủ công</span>
                    </button>
                  </div>
                </div>
              </div>
              );
            })}

            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={addGroup}
                className="w-full rounded-xl border-2 border-dashed border-muted-foreground/25 py-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-blue-400/60 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all"
              >
                <Plus className="h-5 w-5" />
                <span className="text-sm font-medium tracking-tighter">Thêm hóa đơn</span>
              </button>
              {totalRows > 0 && (
                <Button
                  size="sm"
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6"
                  onClick={() => setStep("review")}
                >
                  Xem lại & Xác nhận
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-xs">{totalRows}</span>
                </Button>
              )}
            </div>

            <div className="rounded-xl border bg-card px-5 py-4">
              <p className="text-sm font-medium mb-3 tracking-tighter text-muted-foreground">Các cột trong file Excel:</p>
              <div className="flex flex-wrap gap-2">
                {Object.values(COL).map((col) => (
                  <span key={col} className="px-2.5 py-1 rounded-md bg-muted border text-xs font-mono">{col}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-5 flex flex-col">
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs tracking-tighter font-medium">
                  <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                  {totalRows - totalErrors} hợp lệ
                </div>
                {totalErrors > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 text-xs tracking-tighter font-medium">
                    <WarningCircle className="h-3.5 w-3.5" weight="fill" />
                    {totalErrors} lỗi
                  </div>
                )}
                <span className="text-xs tracking-tighter text-muted-foreground">{groups.length} hóa đơn · {totalRows} vật phẩm</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 tracking-tighter" onClick={addGroup}>
                  <Plus className="h-4 w-4" />
                  Thêm hóa đơn
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground tracking-tighter" onClick={handleReset}>
                  <ArrowCounterClockwise className="h-4 w-4" />
                  Nhập lại
                </Button>
              </div>
            </div>

            {groups.map((group, idx) => {
              const color = GROUP_COLORS[idx % GROUP_COLORS.length];
              const groupErrors = group.rows.filter((r) => Object.keys(r.errors).length > 0).length;
              const groupValid = group.rows.length - groupErrors;
              return (
                <div key={group.id} className={cn("rounded-xl border bg-card overflow-hidden border-l-4", color.border)}>
                  <div className={cn("flex items-center justify-between px-5 py-3 border-b", color.header)}>
                    <div className="flex items-center tracking-tighter gap-2">
                      <Receipt className={cn("h-4 w-4", color.icon)} weight="duotone" />
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full tracking-tighter", color.badge)}>Hóa đơn #{idx + 1}</span>
                      {group.fileName && <span className="text-xs tracking-tighter text-muted-foreground">· {group.fileName}</span>}
                      <span className="text-xs tracking-tighter text-green-600 font-medium ml-1">{groupValid} hợp lệ</span>
                      {groupErrors > 0 && <span className="text-xs tracking-tighter text-red-500 font-medium">· {groupErrors} lỗi</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs h-7 px-2 text-muted-foreground tracking-tighter"
                        onClick={() => excelReviewInputRefs.current[group.id]?.click()}
                      >
                        <FileXls className="h-3.5 w-3.5" />
                        Nhập từ Excel
                      </Button>
                      <input
                        ref={(el) => { excelReviewInputRefs.current[group.id] = el; }}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) parseExcelForGroup(group.id, f, true); e.target.value = ""; }}
                        className="hidden"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs h-7 px-2 text-muted-foreground tracking-tighter"
                        onClick={() => addRow(group.id)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Thêm dòng
                      </Button>
                      {groups.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          onClick={() => removeGroup(group.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-4 border-b space-y-3">
                    <div className="flex items-center gap-2">
                      <Receipt className={cn("h-4 w-4", color.icon)} weight="duotone" />
                      <p className="text-sm tracking-tighter font-medium">Thông tin hóa đơn VAT</p>
                      {!group.vatFile && <span className="text-xs tracking-tighter text-red-500">(chưa chọn PDF)</span>}
                      {group.vatFile && <CheckCircle className="h-3.5 w-3.5 text-green-500" weight="fill" />}
                      {group.vatFile && (
                        <span className="text-xs tracking-tighter text-muted-foreground truncate max-w-48 ml-1">{group.vatFile.name}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs ml-auto h-6 px-2 text-muted-foreground tracking-tighter"
                        onClick={() => vatInputRefs.current[group.id]?.click()}
                      >
                        <UploadSimple className="h-3 w-3" />
                        {group.vatFile ? "Đổi PDF" : "Tải PDF lên"}
                      </Button>
                      <input
                        ref={(el) => { vatInputRefs.current[group.id] = el; }}
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVatFile(group.id, f); e.target.value = ""; }}
                        className="hidden"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 tracking-tighter">
                      {vatField(group.id, group.vatForm, !!group.vatFile, "Ký hiệu", "invoiceSerial", "AA/26E", "text", true)}
                      {vatField(group.id, group.vatForm, !!group.vatFile, "Số hóa đơn", "invoiceNumber", "0000123", "text", true)}
                      {vatField(group.id, group.vatForm, !!group.vatFile, "Tên nhà cung cấp", "supplierName", "Tên đơn vị bán...", "text", true)}
                      {vatField(group.id, group.vatForm, !!group.vatFile, "Mã số thuế", "supplierTaxCode", "0123456789", "text", true)}
                      {vatField(group.id, group.vatForm, !!group.vatFile, "Ngày hóa đơn", "invoiceDate", "", "date", true)}
                      {vatField(group.id, group.vatForm, !!group.vatFile, "Tổng tiền (VNĐ)", "totalAmount", "5.000.000", "number", true, true)}
                    </div>
                  </div>

                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12 text-center">STT</TableHead>
                          <TableHead className="min-w-48">Tên vật phẩm</TableHead>
                          <TableHead className="min-w-40">Danh mục</TableHead>
                          <TableHead className="min-w-36">Đối tượng</TableHead>
                          <TableHead className="min-w-36">Loại vật phẩm</TableHead>
                          <TableHead className="min-w-24">Đơn vị</TableHead>
                          <TableHead className="min-w-28">Đơn giá</TableHead>
                          <TableHead className="min-w-24">Số lượng</TableHead>
                          <TableHead className="min-w-36">Ngày hết hạn</TableHead>
                          <TableHead className="min-w-36">Ngày nhận</TableHead>
                          <TableHead className="min-w-40">Ghi chú</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rows.map((row) => {
                          const hasErrors = Object.keys(row.errors).length > 0;
                          return (
                            <TableRow key={row.id} className={cn(hasErrors && "bg-red-50/50 dark:bg-red-950/10")}>
                              <TableCell className="text-center text-xs text-muted-foreground font-mono">{row.row}</TableCell>
                              <TableCell>{renderInputCell(group.id, row, "itemName", "Tên vật phẩm")}</TableCell>
                              <TableCell>
                                {renderSelectCell(group.id, row, "categoryCode", SYSTEM_CATEGORIES.map((c) => ({ label: c.label, value: c.value })), "Chọn danh mục")}
                              </TableCell>
                              <TableCell>
                                {targetGroupOptions.length > 0
                                  ? renderSelectCell(group.id, row, "targetGroup", targetGroupOptions, "Chọn đối tượng")
                                  : renderInputCell(group.id, row, "targetGroup", "Đối tượng")}
                                {row.itemType === "Reusable" && row.targetGroup === "Rescuer" && !row.errors.targetGroup && (
                                  <p className="text-[11px] text-blue-500 mt-0.5">Mặc định chọn với loại Tái sử dụng</p>
                                )}
                              </TableCell>
                              <TableCell>
                                {itemTypeOptions.length > 0
                                  ? renderSelectCell(group.id, row, "itemType", itemTypeOptions, "Chọn loại")
                                  : renderInputCell(group.id, row, "itemType", "Loại vật phẩm")}
                              </TableCell>
                              <TableCell>{renderInputCell(group.id, row, "unit", "Đơn vị")}</TableCell>
                              <TableCell>{renderCurrencyCell(group.id, row, "unitPrice")}</TableCell>
                              <TableCell>{renderInputCell(group.id, row, "quantity", "0", "number")}</TableCell>
                              <TableCell>
                                <DatePickerInput
                                  value={row.expiredDate}
                                  onChange={(v) => updateRow(group.id, row.id, "expiredDate", v)}
                                  placeholder="Chọn ngày..."
                                />
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <DatePickerInput
                                    value={row.receivedDate}
                                    onChange={(v) => updateRow(group.id, row.id, "receivedDate", v)}
                                    placeholder="Chọn ngày..."
                                    hasError={!!row.errors.receivedDate}
                                  />
                                  {row.errors.receivedDate && (
                                    <p className="text-[11px] text-red-500">{row.errors.receivedDate}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.notes}
                                  onChange={(e) => updateRow(group.id, row.id, "notes", e.target.value)}
                                  placeholder="Ghi chú..."
                                  className="h-8 text-sm"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                  onClick={() => deleteRow(group.id, row.id)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {group.rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                              <div className="flex flex-col items-center gap-2">
                                <Trash className="h-7 w-7" weight="duotone" />
                                <p className="text-sm tracking-tighter">Chưa có vật phẩm</p>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => addRow(group.id)}>
                                    <Plus className="h-3.5 w-3.5" /> Thêm dòng
                                  </Button>
                                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => excelReviewInputRefs.current[group.id]?.click()}>
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
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                <ArrowCounterClockwise className="h-4 w-4" />
                Hủy
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSubmit}
                disabled={totalRows === 0 || importMutation.isPending || isUploading || isBusy}
              >
                {(importMutation.isPending || isUploading) ? (
                  <SpinnerGap className="h-4 w-4 animate-spin" />
                ) : (
                  <FloppyDisk className="h-4 w-4" weight="fill" />
                )}
                {isUploading ? "Đang tải PDF..." : importMutation.isPending ? "Đang nhập kho..." : "Xác nhận nhập kho"}
                {totalRows > 0 && !importMutation.isPending && !isUploading && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/20 text-xs">{totalRows}</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
