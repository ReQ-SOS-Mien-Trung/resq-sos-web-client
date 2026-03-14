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
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      return `${String(date.y).padStart(4, "0")}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }
  const str = String(val).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return str;
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

async function uploadPdfToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", "resq/invoices");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload PDF thất bại");
  const data = await res.json();
  return data.secure_url as string;
}

const EMPTY_VAT_FORM: VatFormState = {
  invoiceSerial: "",
  invoiceNumber: "",
  supplierName: "",
  supplierTaxCode: "",
  invoiceDate: "",
  totalAmount: "",
};

export default function ExcelImportRegular() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const [vatFile, setVatFile] = useState<File | null>(null);
  const [vatFileUrl, setVatFileUrl] = useState("");
  const [vatFileUploading, setVatFileUploading] = useState(false);
  const [vatParsing, setVatParsing] = useState(false);
  const [vatForm, setVatForm] = useState<VatFormState>(EMPTY_VAT_FORM);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const vatInputRef = useRef<HTMLInputElement>(null);
  const excelReviewInputRef = useRef<HTMLInputElement>(null);

  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: targetGroupsData } = useInventoryTargetGroups();
  const importMutation = useImportRegularInventory();

  const itemTypes = useMemo(() => itemTypesData ?? [], [itemTypesData]);
  const targetGroups = useMemo(() => targetGroupsData ?? [], [targetGroupsData]);

  const validateRow = useCallback((row: Omit<ImportRow, "errors">): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!row.itemName) errors.itemName = "Tên vật phẩm không được trống";
    if (!row.categoryCode) errors.categoryCode = "Danh mục không hợp lệ";
    if (!row.quantity || row.quantity <= 0) errors.quantity = "Số lượng phải > 0";
    if (row.unitPrice < 0) errors.unitPrice = "Đơn giá không hợp lệ";
    if (!row.unit) errors.unit = "Đơn vị không được trống";
    if (!row.itemType) errors.itemType = "Loại vật phẩm không được trống";
    if (!row.targetGroup) errors.targetGroup = "Đối tượng không được trống";
    if (!row.receivedDate) errors.receivedDate = "Ngày nhận không được trống";
    return errors;
  }, []);

  const handleVatFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Chỉ chấp nhận file PDF");
        return;
      }
      setVatFile(file);
      setVatFileUrl("");
      setVatForm(EMPTY_VAT_FORM);

      setVatParsing(true);
      setVatFileUploading(true);

      const [parsedFields, uploadedUrl] = await Promise.allSettled([
        parseVatPdf(file),
        uploadPdfToCloudinary(file),
      ]);

      setVatParsing(false);
      setVatFileUploading(false);

      if (parsedFields.status === "fulfilled") {
        const f = parsedFields.value;
        setVatForm((prev) => ({
          ...prev,
          invoiceSerial: f.invoiceSerial ?? prev.invoiceSerial,
          invoiceNumber: f.invoiceNumber ?? prev.invoiceNumber,
          supplierName: f.supplierName ?? prev.supplierName,
          supplierTaxCode: f.supplierTaxCode ?? prev.supplierTaxCode,
          invoiceDate: f.invoiceDate ?? prev.invoiceDate,
          totalAmount: f.totalAmount ?? prev.totalAmount,
        }));
        const filledCount = Object.values(parsedFields.value).filter(Boolean).length;
        if (filledCount > 0) {
          toast.success(`Đọc được ${filledCount}/6 trường từ PDF`);
        } else {
          toast.warning("Không đọc được thông tin từ PDF. Vui lòng điền thủ công.");
        }
      }

      if (uploadedUrl.status === "fulfilled") {
        setVatFileUrl(uploadedUrl.value);
      } else {
        toast.error("Tải PDF lên thất bại. Vui lòng thử lại.");
        setVatFile(null);
      }
    },
    [],
  );

  const handleVatInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleVatFile(file);
      e.target.value = "";
    },
    [handleVatFile],
  );

  const handleVatDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleVatFile(file);
    },
    [handleVatFile],
  );

  const removeVatFile = useCallback(() => {
    setVatFile(null);
    setVatFileUrl("");
    setVatForm(EMPTY_VAT_FORM);
  }, []);

  const updateVatForm = useCallback((field: keyof VatFormState, value: string) => {
    setVatForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const parseRowsFromSheet = useCallback(
    (jsonData: Record<string, unknown>[], offset = 0): ImportRow[] => {
      return jsonData.map((raw, idx) => {
        const rawCategory = String(raw[COL.DANHMUC] ?? "").trim();
        const categoryCode = CATEGORY_VI_MAP[rawCategory.toLowerCase()] ?? "";

        const rawTargetGroup = String(raw[COL.DOITUONG] ?? "").trim();
        const matchedTargetGroup = targetGroups.find(
          (t) => t.value.toLowerCase() === rawTargetGroup.toLowerCase() || t.key.toLowerCase() === rawTargetGroup.toLowerCase(),
        );
        const targetGroup = matchedTargetGroup?.key ?? rawTargetGroup;

        const rawItemType = String(raw[COL.LOAI] ?? "").trim();
        const matchedItemType = itemTypes.find(
          (t) => t.value.toLowerCase() === rawItemType.toLowerCase() || t.key.toLowerCase() === rawItemType.toLowerCase(),
        );
        const itemType = matchedItemType?.key ?? rawItemType;

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

  const parseExcel = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
          if (jsonData.length === 0) { toast.error("File Excel không có dữ liệu"); return; }

          const parsed = parseRowsFromSheet(jsonData);
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
          toast.error("Không thể đọc file Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [parseRowsFromSheet],
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

  const addRow = useCallback(() => {
    setRows((prev) => {
      const newRow: ImportRow = {
        id: `row-manual-${Date.now()}-${Math.random()}`,
        row: prev.length + 1,
        itemName: "",
        categoryCode: "",
        targetGroup: "",
        itemType: "",
        unit: "",
        quantity: 0,
        unitPrice: 0,
        expiredDate: "",
        receivedDate: "",
        notes: "",
        errors: {},
      };
      newRow.errors = validateRow(newRow);
      return [...prev, newRow];
    });
  }, [validateRow]);

  const handleManualEntry = useCallback(() => {
    setRows([]);
    setFileName("");
    setStep("review");
  }, []);

  const handleAppendExcel = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Chỉ chấp nhận file .xlsx"); return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
          if (jsonData.length === 0) { toast.error("File Excel không có dữ liệu"); return; }
          setRows((prev) => {
            const appended = parseRowsFromSheet(jsonData, prev.length);
            return [...prev, ...appended].map((r, i) => ({ ...r, row: i + 1 }));
          });
          setFileName(file.name);
          toast.success(`Đã thêm ${jsonData.length} dòng từ file Excel`);
        } catch { toast.error("Không thể đọc file Excel."); }
      };
      reader.readAsArrayBuffer(file);
    },
    [parseRowsFromSheet],
  );

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
    setRows((prev) => prev.filter((r) => r.id !== id).map((r, i) => ({ ...r, row: i + 1 })));
  }, []);

  const errorCount = useMemo(
    () => rows.filter((r) => Object.keys(r.errors).length > 0).length,
    [rows],
  );
  const validCount = rows.length - errorCount;
  const isBusy = vatFileUploading || vatParsing;

  const vatFormValid = useMemo(
    () =>
      !!vatForm.invoiceNumber.trim() &&
      !!vatForm.supplierName.trim() &&
      !!vatForm.invoiceDate.trim(),
    [vatForm],
  );

  const handleSubmit = useCallback(() => {
    if (rows.length === 0) { toast.error("Không có dữ liệu để nhập kho"); return; }
    if (errorCount > 0) { toast.error(`Còn ${errorCount} dòng lỗi. Vui lòng sửa trước khi nhập.`); return; }
    if (!vatFileUrl) { toast.error("Vui lòng tải lên hóa đơn đỏ VAT (PDF)"); return; }
    if (!vatForm.invoiceNumber.trim()) { toast.error("Vui lòng điền số hóa đơn"); return; }
    if (!vatForm.supplierName.trim()) { toast.error("Vui lòng điền tên nhà cung cấp"); return; }
    if (!vatForm.invoiceDate.trim()) { toast.error("Vui lòng điền ngày hóa đơn"); return; }

    const items: ImportPurchaseItem[] = rows.map((r) => ({
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
    }));

    const vatInvoice: VatInvoice = {
      invoiceSerial: vatForm.invoiceSerial.trim(),
      invoiceNumber: vatForm.invoiceNumber.trim(),
      supplierName: vatForm.supplierName.trim(),
      supplierTaxCode: vatForm.supplierTaxCode.trim(),
      invoiceDate: vatForm.invoiceDate,
      totalAmount: parseFloat(vatForm.totalAmount.replace(/[^\d.]/g, "")) || 0,
      fileUrl: vatFileUrl,
    };

    importMutation.mutate(
      { vatInvoice, items },
      {
        onSuccess: () => {
          toast.success(`Nhập kho thành công ${rows.length} vật phẩm!`);
          router.push("/dashboard/inventory");
        },
        onError: (err: any) => {
          const errorMsg = err.response?.data?.message || err.message || "Lỗi không xác định";
          toast.error(`Nhập kho thất bại: ${errorMsg}`);
        },
      },
    );
  }, [rows, errorCount, vatFileUrl, vatForm, importMutation, router]);

  const handleReset = useCallback(() => {
    setStep("upload");
    setRows([]);
    setFileName("");
    setVatFile(null);
    setVatFileUrl("");
    setVatForm(EMPTY_VAT_FORM);
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

  const itemTypeOptions = useMemo(
    () => itemTypes.map((t) => ({ label: t.value, value: t.key })),
    [itemTypes],
  );
  const targetGroupOptions = useMemo(
    () => targetGroups.map((t) => ({ label: t.value, value: t.key })),
    [targetGroups],
  );

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
            min={type === "number" ? 0 : undefined}
            value={value}
            onChange={(e) =>
              updateRow(row.id, field, type === "number" ? Number(e.target.value) : e.target.value)
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
    row: ImportRow,
    field: keyof Omit<ImportRow, "errors" | "id">,
    options: { label: string; value: string }[],
    placeholder: string,
  ) => {
    const error = row.errors[field];
    const currentValue = String(row[field] ?? "");
    return (
      <div className="space-y-1">
        <Select value={currentValue} onValueChange={(val) => updateRow(row.id, field, val)}>
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
              updateRow(row.id, field, stripped ? parseInt(stripped, 10) : 0);
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
          updateVatForm(key, val);
        }}
        placeholder={placeholder}
        className={cn(
          "h-8 text-sm",
          required && !vatForm[key].trim() && vatFileUrl && "border-red-400 focus-visible:ring-red-400",
        )}
      />
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
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-5">
                <div className="rounded-xl border bg-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-blue-600" weight="duotone" />
                    <p className="text-base tracking-tighter font-medium">Hóa đơn đỏ VAT</p>
                    <span className="text-xs text-red-500 ml-1">*</span>
                  </div>

                  {!vatFile ? (
                    <div
                      onDrop={handleVatDrop}
                      onDragOver={(e) => e.preventDefault()}
                      onClick={() => vatInputRef.current?.click()}
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
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted border">
                        <FilePdf className="h-5 w-5 text-red-500 shrink-0" weight="duotone" />
                        <p className="flex-1 text-sm tracking-tighter font-medium truncate">{vatFile.name}</p>
                        {(vatParsing || vatFileUploading) ? (
                          <SpinnerGap className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                        ) : vatFileUrl ? (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" weight="fill" />
                        ) : (
                          <WarningCircle className="h-4 w-4 text-red-500 shrink-0" weight="fill" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={removeVatFile}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {vatParsing && (
                        <p className="text-xs tracking-tighter text-blue-600 flex items-center gap-1.5">
                          <SpinnerGap className="h-3.5 w-3.5 animate-spin" />
                          Đang đọc thông tin từ PDF...
                        </p>
                      )}
                      {!vatParsing && vatFileUrl && (
                        <p className="text-xs tracking-tighter text-green-600 flex items-center gap-1.5">
                          <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                          PDF đã tải lên. Kiểm tra và chỉnh sửa các trường bên dưới nếu cần.
                        </p>
                      )}

                      {!vatParsing && (
                        <div className="grid grid-cols-2 gap-3 tracking-tighter">
                          {vatField("Ký hiệu", "invoiceSerial", "VD: AA/26E")}
                          {vatField("Số hóa đơn", "invoiceNumber", "VD: 0000123", "text", true)}
                          <div className="col-span-2">
                            {vatField("Tên nhà cung cấp", "supplierName", "Tên đơn vị bán hàng", "text", true)}
                          </div>
                          {vatField("Mã số thuế", "supplierTaxCode", "VD: 0123456789")}
                          {vatField("Ngày hóa đơn", "invoiceDate", "", "date", true)}
                          {vatField("Tổng tiền (VNĐ)", "totalAmount", "VD: 5.000.000", "number", false, true)}
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground tracking-tighter w-full justify-center"
                        onClick={() => vatInputRef.current?.click()}
                      >
                        <UploadSimple className="h-3.5 w-3.5" />
                        Đổi file PDF
                      </Button>
                    </div>
                  )}

                  <input
                    ref={vatInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleVatInput}
                    className="hidden"
                  />
                </div>

                <div className="rounded-xl border bg-card px-5 py-4">
                  <p className="text-sm font-medium mb-3 tracking-tighter text-muted-foreground">
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
              </div>

              <div className="flex flex-col gap-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex-1 border-2 border-dashed rounded-xl p-10 flex items-center justify-center cursor-pointer transition-all duration-200 min-h-64",
                    isDragging
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-muted-foreground/25 hover:border-blue-400/60 hover:bg-muted/50",
                  )}
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div
                      className={cn(
                        "h-20 w-20 rounded-2xl flex items-center justify-center transition-colors",
                        isDragging ? "bg-blue-500/15 text-blue-600" : "bg-muted text-muted-foreground",
                      )}
                    >
                      <UploadSimple className="h-10 w-10" weight="duotone" />
                    </div>
                    <div>
                      <p className="font-semibold tracking-tighter text-base mb-1">Kéo thả file Excel vào đây</p>
                      <p className="text-sm tracking-tighter text-muted-foreground">
                        hoặc{" "}
                        <span className="text-blue-600 font-medium tracking-tighter underline underline-offset-2">
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

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs tracking-tighter text-muted-foreground">hoặc</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <button
                  type="button"
                  onClick={handleManualEntry}
                  className="rounded-xl border-2 border-dashed border-muted-foreground/25 py-8 flex flex-col items-center gap-3 text-muted-foreground hover:border-blue-400/60 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all"
                >
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
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
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  {fileName
                    ? <FileXls className="h-5 w-5 text-green-600" weight="duotone" />
                    : <PencilSimple className="h-5 w-5 text-blue-600" weight="duotone" />
                  }
                </div>
                <div>
                  <p className="font-medium text-sm">{fileName || "Nhập thủ công"}</p>
                  <p className="text-xs tracking-tighter text-muted-foreground">{rows.length} dòng</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                  <CheckCircle className="h-3.5 w-3.5" weight="fill" />
                  {validCount} hợp lệ
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 text-xs font-medium">
                    <WarningCircle className="h-3.5 w-3.5" weight="fill" />
                    {errorCount} lỗi
                  </div>
                )}
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
                <Button size="sm" variant="outline" className="gap-1.5" onClick={addRow}>
                  <Plus className="h-4 w-4" />
                  Thêm dòng
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleReset}>
                  <ArrowCounterClockwise className="h-4 w-4" />
                  Nhập lại
                </Button>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border bg-card px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-blue-600" weight="duotone" />
                <p className="text-sm tracking-tighter font-medium">Thông tin hóa đơn VAT</p>
                {!vatFileUrl && (
                  <span className="text-xs text-red-500">(chưa tải PDF)</span>
                )}
                {vatFileUrl && <CheckCircle className="h-3.5 w-3.5 text-green-500" weight="fill" />}
                {vatFile && (
                  <span className="text-xs text-muted-foreground truncate max-w-48 ml-1">
                    {vatFile.name}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs ml-auto h-6 px-2 text-muted-foreground"
                  onClick={() => vatInputRef.current?.click()}
                >
                  <UploadSimple className="h-3 w-3" />
                  {vatFile ? "Đổi PDF" : "Tải PDF lên"}
                </Button>
                <input
                  ref={vatInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleVatInput}
                  className="hidden"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 tracking-tighter">
                {vatField("Ký hiệu", "invoiceSerial", "AA/26E")}
                {vatField("Số hóa đơn", "invoiceNumber", "0000123", "text", true)}
                {vatField("Tên nhà cung cấp", "supplierName", "Tên đơn vị bán...", "text", true)}
                {vatField("Mã số thuế", "supplierTaxCode", "0123456789")}
                {vatField("Ngày hóa đơn", "invoiceDate", "", "date", true)}
                {vatField("Tổng tiền (VNĐ)", "totalAmount", "5.000.000", "number", false, true)}
              </div>
              {!vatFormValid && vatFileUrl && (
                <p className="text-xs text-red-500 flex items-center gap-1.5">
                  <WarningCircle className="h-3.5 w-3.5" weight="fill" />
                  Vui lòng điền đầy đủ các trường bắt buộc: Số hóa đơn, Tên nhà cung cấp, Ngày hóa đơn
                </p>
              )}
            </div>

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
                    <TableHead className="min-w-28">Đơn giá</TableHead>
                    <TableHead className="min-w-24">Số lượng</TableHead>
                    <TableHead className="min-w-36">Ngày hết hạn</TableHead>
                    <TableHead className="min-w-36">Ngày nhận</TableHead>
                    <TableHead className="min-w-40">Ghi chú</TableHead>
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
                        <TableCell className="text-center text-xs text-muted-foreground font-mono">
                          {row.row}
                        </TableCell>
                        <TableCell>{renderInputCell(row, "itemName", "Tên vật phẩm")}</TableCell>
                        <TableCell>
                          {renderSelectCell(
                            row,
                            "categoryCode",
                            SYSTEM_CATEGORIES.map((c) => ({ label: c.label, value: c.value })),
                            "Chọn danh mục",
                          )}
                        </TableCell>
                        <TableCell>
                          {targetGroupOptions.length > 0
                            ? renderSelectCell(row, "targetGroup", targetGroupOptions, "Chọn đối tượng")
                            : renderInputCell(row, "targetGroup", "Đối tượng")}
                        </TableCell>
                        <TableCell>
                          {itemTypeOptions.length > 0
                            ? renderSelectCell(row, "itemType", itemTypeOptions, "Chọn loại")
                            : renderInputCell(row, "itemType", "Loại vật phẩm")}
                        </TableCell>
                        <TableCell>{renderInputCell(row, "unit", "Đơn vị")}</TableCell>
                        <TableCell>{renderCurrencyCell(row, "unitPrice")}</TableCell>
                        <TableCell>{renderInputCell(row, "quantity", "0", "number")}</TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={row.expiredDate}
                            onChange={(e) => updateRow(row.id, "expiredDate", e.target.value)}
                            className="h-8 text-sm"
                          />
                        </TableCell>
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
                        <TableCell>
                          <Input
                            value={row.notes}
                            onChange={(e) => updateRow(row.id, "notes", e.target.value)}
                            placeholder="Ghi chú..."
                            className="h-8 text-sm"
                          />
                        </TableCell>
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
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => excelReviewInputRef.current?.click()}
                            >
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

            <div className="flex items-center justify-between pt-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                <ArrowCounterClockwise className="h-4 w-4" />
                Hủy
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSubmit}
                disabled={rows.length === 0 || importMutation.isPending || isBusy}
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
