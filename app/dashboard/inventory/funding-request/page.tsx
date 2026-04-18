"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  ArrowLeft,
  Wallet,
  Plus,
  Package,
  Spinner,
  FileText,
  Eye,
  PaperPlaneTilt,
  ListBullets,
  WarningCircle,
  UploadSimple,
  FileXls,
  DownloadSimple,
  X,
  CheckCircle,
  Trash,
  ArrowClockwise,
  ClockCounterClockwise,
  ArrowUp,
  ArrowDown,
  Bank,
  CalendarBlank,
  FunnelSimple,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useInventoryCategories,
  useInventoryItemTypes,
  useInventoryTargetGroups,
} from "@/services/inventory/hooks";
import {
  useMyDepotFund,
  MY_DEPOT_FUND_QUERY_KEY,
  MY_DEPOT_FUND_TRANSACTIONS_QUERY_KEY,
  MY_DEPOT_ADVANCERS_QUERY_KEY,
  useMyDepotFundTransactions,
  useMyDepotAdvancers,
  useCreateInternalAdvance,
  useCreateInternalRepayment,
  useDepotFundTransactionsByFundId,
} from "@/services/depot/hooks";
import type {
  DepotFundTransaction,
  DepotFundSource,
  DepotFundReferenceType,
} from "@/services/depot/type";
import {
  useDepotFundTransactionTypes,
  useDepotFundReferenceTypes,
} from "@/services/transaction/hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
  useFundingRequests,
  useFundingRequestStatuses,
  useFundingRequestItems,
  useCreateFundingRequest,
  useDownloadFundingRequestTemplate,
} from "@/services/funding_request";
import type {
  FundingRequestEntity,
  FundingRequestStatus,
  CreateFundingRequestItem,
} from "@/services/funding_request";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Icon } from "@iconify/react";
import { AxiosError } from "axios";
import { useManagerDepot } from "@/hooks/use-manager-depot";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { vi as viLocale } from "date-fns/locale";

function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  const apiMessage = axiosError?.response?.data?.message;
  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage.trim();
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

/* ── Excel column mapping ─────────────────────────────────── */

const COL = {
  STT: "STT",
  TEN: "Tên vật phẩm",
  DANHMUC: "Danh mục",
  DOITUONG: "Đối tượng",
  LOAI: "Loại vật phẩm",
  DONVI: "Đơn vị",
  GHICHU: "Mô tả vật phẩm",
  SOLUONG: "Số lượng (*)",
  DONGIA: "Đơn giá (VNĐ)",
  THETICH: "Thể tích / đơn vị (dm3)",
  CANNANG: "Cân nặng / đơn vị (kg)",
} as const;

type FundingColumnKey = keyof typeof COL;

const COLUMN_ALIASES: Record<FundingColumnKey, string[]> = {
  STT: ["stt"],
  TEN: ["ten vat pham"],
  DANHMUC: ["danh muc"],
  DOITUONG: ["doi tuong"],
  LOAI: ["loai vat pham"],
  DONVI: ["don vi"],
  GHICHU: ["mo ta vat pham", "ghi chu", "mo ta"],
  SOLUONG: ["so luong", "so luong *", "so luong (*)"],
  DONGIA: ["don gia", "don gia vnd", "don gia (vnd)"],
  THETICH: [
    "the tich don vi dm3",
    "the tich dm3",
    "the tich / don vi dm3",
    "the tich don vi (dm3)",
    "the tich / don vi (dm3)",
  ],
  CANNANG: [
    "can nang don vi kg",
    "can nang kg",
    "can nang / don vi kg",
    "can nang don vi (kg)",
    "can nang / don vi (kg)",
  ],
};

const FALLBACK_CATEGORY_MAP: Record<string, string> = {
  "thuc pham": "Food",
  "nuoc uong": "Water",
  "y te": "Medical",
  "ve sinh ca nhan": "Hygiene",
  "quan ao": "Clothing",
  "noi tru an": "Shelter",
  "cong cu sua chua": "RepairTools",
  "thiet bi cuu ho": "RescueEquipment",
  "suoi am": "Heating",
  khac: "Others",
  food: "Food",
  water: "Water",
  medical: "Medical",
  hygiene: "Hygiene",
  clothing: "Clothing",
  shelter: "Shelter",
  repairtools: "RepairTools",
  rescueequipment: "RescueEquipment",
  heating: "Heating",
  others: "Others",
};

/* ── Status config ────────────────────────────────────────── */

const statusConfig: Record<
  FundingRequestStatus,
  { label: string; className: string; dotColor: string }
> = {
  Pending: {
    label: "Chờ duyệt",
    className:
      "bg-amber-500/8 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    dotColor: "bg-amber-500",
  },
  Approved: {
    label: "Đã duyệt",
    className:
      "bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
  },
  Rejected: {
    label: "Đã từ chối",
    className:
      "bg-rose-500/8 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
    dotColor: "bg-rose-500",
  },
};

type HistoryStatusFilter = "all" | FundingRequestStatus;

const FUND_TX_REFERENCE_TYPE_OPTIONS: Array<{
  value: DepotFundReferenceType;
  label: string;
}> = [
  {
    value: "CampaignDisbursement",
    label: "Giải ngân chiến dịch",
  },
  {
    value: "VatInvoice",
    label: "Hóa đơn VAT",
  },
];

/* ── Helpers ──────────────────────────────────────────────── */

function formatMoney(value: number | null | undefined) {
  const amount =
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatMoneyInput(value: string | number): string {
  const raw =
    typeof value === "string"
      ? value.replace(/\D/g, "")
      : String(Math.round(value));
  const n = parseInt(raw, 10);
  if (!raw || isNaN(n)) return "";
  return n.toLocaleString("vi-VN");
}

function createClientId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function isValidPhoneNumber(value: string): boolean {
  return /^0\d{9}$/.test(normalizePhoneNumber(value));
}

function getLedgerTotalBalance(funds: DepotFundSource[] | undefined): number {
  if (!funds?.length) return 0;

  return funds.reduce((sum, fund) => {
    const balance =
      typeof fund.balance === "number" && Number.isFinite(fund.balance)
        ? fund.balance
        : 0;
    return sum + balance;
  }, 0);
}

function getLatestFundUpdatedAt(
  funds: DepotFundSource[] | undefined,
): string | null {
  if (!funds?.length) return null;

  return funds.reduce<string | null>((latest, fund) => {
    if (!fund.lastUpdatedAt) return latest;
    if (!latest) return fund.lastUpdatedAt;
    return new Date(fund.lastUpdatedAt) > new Date(latest)
      ? fund.lastUpdatedAt
      : latest;
  }, null);
}

interface InternalAdvanceRowState {
  id: string;
  contributorName: string;
  phoneNumber: string;
  amount: string;
}

interface InternalRepaymentRowState {
  id: string;
  depotFundId: string;
  amount: string;
}

interface InternalLedgerContributor {
  key: string;
  contributorName: string;
  phoneNumber: string;
  outstandingAmount: number;
  totalAdvancedAmount: number;
  totalRepaidAmount: number;
  lastActivityAt: string;
  transactions: DepotFundTransaction[];
}

function createInternalAdvanceRow(): InternalAdvanceRowState {
  return {
    id: createClientId("advance"),
    contributorName: "",
    phoneNumber: "",
    amount: "",
  };
}

function createInternalRepaymentRow(
  depotFundId = "",
): InternalRepaymentRowState {
  return {
    id: createClientId("repayment"),
    depotFundId,
    amount: "",
  };
}

/** Auto-detects the real header row (skips title/note rows) and returns parsed data rows. */
function normalizeExcelText(value: unknown): string {
  return (
    String(value ?? "")
      .replace(/[Đđ]/g, "d")
      // normalize superscript digits (dm³ → dm3, m² → m2, etc.)
      .replace(/\u00B9/g, "1")
      .replace(/\u00B2/g, "2")
      .replace(/\u00B3/g, "3")
      .replace(/\u2070/g, "0")
      .replace(/\u2074/g, "4")
      .replace(/\u2075/g, "5")
      .replace(/\u2076/g, "6")
      .replace(/\u2077/g, "7")
      .replace(/\u2078/g, "8")
      .replace(/\u2079/g, "9")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
  );
}

function parseExcelNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const normalized = raw.replace(/,/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalExcelNumber(value: unknown): number | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = Number(raw.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatMeasurementNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function hasMeasurementValue(value: number | null | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value);
}

function findHeaderLayout(rows: unknown[][]): {
  headerRowIndex: number;
  columnIndexes: Partial<Record<FundingColumnKey, number>>;
} | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    if (!Array.isArray(row)) continue;

    const columnIndexes: Partial<Record<FundingColumnKey, number>> = {};

    row.forEach((cell, columnIndex) => {
      const normalizedCell = normalizeExcelText(cell);
      if (!normalizedCell) return;

      const matchedKey = (
        Object.keys(COLUMN_ALIASES) as FundingColumnKey[]
      ).find((key) => COLUMN_ALIASES[key].includes(normalizedCell));

      if (matchedKey && columnIndexes[matchedKey] === undefined) {
        columnIndexes[matchedKey] = columnIndex;
      }
    });

    if (
      columnIndexes.STT !== undefined &&
      columnIndexes.TEN !== undefined &&
      columnIndexes.DANHMUC !== undefined
    ) {
      return { headerRowIndex: rowIndex, columnIndexes };
    }
  }

  return null;
}

function getSheetRows(
  workbook: XLSX.WorkBook,
): Record<FundingColumnKey, unknown>[] {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    });
    const headerLayout = findHeaderLayout(rawRows);
    if (!headerLayout) continue;

    return rawRows
      .slice(headerLayout.headerRowIndex + 1)
      .map((row) => {
        const rowArray = Array.isArray(row) ? row : [];
        const mappedRow = {} as Record<FundingColumnKey, unknown>;

        (Object.keys(COL) as FundingColumnKey[]).forEach((key) => {
          const columnIndex = headerLayout.columnIndexes[key];
          mappedRow[key] =
            columnIndex === undefined ? "" : (rowArray[columnIndex] ?? "");
        });

        return mappedRow;
      })
      .filter((row) =>
        [row.TEN, row.DANHMUC, row.DONVI, row.SOLUONG, row.DONGIA].some(
          (value) => String(value ?? "").trim() !== "",
        ),
      );
  }

  return [];
}

function matchMetadataKey(
  rawValue: string,
  options: { key: string; value: string }[],
): string {
  const parts = rawValue
    .split(/\s*-\s*/)
    .map((part) => normalizeExcelText(part))
    .filter(Boolean);

  const matched = options.find((option) => {
    const normalizedKey = normalizeExcelText(option.key);
    const normalizedValue = normalizeExcelText(option.value);
    return parts.some(
      (part) => part === normalizedKey || part === normalizedValue,
    );
  });

  return matched?.key ?? rawValue.trim();
}

function matchCategoryCode(
  rawCategory: string,
  categories: { key: string; value: string }[],
): string {
  const matched = matchMetadataKey(rawCategory, categories);
  if (matched && matched !== rawCategory.trim()) {
    return matched;
  }

  const parts = rawCategory
    .split(/\s*-\s*/)
    .map((part) => normalizeExcelText(part))
    .filter(Boolean);

  const fallback = parts.find((part) => FALLBACK_CATEGORY_MAP[part]);
  return fallback ? FALLBACK_CATEGORY_MAP[fallback] : "";
}

type TabType = "create" | "history" | "ledger" | "funds";
type LedgerMode = "advance" | "repayment";

/* ── Import row with validation ───────────────────────────── */

interface ImportRow extends CreateFundingRequestItem {
  id: string;
  errors: Record<string, string>;
}

function validateRow(row: Omit<ImportRow, "errors">): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!row.itemName.trim()) errors.itemName = "Bắt buộc";
  if (!row.categoryCode) errors.categoryCode = "Bắt buộc";
  if (!row.unit.trim()) errors.unit = "Bắt buộc";
  if (!row.quantity || row.quantity <= 0) errors.quantity = "Phải > 0";
  if (!row.unitPrice || row.unitPrice <= 0) errors.unitPrice = "Phải > 0";
  if (row.volumePerUnit === undefined) {
    errors.volumePerUnit = "Bắt buộc";
  } else if (row.volumePerUnit < 0) {
    errors.volumePerUnit = "Không được âm";
  }
  if (row.weightPerUnit === undefined) {
    errors.weightPerUnit = "Bắt buộc";
  } else if (row.weightPerUnit < 0) {
    errors.weightPerUnit = "Không được âm";
  }
  return errors;
}

function createEmptyRow(rowNum: number): ImportRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    row: rowNum,
    itemName: "",
    categoryCode: "",
    unit: "",
    quantity: 0,
    unitPrice: 0,
    totalPrice: 0,
    itemType: "",
    targetGroup: "",
    notes: "",
    volumePerUnit: undefined,
    weightPerUnit: undefined,
    errors: {
      itemName: "Bắt buộc",
      categoryCode: "Bắt buộc",
      unit: "Bắt buộc",
      quantity: "Phải > 0",
      unitPrice: "Phải > 0",
      volumePerUnit: "Bắt buộc",
      weightPerUnit: "Bắt buộc",
    },
  };
}

/* ── Main Page ────────────────────────────────────────────── */

export default function FundingRequestPage() {
  const router = useRouter();
  const { selectedDepot, selectedDepotId } = useManagerDepot();
  const depotId = selectedDepotId ?? 0;
  const depotName = selectedDepot?.depotName ?? "Kho";

  // ── Categories from API ──
  const { data: categoriesData } = useInventoryCategories();
  const { data: itemTypesData } = useInventoryItemTypes();
  const { data: targetGroupsData } = useInventoryTargetGroups();
  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);
  const itemTypes = useMemo(() => itemTypesData ?? [], [itemTypesData]);
  const targetGroups = useMemo(
    () => targetGroupsData ?? [],
    [targetGroupsData],
  );
  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: c.key,
        label: c.value,
      })),
    [categories],
  );
  const categoryMap = useMemo(
    () =>
      Object.fromEntries(categories.map((c) => [c.key, c.value])) as Record<
        string,
        string
      >,
    [categories],
  );
  const itemTypeOptions = useMemo(
    () =>
      itemTypes.map((itemType) => ({
        value: itemType.key,
        label: itemType.value,
      })),
    [itemTypes],
  );
  const targetGroupOptions = useMemo(
    () =>
      targetGroups.map((targetGroup) => ({
        value: targetGroup.key,
        label: targetGroup.value,
      })),
    [targetGroups],
  );

  // ── My fund balance ──
  const { data: myFund, isLoading: loadingFund } = useMyDepotFund(depotId, {
    enabled: Boolean(depotId),
  });
  const queryClient = useQueryClient();
  const { data: txTypesMeta = [] } = useDepotFundTransactionTypes();
  const { data: refTypesMeta = [] } = useDepotFundReferenceTypes();
  const txTypeMap = useMemo(
    () => Object.fromEntries(txTypesMeta.map((m) => [m.key, m.value])),
    [txTypesMeta],
  );
  const refTypeMap = useMemo(
    () => Object.fromEntries(refTypesMeta.map((m) => [m.key, m.value])),
    [refTypesMeta],
  );
  const {
    mutate: submitInternalAdvance,
    isPending: isSubmittingInternalAdvance,
  } = useCreateInternalAdvance();
  const {
    mutate: submitInternalRepayment,
    isPending: isSubmittingInternalRepayment,
  } = useCreateInternalRepayment();

  const fundSources = useMemo(() => myFund?.funds ?? [], [myFund?.funds]);
  const totalFundBalance = useMemo(
    () => getLedgerTotalBalance(fundSources),
    [fundSources],
  );
  const latestFundUpdatedAt = useMemo(
    () => getLatestFundUpdatedAt(fundSources),
    [fundSources],
  );
  const remainingAdvanceHeadroom = useMemo(() => {
    const advanceLimit = myFund?.advanceLimit ?? 0;
    const outstandingAdvanceAmount = myFund?.outstandingAdvanceAmount ?? 0;
    return Math.max(advanceLimit - outstandingAdvanceAmount, 0);
  }, [myFund?.advanceLimit, myFund?.outstandingAdvanceAmount]);

  // ── Quỹ kho (fund transactions by fundId) state ──
  const [selectedFundId, setSelectedFundId] = useState<number | null>(null);
  const [fundTxPage, setFundTxPage] = useState(1);
  const [fundTxPageSize, setFundTxPageSize] = useState(10);
  const [fundTxSearch, setFundTxSearch] = useState("");
  const [fundTxSearchInput, setFundTxSearchInput] = useState("");
  const [fundTxFromDate, setFundTxFromDate] = useState<Date | undefined>(
    undefined,
  );
  const [fundTxToDate, setFundTxToDate] = useState<Date | undefined>(undefined);
  const [fundTxFromDateOpen, setFundTxFromDateOpen] = useState(false);
  const [fundTxToDateOpen, setFundTxToDateOpen] = useState(false);
  const [fundTxMinAmount, setFundTxMinAmount] = useState("");
  const [fundTxMaxAmount, setFundTxMaxAmount] = useState("");
  const [fundTxReferenceTypes, setFundTxReferenceTypes] = useState<
    DepotFundReferenceType[]
  >([]);
  const [fundTxAmountError, setFundTxAmountError] = useState("");
  const [fundTxDateError, setFundTxDateError] = useState("");

  const fundTxParams = useMemo(
    () => ({
      depotId,
      pageNumber: fundTxPage,
      pageSize: fundTxPageSize,
      search: fundTxSearch || undefined,
      fromDate: fundTxFromDate
        ? format(fundTxFromDate, "yyyy-MM-dd")
        : undefined,
      toDate: fundTxToDate ? format(fundTxToDate, "yyyy-MM-dd") : undefined,
      minAmount: fundTxMinAmount ? Number(fundTxMinAmount) : undefined,
      maxAmount: fundTxMaxAmount ? Number(fundTxMaxAmount) : undefined,
      referenceTypes:
        fundTxReferenceTypes.length > 0 ? fundTxReferenceTypes : undefined,
    }),
    [
      depotId,
      fundTxPage,
      fundTxPageSize,
      fundTxSearch,
      fundTxFromDate,
      fundTxToDate,
      fundTxMinAmount,
      fundTxMaxAmount,
      fundTxReferenceTypes,
    ],
  );

  function handleFundTxApplyFilters() {
    // validate date
    if (fundTxFromDate && fundTxToDate && fundTxFromDate > fundTxToDate) {
      setFundTxDateError("Ngày bắt đầu không được sau ngày kết thúc");
      return;
    }
    setFundTxDateError("");
    // validate amount
    const min = fundTxMinAmount ? Number(fundTxMinAmount) : undefined;
    const max = fundTxMaxAmount ? Number(fundTxMaxAmount) : undefined;
    if (min !== undefined && max !== undefined && min > max) {
      setFundTxAmountError("Số tiền tối thiểu không được lớn hơn tối đa");
      return;
    }
    setFundTxAmountError("");
    setFundTxSearch(fundTxSearchInput);
    setFundTxPage(1);
  }

  function handleFundTxResetFilters() {
    setFundTxSearch("");
    setFundTxSearchInput("");
    setFundTxFromDate(undefined);
    setFundTxToDate(undefined);
    setFundTxMinAmount("");
    setFundTxMaxAmount("");
    setFundTxReferenceTypes([]);
    setFundTxAmountError("");
    setFundTxDateError("");
    setFundTxPage(1);
  }

  const selectedFundTxReferenceType =
    fundTxReferenceTypes.length === 1 ? fundTxReferenceTypes[0] : "all";

  const [activeTab, setActiveTab] = useState<TabType>("create");
  const [ledgerMode, setLedgerMode] = useState<LedgerMode>("advance");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [selectedLedgerContributorKey, setSelectedLedgerContributorKey] =
    useState("");
  const [selectedAdvanceFundId, setSelectedAdvanceFundId] = useState("");
  const [advanceRows, setAdvanceRows] = useState<InternalAdvanceRowState[]>([
    createInternalAdvanceRow(),
  ]);
  const [repaymentRows, setRepaymentRows] = useState<
    InternalRepaymentRowState[]
  >([createInternalRepaymentRow()]);
  const [selectedRepaymentContributorKey, setSelectedRepaymentContributorKey] =
    useState("");

  /* ── Advancers pagination state ─── */
  const [advancersPage, setAdvancersPage] = useState(1);
  const [advancersPageSize, setAdvancersPageSize] = useState(10);

  const { data: advancersData, isLoading: loadingAdvancers } =
    useMyDepotAdvancers(
      { depotId, pageNumber: advancersPage, pageSize: advancersPageSize },
      { enabled: activeTab === "ledger" && Boolean(depotId) },
    );

  const { data: fundTxData, isLoading: loadingFundTx } =
    useDepotFundTransactionsByFundId(
      selectedFundId ?? undefined,
      fundTxParams,
      { enabled: activeTab === "funds" && !!selectedFundId && !!depotId },
    );

  const ledgerContributors = useMemo(() => {
    return (advancersData?.items ?? []).map(
      (item): InternalLedgerContributor => {
        const key = `${item.contributorName.toLowerCase()}::${normalizePhoneNumber(item.contributorPhoneNumber ?? "")}`;
        return {
          key,
          contributorName: item.contributorName || "Chưa rõ người ứng",
          phoneNumber: normalizePhoneNumber(item.contributorPhoneNumber ?? ""),
          outstandingAmount: item.outstandingAmount,
          totalAdvancedAmount: item.totalAdvancedAmount,
          totalRepaidAmount: item.totalRepaidAmount,
          lastActivityAt: "",
          transactions: [],
        };
      },
    );
  }, [advancersData]);

  /* ── All advancers for repayment dropdown (no pagination) ─── */
  const { data: allAdvancersData } = useMyDepotAdvancers(
    { depotId, pageNumber: 1, pageSize: 100 },
    { enabled: activeTab === "ledger" && Boolean(depotId) },
  );

  const repaymentAdvancers = useMemo(() => {
    return (allAdvancersData?.items ?? [])
      .filter((item) => item.outstandingAmount > 0)
      .map((item) => {
        const key = `${item.contributorName.toLowerCase()}::${normalizePhoneNumber(item.contributorPhoneNumber ?? "")}`;
        return {
          key,
          contributorName: item.contributorName || "Chưa rõ",
          phoneNumber: normalizePhoneNumber(item.contributorPhoneNumber ?? ""),
          outstandingAmount: item.outstandingAmount,
          totalAdvancedAmount: item.totalAdvancedAmount,
          totalRepaidAmount: item.totalRepaidAmount,
        };
      });
  }, [allAdvancersData]);

  const selectedRepaymentContributor = useMemo(
    () =>
      repaymentAdvancers.find(
        (c) => c.key === selectedRepaymentContributorKey,
      ) ?? null,
    [repaymentAdvancers, selectedRepaymentContributorKey],
  );

  const { isLoading: loadingLedgerTx } = useMyDepotFundTransactions(
    { depotId, pageNumber: 1, pageSize: 500 },
    { enabled: activeTab === "ledger" && Boolean(depotId) },
  );

  const filteredLedgerContributors = useMemo(() => {
    const keyword = ledgerSearch.trim().toLowerCase();
    if (!keyword) return ledgerContributors;

    return ledgerContributors.filter(
      (item) =>
        item.contributorName.toLowerCase().includes(keyword) ||
        item.phoneNumber.includes(keyword),
    );
  }, [ledgerContributors, ledgerSearch]);
  const defaultFundSourceId = fundSources[0] ? String(fundSources[0].id) : "";
  const effectiveAdvanceFundId =
    selectedAdvanceFundId &&
    fundSources.some((fund) => String(fund.id) === selectedAdvanceFundId)
      ? selectedAdvanceFundId
      : defaultFundSourceId;
  const effectiveSelectedLedgerContributorKey = filteredLedgerContributors.some(
    (item) => item.key === selectedLedgerContributorKey,
  )
    ? selectedLedgerContributorKey
    : (filteredLedgerContributors[0]?.key ?? "");
  const selectedLedgerContributor = useMemo(
    () =>
      filteredLedgerContributors.find(
        (item) => item.key === effectiveSelectedLedgerContributorKey,
      ) ??
      ledgerContributors.find(
        (item) => item.key === effectiveSelectedLedgerContributorKey,
      ) ??
      null,
    [
      effectiveSelectedLedgerContributorKey,
      filteredLedgerContributors,
      ledgerContributors,
    ],
  );
  const selectedAdvanceFund = useMemo(
    () =>
      fundSources.find((fund) => String(fund.id) === effectiveAdvanceFundId) ??
      null,
    [effectiveAdvanceFundId, fundSources],
  );
  const advanceTotal = useMemo(
    () =>
      advanceRows.reduce((sum, row) => {
        const amount = Number(row.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [advanceRows],
  );
  const repaymentTotal = useMemo(
    () =>
      repaymentRows.reduce((sum, row) => {
        const amount = Number(row.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [repaymentRows],
  );
  const advanceCapacity = useMemo(() => {
    const selectedFundBalance =
      selectedAdvanceFund &&
      typeof selectedAdvanceFund.balance === "number" &&
      Number.isFinite(selectedAdvanceFund.balance)
        ? selectedAdvanceFund.balance
        : 0;
    return selectedFundBalance + remainingAdvanceHeadroom;
  }, [remainingAdvanceHeadroom, selectedAdvanceFund]);
  const prefersReducedMotion = useReducedMotion();

  const ledgerShellMotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0, y: 20, scale: 0.985 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -12, scale: 0.992 },
        transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
      };
  const ledgerLeftPageMotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0.2, rotateY: -92, x: 58, scale: 0.985 },
        animate: { opacity: 1, rotateY: 0, x: 0, scale: 1 },
        exit: { opacity: 0, rotateY: -18, x: -24, scale: 0.992 },
        transition: {
          duration: 0.82,
          delay: 0.06,
          ease: [0.16, 1, 0.3, 1] as const,
        },
      };
  const ledgerRightPageMotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0.2, rotateY: 92, x: -58, scale: 0.985 },
        animate: { opacity: 1, rotateY: 0, x: 0, scale: 1 },
        exit: { opacity: 0, rotateY: 18, x: 24, scale: 0.992 },
        transition: {
          duration: 0.82,
          delay: 0.1,
          ease: [0.16, 1, 0.3, 1] as const,
        },
      };
  const ledgerBinderMotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0, scaleY: 0.74, y: 20 },
        animate: { opacity: 1, scaleY: 1, y: 0 },
        exit: { opacity: 0, scaleY: 0.86, y: -12 },
        transition: {
          duration: 0.48,
          delay: 0.28,
          ease: [0.16, 1, 0.3, 1] as const,
        },
      };

  // ── Create form state ──
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([createEmptyRow(1)]);
  const [excelFileName, setExcelFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [inputMode, setInputMode] = useState<"excel" | "manual">("excel");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── History ──
  const [histPage, setHistPage] = useState(1);
  const [histPageSize, setHistPageSize] = useState(10);
  const [histStatusFilter, setHistStatusFilter] =
    useState<HistoryStatusFilter>("all");
  const { data: fundingRequestStatusesData } = useFundingRequestStatuses({
    enabled: activeTab === "history",
  });
  const historyStatusOptions = useMemo(() => {
    const apiStatuses = (fundingRequestStatusesData ?? []).filter(
      (status): status is FundingRequestStatus => status in statusConfig,
    );
    const statuses =
      apiStatuses.length > 0
        ? apiStatuses
        : (Object.keys(statusConfig) as FundingRequestStatus[]);

    return [
      { value: "all" as const, label: "Tất cả" },
      ...statuses.map((status) => ({
        value: status,
        label: statusConfig[status].label,
      })),
    ];
  }, [fundingRequestStatusesData]);
  const { data: requestsData, isLoading: loadingRequests } = useFundingRequests(
    {
      params: {
        pageNumber: histPage,
        pageSize: histPageSize,
        depotId: depotId || undefined,
        depotIds: depotId ? [depotId] : undefined,
        statuses: histStatusFilter === "all" ? undefined : [histStatusFilter],
      },
      enabled: activeTab === "history" && Boolean(depotId),
    },
  );
  const requests = useMemo(() => requestsData?.items ?? [], [requestsData]);

  // Detail dialog
  const [detailItem, setDetailItem] = useState<FundingRequestEntity | null>(
    null,
  );

  const { data: detailItemsData, isLoading: loadingDetailItems } =
    useFundingRequestItems({
      fundingRequestId: detailItem?.id,
      params: { pageNumber: 1, pageSize: 200 },
      enabled: !!detailItem?.id,
    });

  const { mutate: createRequest, isPending } = useCreateFundingRequest();
  const { mutateAsync: downloadTemplate, isPending: isDownloadingTemplate } =
    useDownloadFundingRequestTemplate();

  const handleRefreshFundLedger = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: MY_DEPOT_FUND_QUERY_KEY });
    queryClient.invalidateQueries({
      queryKey: MY_DEPOT_FUND_TRANSACTIONS_QUERY_KEY,
    });
    queryClient.invalidateQueries({
      queryKey: MY_DEPOT_ADVANCERS_QUERY_KEY,
    });
  }, [queryClient]);

  const updateAdvanceRow = useCallback(
    (rowId: string, field: keyof InternalAdvanceRowState, value: string) => {
      setAdvanceRows((currentRows) =>
        currentRows.map((row) => {
          if (row.id !== rowId) return row;

          if (field === "phoneNumber") {
            return {
              ...row,
              phoneNumber: normalizePhoneNumber(value),
            };
          }

          if (field === "amount") {
            return {
              ...row,
              amount: value.replace(/\D/g, ""),
            };
          }

          return {
            ...row,
            [field]: value,
          };
        }),
      );
    },
    [],
  );

  const updateRepaymentRow = useCallback(
    (rowId: string, field: keyof InternalRepaymentRowState, value: string) => {
      setRepaymentRows((currentRows) =>
        currentRows.map((row) =>
          row.id === rowId
            ? {
                ...row,
                [field]: field === "amount" ? value.replace(/\D/g, "") : value,
              }
            : row,
        ),
      );
    },
    [],
  );

  const addAdvanceRow = useCallback(() => {
    setAdvanceRows((currentRows) => [
      ...currentRows,
      createInternalAdvanceRow(),
    ]);
  }, []);

  const removeAdvanceRow = useCallback((rowId: string) => {
    setAdvanceRows((currentRows) =>
      currentRows.length === 1
        ? currentRows
        : currentRows.filter((row) => row.id !== rowId),
    );
  }, []);

  const addRepaymentRow = useCallback(() => {
    setRepaymentRows((currentRows) => [
      ...currentRows,
      createInternalRepaymentRow(defaultFundSourceId),
    ]);
  }, [defaultFundSourceId]);

  const removeRepaymentRow = useCallback((rowId: string) => {
    setRepaymentRows((currentRows) =>
      currentRows.length === 1
        ? currentRows
        : currentRows.filter((row) => row.id !== rowId),
    );
  }, []);

  const handleSubmitInternalAdvance = useCallback(() => {
    if (!effectiveAdvanceFundId) {
      toast.error("Vui lòng chọn quỹ nguồn để ứng tiền.");
      return;
    }

    const filledRows = advanceRows.filter(
      (row) =>
        row.contributorName.trim() ||
        row.phoneNumber.trim() ||
        row.amount.trim(),
    );

    if (filledRows.length === 0) {
      toast.error("Vui lòng nhập ít nhất một dòng ứng tiền.");
      return;
    }

    for (const [index, row] of filledRows.entries()) {
      if (!row.contributorName.trim()) {
        toast.error(`Dòng ${index + 1}: vui lòng nhập tên người ứng.`);
        return;
      }
      if (!isValidPhoneNumber(row.phoneNumber)) {
        toast.error(
          `Dòng ${index + 1}: số điện thoại phải bắt đầu bằng 0 và đủ 10 số.`,
        );
        return;
      }
      if (!row.amount.trim() || Number(row.amount) <= 0) {
        toast.error(`Dòng ${index + 1}: số tiền ứng phải lớn hơn 0.`);
        return;
      }
    }

    submitInternalAdvance(
      {
        depotFundId: Number(effectiveAdvanceFundId),
        payload: filledRows.map((row) => ({
          contributorName: row.contributorName.trim(),
          phoneNumber: normalizePhoneNumber(row.phoneNumber),
          amount: Number(row.amount),
        })),
      },
      {
        onSuccess: () => {
          toast.success("Đã ghi nhận phiếu ứng tiền nội bộ.");
          setAdvanceRows([createInternalAdvanceRow()]);
          setLedgerMode("advance");
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(
              error,
              "Không thể ghi nhận phiếu ứng tiền. Vui lòng thử lại.",
            ),
          );
        },
      },
    );
  }, [advanceRows, effectiveAdvanceFundId, submitInternalAdvance]);

  const handleSubmitInternalRepayment = useCallback(() => {
    if (!selectedRepaymentContributor) {
      toast.error("Vui lòng chọn người chi hộ để quyết toán.");
      return;
    }

    const filledRows = repaymentRows.filter(
      (row) => row.depotFundId.trim() || row.amount.trim(),
    );

    if (filledRows.length === 0) {
      toast.error("Vui lòng nhập ít nhất một khoản quyết toán.");
      return;
    }

    const repaymentsByFund = new Map<number, number>();

    for (const [index, row] of filledRows.entries()) {
      const resolvedDepotFundId =
        row.depotFundId.trim() &&
        fundSources.some((fund) => String(fund.id) === row.depotFundId)
          ? row.depotFundId
          : defaultFundSourceId;

      if (!resolvedDepotFundId) {
        toast.error(`Dòng ${index + 1}: vui lòng chọn quỹ nhận hoàn.`);
        return;
      }
      if (!row.amount.trim() || Number(row.amount) <= 0) {
        toast.error(`Dòng ${index + 1}: số tiền hoàn phải lớn hơn 0.`);
        return;
      }

      const depotFundId = Number(resolvedDepotFundId);
      repaymentsByFund.set(
        depotFundId,
        (repaymentsByFund.get(depotFundId) ?? 0) + Number(row.amount),
      );
    }

    const totalRepayment = Array.from(repaymentsByFund.values()).reduce(
      (sum, amount) => sum + amount,
      0,
    );

    if (totalRepayment > selectedRepaymentContributor.outstandingAmount) {
      toast.error(
        "Tổng tiền hoàn đang vượt dư nợ hiện tại của người được chọn.",
      );
      return;
    }

    submitInternalRepayment(
      {
        contributorName: selectedRepaymentContributor.contributorName,
        phoneNumber: selectedRepaymentContributor.phoneNumber,
        repayments: Array.from(repaymentsByFund.entries()).map(
          ([depotFundId, amount]) => ({
            depotFundId,
            amount,
          }),
        ),
      },
      {
        onSuccess: () => {
          toast.success("Đã ghi nhận quyết toán nội bộ.");
          setRepaymentRows([createInternalRepaymentRow(defaultFundSourceId)]);
          setSelectedRepaymentContributorKey("");
          setLedgerMode("repayment");
        },
        onError: (error) => {
          toast.error(
            getApiErrorMessage(
              error,
              "Không thể ghi nhận quyết toán. Vui lòng thử lại.",
            ),
          );
        },
      },
    );
  }, [
    defaultFundSourceId,
    fundSources,
    repaymentRows,
    selectedRepaymentContributor,
    submitInternalRepayment,
  ]);

  /* ── Excel parsing ──────────────────────────────────────── */

  const parseExcel = useCallback(
    (file: File, append = false) => {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Chỉ chấp nhận file .xlsx hoặc .xls");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const jsonData = getSheetRows(workbook);
          if (jsonData.length === 0) {
            toast.error("File Excel không có dữ liệu");
            return;
          }

          setRows((prev) => {
            const offset = append ? prev.length : 0;
            const parsed: ImportRow[] = jsonData.map((raw, idx) => {
              const rawCategory = String(raw.DANHMUC ?? "").trim();
              const categoryCode = matchCategoryCode(rawCategory, categories);
              const rawItemType = String(raw.LOAI ?? "").trim();
              const itemType = matchMetadataKey(rawItemType, itemTypes);
              const isReusable =
                normalizeExcelText(itemType) === "reusable" ||
                normalizeExcelText(rawItemType) === "tai su dung";
              const rawTargetGroup = String(raw.DOITUONG ?? "").trim();
              const targetGroup = isReusable
                ? "Rescuer"
                : matchMetadataKey(rawTargetGroup, targetGroups);

              const rowData: Omit<ImportRow, "errors"> = {
                id: `row-${offset + idx}-${Date.now()}`,
                row: offset + idx + 1,
                itemName: String(raw.TEN ?? "").trim(),
                categoryCode,
                unit: String(raw.DONVI ?? "").trim(),
                quantity: parseExcelNumber(raw.SOLUONG),
                unitPrice: parseExcelNumber(raw.DONGIA),
                totalPrice: 0,
                itemType,
                targetGroup,
                notes: String(raw.GHICHU ?? "").trim(),
                volumePerUnit: parseOptionalExcelNumber(raw.THETICH),
                weightPerUnit: parseOptionalExcelNumber(raw.CANNANG),
              };
              rowData.totalPrice = rowData.quantity * rowData.unitPrice;
              return { ...rowData, errors: validateRow(rowData) };
            });

            const newRows = append
              ? [...prev, ...parsed].map((r, i) => ({
                  ...r,
                  row: i + 1,
                }))
              : parsed;
            return newRows;
          });

          setExcelFileName(file.name);
          setInputMode("manual");
          toast.success(
            append
              ? `Đã thêm ${jsonData.length} dòng từ Excel`
              : `Đọc ${jsonData.length} dòng thành công`,
          );
        } catch {
          toast.error("Không thể đọc file Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [categories, itemTypes, targetGroups],
  );

  /* ── Row management ─────────────────────────────────────── */

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow(prev.length + 1)]);
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    setRows((prev) => {
      if (prev.length <= 1) {
        toast.error("Phải có ít nhất 1 vật phẩm");
        return prev;
      }
      return prev
        .filter((r) => r.id !== rowId)
        .map((r, i) => ({ ...r, row: i + 1 }));
    });
  }, []);

  const updateRow = useCallback(
    (
      rowId: string,
      field: keyof CreateFundingRequestItem,
      value: string | number | undefined,
    ) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          const updated = { ...r, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            updated.totalPrice = updated.quantity * updated.unitPrice;
          }
          updated.errors = validateRow(updated);
          return updated;
        }),
      );
    },
    [],
  );

  const handleReset = useCallback(() => {
    setRows([createEmptyRow(1)]);
    setExcelFileName("");
    setInputMode("excel");
  }, []);

  /* ── Download template ──────────────────────────────────── */

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

  /* ── Computed ────────────────────────────────────────────── */

  // A row is "empty" (untouched) if user hasn't filled anything
  const filledRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          !(
            r.itemName.trim() === "" &&
            r.categoryCode === "" &&
            r.unit.trim() === "" &&
            r.quantity === 0 &&
            r.unitPrice === 0 &&
            r.volumePerUnit === undefined &&
            r.weightPerUnit === undefined
          ),
      ),
    [rows],
  );

  const totalAmount = useMemo(
    () => filledRows.reduce((sum, r) => sum + r.totalPrice, 0),
    [filledRows],
  );

  const totalErrors = useMemo(
    () => filledRows.filter((r) => Object.keys(r.errors).length > 0).length,
    [filledRows],
  );

  const validRows = filledRows.length - totalErrors;

  const canSubmit =
    description.trim() !== "" && filledRows.length > 0 && totalErrors === 0;

  /* ── Submit ─────────────────────────────────────────────── */

  const handleSubmit = () => {
    if (description.trim() === "") {
      toast.error("Vui lòng nhập mô tả yêu cầu");
      return;
    }
    if (filledRows.length === 0) {
      toast.error("Vui lòng nhập ít nhất 1 vật phẩm");
      return;
    }
    if (totalErrors > 0) {
      toast.error(
        `Còn ${totalErrors} dòng có lỗi. Vui lòng sửa trước khi gửi.`,
      );
      return;
    }
    const items: CreateFundingRequestItem[] = filledRows.map((r) => ({
      row: r.row,
      itemName: r.itemName,
      categoryCode: r.categoryCode,
      unit: r.unit,
      quantity: r.quantity,
      unitPrice: r.unitPrice,
      totalPrice: r.totalPrice,
      itemType: r.itemType,
      targetGroup: r.targetGroup,
      notes: r.notes,
      description: r.notes,
      volumePerUnit: r.volumePerUnit,
      weightPerUnit: r.weightPerUnit,
    }));
    createRequest(
      { depotId, description: description.trim(), items },
      {
        onSuccess: () => {
          toast.success("Gửi yêu cầu cấp quỹ thành công!");
          setDescription("");
          handleReset();
          setActiveTab("history");
        },
        onError: (error) =>
          toast.error(
            getApiErrorMessage(
              error,
              "Gửi yêu cầu thất bại. Vui lòng thử lại.",
            ),
          ),
      },
    );
  };

  /* ── Render helpers for table cells ─────────────────────── */

  const renderInputCell = (
    row: ImportRow,
    field: keyof CreateFundingRequestItem,
    placeholder: string,
    type: "text" | "number" = "text",
  ) => {
    const error = row.errors[field];
    const rawValue = row[field];
    const value = type === "number" ? rawValue || "" : String(rawValue ?? "");
    return (
      <div className="space-y-0.5">
        <Input
          type={type}
          min={type === "number" ? 0 : undefined}
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
            error && "border-red-400 focus-visible:ring-red-400",
          )}
        />
        {error && (
          <p className="text-[10px] text-red-500 leading-tight">{error}</p>
        )}
      </div>
    );
  };

  const renderCurrencyCell = (
    row: ImportRow,
    field: keyof CreateFundingRequestItem,
  ) => {
    const error = row.errors[field];
    const rawValue = row[field] as number;
    return (
      <div className="space-y-0.5">
        <Input
          type="text"
          inputMode="numeric"
          value={rawValue > 0 ? formatMoneyInput(rawValue) : ""}
          onChange={(e) => {
            const stripped = e.target.value
              .replace(/\./g, "")
              .replace(/[^\d]/g, "");
            updateRow(row.id, field, stripped ? parseInt(stripped, 10) : 0);
          }}
          placeholder="0"
          className={cn(
            "h-8 text-sm",
            error && "border-red-400 focus-visible:ring-red-400",
          )}
        />
        {error && (
          <p className="text-[10px] text-red-500 leading-tight">{error}</p>
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
      <div className="space-y-0.5">
        <Input
          type="number"
          lang="en-US"
          step="any"
          min={0}
          value={rawValue ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            updateRow(row.id, field, val === "" ? undefined : parseFloat(val));
          }}
          placeholder={placeholder}
          className={cn(
            "h-8 text-sm",
            error && "border-red-400 focus-visible:ring-red-400",
          )}
        />
        {error && (
          <p className="text-[10px] text-red-500 leading-tight">{error}</p>
        )}
      </div>
    );
  };

  const renderSelectCell = (
    row: ImportRow,
    field: keyof CreateFundingRequestItem,
    options: { label: string; value: string }[],
    placeholder: string,
  ) => {
    const error = row.errors[field];
    const currentValue = String(row[field] ?? "");
    return (
      <div className="space-y-0.5">
        <Select
          value={currentValue}
          onValueChange={(val) => updateRow(row.id, field, val)}
        >
          <SelectTrigger
            className={cn("h-8 text-sm", error && "border-red-400")}
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
          <p className="text-[10px] text-red-500 leading-tight">{error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-full mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-start justify-between"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/inventory")}
              className="gap-1.5 text-muted-foreground mb-3 -ml-2"
            >
              <ArrowLeft size={14} />
              Quay lại kho
            </Button>
            <div className="flex items-center gap-2.5 mb-1">
              <Wallet size={20} weight="bold" className="text-emerald-600" />
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {depotName}
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Quản lý quỹ kho
            </h1>
            <p className="text-base tracking-tighter text-muted-foreground mt-1.5">
              Tạo yêu cầu cấp quỹ, quản lý ứng tiền và quyết toán, xem biến động
              quỹ kho.
            </p>
          </div>
          {activeTab === "create" && (
            <Button
              variant="default"
              size="sm"
              className="fixed top-4 right-4 sm:top-5 sm:right-6 z-50 gap-2 tracking-tighter shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isDownloadingTemplate}
              onClick={handleDownloadTemplate}
            >
              {isDownloadingTemplate ? (
                <Spinner size={14} className="animate-spin" />
              ) : (
                <DownloadSimple size={14} />
              )}
              {isDownloadingTemplate ? "Đang tải file mẫu..." : "Tải file mẫu"}
            </Button>
          )}
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex gap-1 bg-muted/40 rounded-lg p-1 w-fit"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        >
          <button
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium tracking-tighter rounded-md transition-colors ${
              activeTab === "create"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PaperPlaneTilt size={20} />
            Tạo yêu cầu
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium tracking-tighter rounded-md transition-colors ${
              activeTab === "history"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListBullets size={20} />
            Lịch sử yêu cầu cấp quỹ
            {requests.length > 0 && (
              <Badge className="h-4.5 px-1.5 text-sm rounded-full bg-primary text-primary-foreground ml-1">
                {requests.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab("funds")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium tracking-tighter rounded-md transition-colors ${
              activeTab === "funds"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bank size={20} />
            Quỹ kho
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium tracking-tighter rounded-md transition-colors ${
              activeTab === "ledger"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon
              icon="healthicons:i-note-action-outline"
              width="24"
              height="24"
            />
            Sổ quản lý quyết toán
            {(advancersData?.totalCount ?? 0) > 0 && (
              <Badge className="h-4.5 px-1.5 text-sm rounded-full bg-primary text-primary-foreground ml-1">
                {advancersData?.totalCount}
              </Badge>
            )}
          </button>
        </motion.div>

        {/* ─── CREATE TAB ────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === "create" && (
            <motion.div
              key="create"
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {/* ── Right column: Info + Summary ── */}
              <motion.div
                className="lg:col-span-3 lg:order-2 space-y-4 lg:sticky lg:top-6"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
              >
                {/* Fund balance
                <Card className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <CardContent className="">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Wallet
                          size={15}
                          weight="fill"
                          className="text-emerald-600"
                        />
                        <span className="text-lg font-semibold tracking-tighter text-emerald-700 dark:text-emerald-400">
                          Số dư quỹ hiện tại
                        </span>
                      </div>
                      <button
                        onClick={handleRefreshFundLedger}
                        className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-emerald-600/60 hover:text-emerald-600"
                        title="Làm mới"
                      >
                        <ArrowClockwise
                          size={24}
                          className={loadingFund ? "animate-spin" : ""}
                        />
                      </button>
                    </div>
                    {loadingFund ? (
                      <Skeleton className="h-8 w-32 rounded" />
                    ) : myFund ? (
                      <>
                        <p
                          className={`text-2xl font-bold tracking-tighter ${
                            totalFundBalance < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {formatMoney(totalFundBalance)}
                        </p>
                        <div className="mt-2 grid grid-cols-1 gap-1.5 text-sm tracking-tighter">
                          <p className="text-muted-foreground">
                            Hạn mức ứng trước:{" "}
                            <span className="font-semibold text-foreground">
                              {formatMoney(myFund.advanceLimit)}
                            </span>
                          </p>
                          <p className="text-muted-foreground">
                            Đang ứng nội bộ:{" "}
                            <span className="font-semibold text-amber-600">
                              {formatMoney(myFund.outstandingAdvanceAmount)}
                            </span>
                          </p>
                          <p className="text-muted-foreground">
                            Room còn lại:{" "}
                            <span className="font-semibold text-emerald-600">
                              {formatMoney(remainingAdvanceHeadroom)}
                            </span>
                          </p>
                          <p className="text-muted-foreground">
                            Quỹ nguồn đang có:{" "}
                            <span className="font-semibold text-foreground">
                              {fundSources.length}
                            </span>
                          </p>
                        </div>
                        <p className="text-xs tracking-tighter mt-2">
                          Cập nhật gần nhất:{" "}
                          {latestFundUpdatedAt
                            ? new Date(latestFundUpdatedAt).toLocaleString(
                                "vi-VN",
                              )
                            : "—"}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground tracking-tighter">
                        Không có dữ liệu
                      </p>
                    )}
                  </CardContent>
                </Card> */}

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold tracking-tighter flex items-center gap-1.5">
                    <FileText size={15} className="text-primary" />
                    Mô tả lý do cấp quỹ
                  </h3>
                  <Textarea
                    placeholder="Mô tả lý do cần cấp quỹ mua vật phẩm..."
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setDescription(e.target.value)
                    }
                    className="min-h-24 resize-none text-sm"
                  />
                </div>

                {/* Summary */}
                <Card className="border border-border/50">
                  <CardContent className="px-4 space-y-3">
                    <h3 className="text-base font-semibold tracking-tighter flex items-center gap-1.5">
                      <Wallet size={20} className="text-emerald-600" />
                      Tổng hợp
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm tracking-tighter">
                        <span className="text-muted-foreground text-sm">
                          Tổng vật phẩm:
                        </span>
                        <span className="font-semibold text-sm">
                          {rows.length} mục
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle size={11} weight="fill" />
                          {validRows} hợp lệ
                        </div>
                        {totalErrors > 0 && (
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium">
                            <WarningCircle size={11} weight="fill" />
                            {totalErrors} lỗi
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm tracking-tighter">
                        <span className="text-muted-foreground text-sm">
                          Danh mục:
                        </span>
                        <span className="font-semibold text-sm">
                          {
                            new Set(
                              rows
                                .filter((r) => r.categoryCode)
                                .map((r) => r.categoryCode),
                            ).size
                          }{" "}
                          loại
                        </span>
                      </div>
                      <div className="border-t border-border/50 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium tracking-tighter text-muted-foreground">
                            Tổng cộng:
                          </span>
                          <span className="text-lg font-bold tracking-tighter text-emerald-600">
                            {formatMoney(totalAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Submit */}
                    <Button
                      onClick={handleSubmit}
                      disabled={!canSubmit || isPending}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-10 text-sm"
                    >
                      {isPending ? (
                        <span className="flex items-center gap-2">
                          <Spinner size={14} className="animate-spin" />
                          Đang gửi...
                        </span>
                      ) : (
                        <>
                          <PaperPlaneTilt size={14} weight="bold" />
                          Gửi yêu cầu cấp quỹ
                        </>
                      )}
                    </Button>
                    {!canSubmit && description.trim() === "" && (
                      <p className="text-sm text-amber-600 flex items-center gap-1 tracking-tight">
                        <WarningCircle size={11} />
                        Vui lòng nhập mô tả
                      </p>
                    )}
                    {!canSubmit && totalErrors > 0 && (
                      <p className="text-sm text-red-500 flex items-center gap-1 tracking-tight">
                        <WarningCircle size={11} />
                        Sửa {totalErrors} dòng lỗi trước khi gửi
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Left column: Excel / Manual toggle ── */}
              <motion.div
                className="lg:col-span-9 lg:order-1"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
              >
                <Card className="border border-border/50 overflow-hidden p-0">
                  {/* ── Header with mode toggle ── */}
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2 tracking-tighter">
                      <Package size={15} className="text-primary" />
                      <span className="text-sm font-semibold">
                        Danh sách vật phẩm
                        {inputMode === "manual" && ` (${rows.length})`}
                      </span>
                      {inputMode === "manual" && excelFileName && (
                        <span className="text-sm text-muted-foreground">
                          · {excelFileName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {/* Mode toggle pills */}
                      <div className="flex gap-0.5 bg-muted/60 rounded-lg p-0.5">
                        <button
                          onClick={() => setInputMode("excel")}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 text-sm font-medium tracking-tighter rounded-md transition-colors",
                            inputMode === "excel"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <FileXls size={12} />
                          Nhập Excel
                        </button>
                        <button
                          onClick={() => setInputMode("manual")}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 text-sm font-medium tracking-tighter rounded-md transition-colors",
                            inputMode === "manual"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Plus size={12} />
                          Nhập thủ công
                        </button>
                      </div>

                      {inputMode === "manual" && (
                        <>
                          <div className="w-px h-5 bg-border/60" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-sm h-7 px-2 text-muted-foreground tracking-tighter"
                            onClick={addRow}
                          >
                            <Plus size={13} />
                            Thêm dòng
                          </Button>
                          {(rows.length > 1 || excelFileName) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-sm h-7 px-2 text-muted-foreground hover:text-red-500 tracking-tighter"
                              onClick={handleReset}
                            >
                              <Trash size={13} />
                              Xóa tất cả
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Excel / Manual animated panels ── */}
                  <AnimatePresence mode="wait">
                    {inputMode === "excel" && (
                      <motion.div
                        key="excel-panel"
                        className="p-6"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.28, ease: "easeOut" }}
                      >
                        <div
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const f = e.dataTransfer.files[0];
                            if (f) parseExcel(f, !!excelFileName);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "border-2 border-dashed rounded-2xl py-16 flex flex-col items-center gap-4 text-muted-foreground cursor-pointer transition-all",
                            isDragging
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                              : "border-muted-foreground/25 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10",
                          )}
                        >
                          <div
                            className={cn(
                              "h-16 w-16 rounded-2xl flex items-center justify-center transition-colors",
                              isDragging
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <UploadSimple size={32} weight="duotone" />
                          </div>
                          <div className="text-center space-y-1">
                            <p className="font-semibold text-base tracking-tighter">
                              Kéo thả file Excel vào đây
                            </p>
                            <p className="text-sm tracking-tighter">
                              hoặc{" "}
                              <span className="text-emerald-600 font-medium underline underline-offset-2">
                                nhấp để chọn file
                              </span>
                            </p>
                            <p className="text-sm text-muted-foreground/70 mt-2">
                              Hỗ trợ .xlsx, .xls
                            </p>
                          </div>
                        </div>

                        {/* Column hint + template download */}
                        <div className="mt-5">
                          <div>
                            <p className="text-sm text-muted-foreground tracking-tighter mb-1.5">
                              Các cột trong file:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {Object.values(COL).map((col) => (
                                <span
                                  key={col}
                                  className="px-2 py-1 rounded bg-muted border text-sm font-normal tracking-tighter text-muted-foreground"
                                >
                                  {col}
                                </span>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground tracking-tight">
                              Hai cột thể tích và cân nặng là tùy chọn. Có thể
                              để trống nếu chưa có dữ liệu.
                            </p>
                          </div>
                        </div>

                        {/* Quick switch hint */}
                        <p className="text-sm text-muted-foreground text-center mt-5 tracking-tighter">
                          Hoặc chuyển sang{" "}
                          <button
                            className="text-primary font-medium underline underline-offset-2 hover:text-primary/80"
                            onClick={() => setInputMode("manual")}
                          >
                            nhập thủ công từng dòng
                          </button>
                        </p>
                      </motion.div>
                    )}

                    {/* ── Manual table (when toggled) ── */}
                    {inputMode === "manual" && (
                      <motion.div
                        key="manual-panel"
                        className="overflow-auto"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.28, ease: "easeOut" }}
                      >
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead className="w-10 text-center text-sm">
                                STT
                              </TableHead>
                              <TableHead className="min-w-44 text-sm">
                                Tên vật phẩm *
                              </TableHead>
                              <TableHead className="min-w-36 text-sm">
                                Danh mục *
                              </TableHead>
                              <TableHead className="min-w-24 text-sm">
                                Đơn vị *
                              </TableHead>
                              <TableHead className="min-w-24 text-sm">
                                Số lượng *
                              </TableHead>
                              <TableHead className="min-w-28 text-sm">
                                Đơn giá *
                              </TableHead>
                              <TableHead className="min-w-28 text-sm">
                                Thể tích / đơn vị
                              </TableHead>
                              <TableHead className="min-w-28 text-sm">
                                Cân nặng / đơn vị
                              </TableHead>
                              <TableHead className="min-w-28 text-sm">
                                Thành tiền
                              </TableHead>
                              <TableHead className="min-w-32 text-sm">
                                Loại vật phẩm
                              </TableHead>
                              <TableHead className="min-w-32 text-sm">
                                Đối tượng
                              </TableHead>
                              <TableHead className="min-w-32 text-sm">
                                Ghi chú
                              </TableHead>
                              <TableHead className="w-10" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((row) => {
                              const hasErrors =
                                Object.keys(row.errors).length > 0;
                              return (
                                <TableRow
                                  key={row.id}
                                  className={cn(
                                    hasErrors &&
                                      "bg-red-50/50 dark:bg-red-950/10",
                                  )}
                                >
                                  <TableCell className="text-center text-sm text-muted-foreground font-mono">
                                    {row.row}
                                  </TableCell>
                                  <TableCell>
                                    {renderInputCell(
                                      row,
                                      "itemName",
                                      "Tên vật phẩm",
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {renderSelectCell(
                                      row,
                                      "categoryCode",
                                      categoryOptions,
                                      "Chọn danh mục",
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {renderInputCell(
                                      row,
                                      "unit",
                                      "kg, thùng...",
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {renderInputCell(
                                      row,
                                      "quantity",
                                      "0",
                                      "number",
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {renderCurrencyCell(row, "unitPrice")}
                                  </TableCell>
                                  <TableCell>
                                    {renderOptionalDecimalCell(
                                      row,
                                      "volumePerUnit",
                                      "dm3",
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {renderOptionalDecimalCell(
                                      row,
                                      "weightPerUnit",
                                      "kg",
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm font-semibold text-emerald-600 tracking-tight whitespace-nowrap">
                                      {formatMoney(row.totalPrice)}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    {itemTypeOptions.length > 0
                                      ? renderSelectCell(
                                          row,
                                          "itemType",
                                          itemTypeOptions,
                                          "Chọn loại vật phẩm",
                                        )
                                      : renderInputCell(
                                          row,
                                          "itemType",
                                          "Hàng khô...",
                                        )}
                                  </TableCell>
                                  <TableCell>
                                    {targetGroupOptions.length > 0
                                      ? renderSelectCell(
                                          row,
                                          "targetGroup",
                                          targetGroupOptions,
                                          "Chọn đối tượng",
                                        )
                                      : renderInputCell(
                                          row,
                                          "targetGroup",
                                          "Người dân...",
                                        )}
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={row.notes}
                                      onChange={(e) =>
                                        updateRow(
                                          row.id,
                                          "notes",
                                          e.target.value,
                                        )
                                      }
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
                                      <X size={13} />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {rows.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={13}
                                  className="h-32 text-center text-muted-foreground"
                                >
                                  <div className="flex flex-col items-center gap-2">
                                    <Package
                                      size={28}
                                      weight="duotone"
                                      className="text-muted-foreground/40"
                                    />
                                    <p className="text-sm tracking-tighter">
                                      Chưa có vật phẩm
                                    </p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1.5 text-sm"
                                      onClick={addRow}
                                    >
                                      <Plus size={12} /> Thêm dòng
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hidden file input (shared) */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) parseExcel(f, !!excelFileName);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </Card>
              </motion.div>
            </motion.div>
          )}

          {/* ─── HISTORY TAB ───────────────────────────────── */}
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <Card className="border border-border/50">
                <CardContent className="px-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="text-base font-semibold tracking-tighter flex items-center gap-1.5">
                      <ListBullets size={16} className="text-primary" />
                      Lịch sử yêu cầu cấp quỹ
                      {requestsData && (
                        <Badge
                          variant="secondary"
                          className="ml-1 px-1.5 py-0 font-medium text-sm"
                        >
                          {requestsData.totalCount}
                        </Badge>
                      )}
                    </h3>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-medium tracking-tighter text-muted-foreground">
                        Trạng thái
                      </span>
                      <Select
                        value={histStatusFilter}
                        onValueChange={(value) => {
                          setHistStatusFilter(value as HistoryStatusFilter);
                          setHistPage(1);
                        }}
                      >
                        <SelectTrigger className="h-9 w-[180px] text-sm tracking-tighter">
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          {historyStatusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {loadingRequests ? (
                    <div className="space-y-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="p-10 text-center">
                      <Wallet
                        size={40}
                        className="mx-auto text-muted-foreground/30 mb-3"
                      />
                      <p className="text-sm text-muted-foreground tracking-tight">
                        Chưa có yêu cầu cấp quỹ nào
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border border-border/60 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead className="w-12 text-center text-sm tracking-tighter">
                                #
                              </TableHead>
                              <TableHead className="text-sm tracking-tighter min-w-36">
                                Mô tả
                              </TableHead>
                              <TableHead className="text-sm tracking-tighter">
                                Trạng thái
                              </TableHead>
                              <TableHead className="text-sm tracking-tighter text-right">
                                Tổng tiền
                              </TableHead>
                              <TableHead className="text-sm tracking-tighter text-right">
                                Ngày tạo
                              </TableHead>
                              <TableHead className="w-12" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {requests.map((req, idx) => {
                              const st = statusConfig[req.status];
                              return (
                                <motion.tr
                                  key={req.id}
                                  className="hover:bg-muted/30 cursor-pointer transition-colors border-b border-border/40"
                                  onClick={() => setDetailItem(req)}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    duration: 0.28,
                                    delay: idx * 0.05,
                                    ease: "easeOut",
                                  }}
                                >
                                  <TableCell className="text-center text-sm text-muted-foreground">
                                    {(histPage - 1) * histPageSize + idx + 1}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="text-sm font-medium tracking-tighter">
                                        Yêu cầu #{req.id}
                                      </p>
                                      {req.description && (
                                        <p className="text-sm text-muted-foreground tracking-tighter truncate max-w-64">
                                          {req.description}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      className={`${st.className} border gap-1.5 px-2 py-0.5 text-sm`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`}
                                      />
                                      {st.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="text-sm font-bold text-emerald-600 tracking-tighter">
                                      {formatMoney(req.totalAmount)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="text-sm text-muted-foreground tracking-tighter">
                                      {new Date(
                                        req.createdAt,
                                      ).toLocaleDateString("vi-VN")}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailItem(req);
                                      }}
                                    >
                                      <Eye size={14} />
                                    </Button>
                                  </TableCell>
                                </motion.tr>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground tracking-tight">
                            Trang {requestsData?.pageNumber}/
                            {requestsData?.totalPages} ·{" "}
                            {requestsData?.totalCount} yêu cầu
                          </p>
                          <Select
                            value={String(histPageSize)}
                            onValueChange={(v) => {
                              setHistPageSize(Number(v));
                              setHistPage(1);
                            }}
                          >
                            <SelectTrigger className="w-16 h-7 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[5, 10, 20, 50].map((s) => (
                                <SelectItem key={s} value={String(s)}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-muted-foreground tracking-tighter">
                            / trang
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!requestsData?.hasPreviousPage}
                            onClick={() =>
                              setHistPage((p) => Math.max(1, p - 1))
                            }
                            className="h-7 px-3 text-sm"
                          >
                            Trước
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!requestsData?.hasNextPage}
                            onClick={() => setHistPage((p) => p + 1)}
                            className="h-7 px-3 text-sm"
                          >
                            Tiếp
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "ledger" && (
            <motion.div key="ledger" {...ledgerShellMotionProps}>
              <div className="relative mx-auto max-w-[1720px] overflow-hidden rounded-[28px] border border-[#6f4a32]/35 bg-[linear-gradient(135deg,#9b6b47_0%,#7d5639_38%,#aa7b57_100%)] p-3 shadow-[0_20px_64px_-46px_rgba(15,23,42,0.26)]">
                <div className="pointer-events-none absolute inset-[1px] rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_42%)]" />
                <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_72px_minmax(0,1.05fr)] gap-3 items-stretch">
                  <motion.div
                    className="relative flex flex-col pb-4 pl-4 pt-2 xl:min-h-[740px]"
                    style={{
                      transformPerspective: 2400,
                      transformOrigin: "right center",
                      transformStyle: "preserve-3d",
                      backfaceVisibility: "hidden",
                      willChange: "transform, opacity",
                    }}
                    {...ledgerLeftPageMotionProps}
                  >
                    <div className="pointer-events-none absolute bottom-1 left-0 right-6 top-5 rounded-[22px] border border-slate-200/80 bg-white shadow-[0_18px_34px_-30px_rgba(15,23,42,0.16)]" />
                    <div className="pointer-events-none absolute bottom-2 left-2 right-4 top-3 rounded-[22px] border border-slate-200/85 bg-white shadow-[0_16px_32px_-28px_rgba(15,23,42,0.14)]" />
                    <div className="pointer-events-none absolute bottom-3 left-4 right-2 top-1 rounded-[22px] border border-slate-200/90 bg-white shadow-[0_14px_28px_-26px_rgba(15,23,42,0.12)]" />
                    <div
                      className="relative flex min-h-[620px] flex-1 flex-col overflow-hidden rounded-[22px] border border-primary/12 bg-white/96 pb-4 pl-14 pr-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_44px_-42px_rgba(15,23,42,0.18)] md:pb-5 md:pl-14 md:pr-5 md:pt-5 xl:min-h-[700px] [&_label]:leading-[26px] [&_p]:leading-[26px] [&_span]:leading-[26px]"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, rgba(148,163,184,0.11) 1px, transparent 1px), linear-gradient(to bottom, transparent 24px, rgba(148,163,184,0.15) 24px, rgba(148,163,184,0.15) 25px, transparent 25px)",
                        backgroundSize: "26px 26px",
                        backgroundPosition: "4px 22px",
                      }}
                    >
                      <div className="pointer-events-none absolute inset-y-0 left-[42px] w-px bg-rose-200/55" />
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="text-xs uppercase tracking-[0.35em] text-primary/70 font-semibold leading-[26px]">
                            Ledger Book
                          </p>
                          <h3 className="text-[40px] font-bold tracking-tighter leading-[52px] text-slate-900">
                            Sổ quản lý quyết toán
                          </h3>
                          <p className="text-sm tracking-tight text-slate-600 leading-[26px]">
                            Theo dõi các khoản tạm ứng, hạn mức khả dụng và tiến
                            độ quyết toán của người chi hộ.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshFundLedger}
                          className="gap-1.5 rounded-full border-primary/20 bg-white/90 text-primary hover:bg-primary/5"
                        >
                          <ArrowClockwise
                            size={14}
                            className={
                              loadingFund || loadingLedgerTx
                                ? "animate-spin"
                                : ""
                            }
                          />
                          Làm mới sổ
                        </Button>
                      </div>

                      <div className="mt-6.5 grid grid-cols-2 gap-x-6 gap-y-6.5">
                        <div className="px-1 py-0">
                          <p className="text-xs font-medium uppercase tracking-widest text-primary leading-6.5">
                            Tổng quỹ kho hiện tại
                          </p>
                          <p className="text-[22px] font-bold tracking-tight text-slate-900 leading-6.5">
                            {formatMoney(totalFundBalance)}
                          </p>
                        </div>
                        <div className="px-1 py-0">
                          <p className="text-xs font-medium uppercase tracking-widest text-primary leading-6.5">
                            Hạn mức
                          </p>
                          <p className="text-[22px] font-bold tracking-tight text-slate-900 leading-6.5">
                            {formatMoney(myFund?.advanceLimit)}
                          </p>
                        </div>
                        <div className="px-1 py-0">
                          <p className="text-xs font-medium uppercase tracking-widest text-primary leading-6.5">
                            Đã ứng
                          </p>
                          <p className="text-[22px] font-bold tracking-tight text-rose-600 leading-6.5">
                            {formatMoney(myFund?.outstandingAdvanceAmount)}
                          </p>
                        </div>
                        <div className="px-1 py-0">
                          <p className="text-xs font-medium uppercase tracking-widest text-primary leading-6.5">
                            Hạn mức còn lại có thể ứng
                          </p>
                          <p className="text-[22px] font-bold tracking-tight text-emerald-600 leading-6.5">
                            {formatMoney(remainingAdvanceHeadroom)}
                          </p>
                        </div>
                        <div className="px-1 py-0">
                          <span className="text-sm tracking-tighter text-slate-600 leading-6.5">
                            {advancersData?.totalCount ?? 0} người đang cần
                            quyết toán
                          </span>
                        </div>
                        <div className="px-1 py-0">
                          <span className="text-sm tracking-tighter leading-6.5">
                            Cập nhật gần nhất:{" "}
                            {latestFundUpdatedAt
                              ? new Date(latestFundUpdatedAt).toLocaleString(
                                  "vi-VN",
                                )
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6.5">
                        <Input
                          value={ledgerSearch}
                          onChange={(e) => setLedgerSearch(e.target.value)}
                          placeholder="Tìm theo tên hoặc số điện thoại..."
                          className="h-[26px] rounded-none border-0 bg-transparent px-1 py-0 leading-6.5 shadow-none focus-visible:ring-0"
                        />
                      </div>

                      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1 xl:min-h-45">
                        {loadingAdvancers ? (
                          Array.from({ length: 4 }).map((_, index) => (
                            <Skeleton
                              key={index}
                              className="h-26 w-full rounded-2xl"
                            />
                          ))
                        ) : filteredLedgerContributors.length === 0 ? (
                          <div className="px-2 py-10 text-center">
                            <p className="text-base font-semibold tracking-tight text-slate-800">
                              Chưa có người chi hộ nào đang chờ quyết toán
                            </p>
                            <p className="mt-2 text-sm tracking-tight text-slate-500 leading-6.5">
                              Khi có phát sinh các khoản chi hộ, danh sách cần
                              quyết toán sẽ xuất hiện tại trang này.
                            </p>
                          </div>
                        ) : (
                          filteredLedgerContributors.map((item) => (
                            <button
                              key={item.key}
                              onClick={() =>
                                setSelectedLedgerContributorKey(item.key)
                              }
                              className={`w-full border-x-0 border-t-0 border-b px-1 py-2.5 text-left transition-all ${
                                selectedLedgerContributor?.key === item.key
                                  ? "border-blue-200/70 bg-blue-50/60"
                                  : "border-slate-200/70 bg-transparent hover:border-blue-200/60 hover:bg-blue-50/30"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-base font-semibold tracking-tighter text-slate-900 truncate">
                                      {item.contributorName}
                                    </p>
                                    <span className="shrink-0 text-sm">
                                      ({item.phoneNumber || "—"})
                                    </span>
                                  </div>
                                  <div className="mt-0.5 flex items-center gap-2 text-sm tracking-tighter">
                                    <span>
                                      Tổng chi hộ:{" "}
                                      {formatMoney(item.totalAdvancedAmount)}
                                    </span>
                                    <span>·</span>
                                    <span>
                                      Đã quyết toán{" "}
                                      {item.totalRepaidAmount > 0
                                        ? `${Math.round((item.totalRepaidAmount / item.totalAdvancedAmount) * 100)}%`
                                        : "0%"}
                                    </span>
                                  </div>
                                </div>
                                <Badge className="rounded-full bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 text-sm shrink-0">
                                  Đã quyết toán:{" "}
                                  {formatMoney(item.outstandingAmount)}
                                </Badge>
                              </div>
                            </button>
                          ))
                        )}
                      </div>

                      {/* ── Pagination ── */}
                      {advancersData && advancersData.totalPages > 0 && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs tracking-tight text-slate-500">
                              Hiển thị
                            </span>
                            <select
                              value={advancersPageSize}
                              onChange={(e) => {
                                setAdvancersPageSize(Number(e.target.value));
                                setAdvancersPage(1);
                              }}
                              className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-primary/30"
                            >
                              {[5, 10, 15].map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                            <span className="text-xs tracking-tight text-slate-500">
                              / {advancersData.totalCount} người
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              disabled={!advancersData.hasPreviousPage}
                              onClick={() =>
                                setAdvancersPage((p) => Math.max(1, p - 1))
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ArrowLeft size={12} />
                            </button>
                            <span className="min-w-[60px] text-center text-xs tracking-tight text-slate-600">
                              {advancersData.pageNumber} /{" "}
                              {advancersData.totalPages}
                            </span>
                            <button
                              disabled={!advancersData.hasNextPage}
                              onClick={() => setAdvancersPage((p) => p + 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ArrowLeft size={12} className="rotate-180" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    className="hidden xl:flex items-center justify-center"
                    style={{ willChange: "transform, opacity" }}
                    {...ledgerBinderMotionProps}
                  >
                    <div className="relative flex h-full min-h-[500px] w-full items-center justify-center overflow-hidden">
                      <div className="absolute inset-y-6 left-1/2 w-[44px] -translate-x-1/2 rounded-[999px] bg-[#8b5e3c]/12 blur-[1px]" />
                      <div className="absolute inset-y-9 left-1/2 w-[8px] -translate-x-1/2 rounded-full border border-slate-300/80 bg-gradient-to-b from-slate-300 via-white to-slate-400 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.35)]" />
                      <div className="relative z-10 flex h-full min-h-[460px] flex-col items-center justify-around py-5">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <motion.div
                            key={index}
                            className="relative h-14 w-[76px]"
                            initial={
                              prefersReducedMotion
                                ? false
                                : { opacity: 0, scale: 0.88, y: 12 }
                            }
                            animate={
                              prefersReducedMotion
                                ? undefined
                                : { opacity: 1, scale: 1, y: 0 }
                            }
                            exit={
                              prefersReducedMotion
                                ? undefined
                                : { opacity: 0, scale: 0.92, y: -8 }
                            }
                            transition={
                              prefersReducedMotion
                                ? undefined
                                : {
                                    duration: 0.28,
                                    delay: 0.34 + index * 0.04,
                                    ease: [0.16, 1, 0.3, 1],
                                  }
                            }
                          >
                            <div className="absolute left-1/2 top-1/2 h-[42px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-300/85 bg-gradient-to-b from-slate-300 via-white to-slate-400 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.36)]" />
                            <div className="absolute left-[10px] top-1/2 h-[24px] w-[20px] -translate-y-1/2 rounded-l-full border-[2.5px] border-r-0 border-slate-400/90 bg-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]" />
                            <div className="absolute right-[10px] top-1/2 h-[24px] w-[20px] -translate-y-1/2 rounded-r-full border-[2.5px] border-l-0 border-slate-400/90 bg-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]" />
                            <div className="absolute left-[29px] top-1/2 h-[2px] w-[18px] -translate-y-1/2 rounded-full bg-slate-300/60" />
                            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-slate-300/30 to-transparent" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    className="relative flex flex-col pb-4 pr-4 pt-2 xl:min-h-[740px]"
                    style={{
                      transformPerspective: 2400,
                      transformOrigin: "left center",
                      transformStyle: "preserve-3d",
                      backfaceVisibility: "hidden",
                      willChange: "transform, opacity",
                    }}
                    {...ledgerRightPageMotionProps}
                  >
                    <div className="pointer-events-none absolute bottom-1 left-6 right-0 top-5 rounded-[22px] border border-slate-200/80 bg-white shadow-[0_18px_34px_-30px_rgba(15,23,42,0.16)]" />
                    <div className="pointer-events-none absolute bottom-2 left-4 right-2 top-3 rounded-[22px] border border-slate-200/85 bg-white shadow-[0_16px_32px_-28px_rgba(15,23,42,0.14)]" />
                    <div className="pointer-events-none absolute bottom-3 left-2 right-4 top-1 rounded-[22px] border border-slate-200/90 bg-white shadow-[0_14px_28px_-26px_rgba(15,23,42,0.12)]" />
                    <div
                      className="relative flex min-h-[620px] flex-1 flex-col overflow-hidden rounded-[22px] border border-primary/12 bg-white/96 pb-4 pl-14 pr-4 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_44px_-42px_rgba(15,23,42,0.18)] md:pb-5 md:pl-14 md:pr-5 md:pt-5 xl:min-h-[700px] [&_label]:leading-[26px] [&_p]:leading-[26px] [&_span]:leading-[26px]"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, rgba(148,163,184,0.11) 1px, transparent 1px), linear-gradient(to bottom, transparent 24px, rgba(148,163,184,0.15) 24px, rgba(148,163,184,0.15) 25px, transparent 25px)",
                        backgroundSize: "26px 26px",
                        backgroundPosition: "4px 16px",
                      }}
                    >
                      <div className="pointer-events-none absolute inset-y-0 left-[42px] w-px bg-rose-200/55" />
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="space-y-0">
                          <p className="text-xs uppercase tracking-[0.35em] text-primary/70 font-semibold leading-[26px]">
                            Phiếu quyết toán
                          </p>
                          <h3 className="text-[40px] font-bold tracking-tighter leading-[52px] text-slate-900">
                            {ledgerMode === "advance"
                              ? "Chi hộ nội bộ"
                              : "Quyết toán nội bộ"}
                          </h3>
                          <p className="text-sm tracking-tight text-slate-600 leading-[26px]">
                            {ledgerMode === "advance"
                              ? "Chọn một nguồn quỹ và nhập thông tin người chi hộ trong cùng một phiếu."
                              : "Chọn nguồn quỹ và nhập thông tin người chi hộ trong cùng một phiếu."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-[26px] flex flex-wrap gap-2">
                        {[
                          { key: "advance", label: "Chi hộ" },
                          { key: "repayment", label: "Quyết toán" },
                        ].map((mode) => (
                          <button
                            key={mode.key}
                            onClick={() =>
                              setLedgerMode(mode.key as LedgerMode)
                            }
                            className={`rounded-full px-4 py-[7px] text-sm font-medium tracking-tight leading-[26px] transition-colors ${
                              ledgerMode === mode.key
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                : "border border-primary/20 bg-white text-slate-700 hover:bg-primary/5"
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>

                      {ledgerMode === "advance" && (
                        <div className="mt-6.5 space-y-6.5">
                          <div className="px-1 py-0">
                            <label className="block translate-y-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary leading-6.5">
                              Chọn nguồn quỹ của kho để quyết toán
                            </label>
                            <Select
                              value={effectiveAdvanceFundId}
                              onValueChange={setSelectedAdvanceFundId}
                            >
                              <SelectTrigger className="relative top-[8px] h-[26px] items-start rounded-none border-0 bg-transparent px-0 py-0 leading-[26px] shadow-none focus:ring-0 [&_[data-slot=select-value]]:items-start [&_[data-slot=select-value]]:py-0 [&_[data-slot=select-value]]:leading-[26px]">
                                <SelectValue placeholder="Chọn nguồn quỹ..." />
                              </SelectTrigger>
                              <SelectContent>
                                {fundSources.map((fund) => (
                                  <SelectItem
                                    key={fund.id}
                                    value={String(fund.id)}
                                  >
                                    <div className="flex items-center justify-between gap-3 w-full">
                                      <span className="text-sm truncate">
                                        {fund.fundSourceName}
                                      </span>
                                      <span className="text-sm font-semibold text-emerald-600 shrink-0">
                                        {formatMoney(fund.balance)}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-6.5">
                            {advanceRows.map((row, index) => (
                              <div key={row.id} className="px-1 py-0">
                                <div className="flex items-center justify-between gap-3 h-[26px]">
                                  <p className="text-xs font-medium uppercase tracking-widest text-primary leading-6.5">
                                    Người chi hộ số {index + 1}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-[26px] w-[26px] p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                    disabled={advanceRows.length === 1}
                                    onClick={() => removeAdvanceRow(row.id)}
                                  >
                                    <Trash size={14} />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 gap-x-3 gap-y-[26px] md:grid-cols-[minmax(0,1fr)_220px_180px]">
                                  <Input
                                    value={row.contributorName}
                                    onChange={(e) =>
                                      updateAdvanceRow(
                                        row.id,
                                        "contributorName",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Họ tên người chi hộ"
                                    className="h-[26px] rounded-none border-0 bg-transparent px-0 py-0 leading-[26px] shadow-none focus-visible:ring-0"
                                  />
                                  <Input
                                    value={row.phoneNumber}
                                    onChange={(e) =>
                                      updateAdvanceRow(
                                        row.id,
                                        "phoneNumber",
                                        e.target.value,
                                      )
                                    }
                                    inputMode="numeric"
                                    placeholder="Số điện thoại"
                                    className="h-[26px] rounded-none border-0 bg-transparent px-0 py-0 leading-[26px] shadow-none focus-visible:ring-0"
                                  />
                                  <Input
                                    value={formatMoneyInput(row.amount)}
                                    onChange={(e) =>
                                      updateAdvanceRow(
                                        row.id,
                                        "amount",
                                        e.target.value,
                                      )
                                    }
                                    inputMode="numeric"
                                    placeholder="Số tiền"
                                    className="h-[26px] rounded-none border-0 bg-transparent px-0 py-0 leading-[26px] shadow-none focus-visible:ring-0"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            onClick={addAdvanceRow}
                            className="h-[36px] rounded-full border-primary/20 bg-white px-4 text-sm hover:bg-primary/5 gap-1.5"
                          >
                            <Plus size={14} />
                            Thêm người chi hộ
                          </Button>

                          <div className="px-1 py-0">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-0">
                              <div>
                                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary leading-6.5">
                                  Tổng số tiền quyết toán
                                </p>
                                <p className="mt-0.5 text-[36px] font-bold tracking-tight leading-13 text-slate-900">
                                  {formatMoney(advanceTotal)}
                                </p>
                              </div>
                            </div>
                            {advanceTotal > 0 &&
                              advanceTotal > advanceCapacity && (
                                <div className="mt-6.5 px-1 py-0 text-sm tracking-tighter text-red-500 leading-6.5">
                                  Số tiền trên phiếu đang vượt quá tổng số dư
                                  quỹ đã chọn và hạn mức còn lại của người chi
                                  hộ. Vui lòng điều chỉnh lại thông tin hoặc
                                  chọn nguồn quỹ khác.
                                </div>
                              )}
                          </div>

                          <Button
                            onClick={handleSubmitInternalAdvance}
                            disabled={
                              isSubmittingInternalAdvance || !fundSources.length
                            }
                            className="h-[52px] w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            {isSubmittingInternalAdvance ? (
                              <span className="flex items-center gap-2">
                                <Spinner size={16} className="animate-spin" />
                                Đang ghi sổ ...
                              </span>
                            ) : (
                              "Lưu phiếu ứng tiền"
                            )}
                          </Button>
                        </div>
                      )}

                      {ledgerMode === "repayment" && (
                        <div className="mt-8">
                          {/* ── Người chi hộ (dropdown) ── */}
                          <div className="px-1">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-xs font-medium uppercase tracking-widest text-primary leading-6.5">
                                  Người chi hộ
                                </p>
                                <Select
                                  value={selectedRepaymentContributorKey}
                                  onValueChange={
                                    setSelectedRepaymentContributorKey
                                  }
                                >
                                  <SelectTrigger className="h-[26px] w-100 items-start rounded-none border-0 bg-transparent px-0 py-0 leading-[26px] shadow-none focus:ring-0 [&_[data-slot=select-value]]:items-start [&_[data-slot=select-value]]:py-0 [&_[data-slot=select-value]]:leading-[26px] text-sm font-normal tracking-tighter text-slate-900">
                                    <SelectValue placeholder="Chọn đối tượng quyết toán ..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {repaymentAdvancers.map((person) => (
                                      <SelectItem
                                        key={person.key}
                                        value={person.key}
                                      >
                                        <div className="flex items-center justify-between gap-4 w-full">
                                          <div>
                                            <span className="font-semibold">
                                              {person.contributorName}
                                            </span>
                                            <span className="ml-2 text-sm text-slate-900">
                                              SĐT: {person.phoneNumber}
                                            </span>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {selectedRepaymentContributor && (
                                <div className="text-right">
                                  <p className="text-xs font-medium uppercase tracking-widest text-primary leading-[26px]">
                                    Dư nợ hiện tại
                                  </p>
                                  <p className="text-lg font-bold tracking-tight leading-6.5 text-rose-600">
                                    {formatMoney(
                                      selectedRepaymentContributor.outstandingAmount,
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {selectedRepaymentContributor && (
                            <>
                              {/* ── Quỹ nhận hoàn rows ── */}
                              <div className="mt-[20px] space-y-0">
                                {repaymentRows.map((row, index) => (
                                  <div key={row.id} className="px-1">
                                    <div className="flex items-center justify-between gap-3 h-[26px]">
                                      <p className="text-sm font-semibold tracking-tight text-primary leading-[26px]">
                                        Quỹ quyết toán số {index + 1}
                                      </p>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-[26px] w-[26px] p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                        disabled={repaymentRows.length === 1}
                                        onClick={() =>
                                          removeRepaymentRow(row.id)
                                        }
                                      >
                                        <Trash size={14} />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-x-3 md:grid-cols-[minmax(0,1fr)_180px] h-[26px] overflow-hidden">
                                      <Select
                                        value={
                                          row.depotFundId &&
                                          fundSources.some(
                                            (fund) =>
                                              String(fund.id) ===
                                              row.depotFundId,
                                          )
                                            ? row.depotFundId
                                            : defaultFundSourceId
                                        }
                                        onValueChange={(value) =>
                                          updateRepaymentRow(
                                            row.id,
                                            "depotFundId",
                                            value,
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-[26px] data-[size=default]:h-[26px] items-start rounded-none border-0 bg-transparent px-0 py-0 leading-[26px] shadow-none focus:ring-0 [&_[data-slot=select-value]]:items-start [&_[data-slot=select-value]]:py-0 [&_[data-slot=select-value]]:leading-[26px]">
                                          <SelectValue placeholder="Chọn quỹ nhận hoàn..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {fundSources.map((fund) => (
                                            <SelectItem
                                              key={fund.id}
                                              value={String(fund.id)}
                                            >
                                              <div className="flex items-center justify-between gap-3 w-full">
                                                <span className="truncate">
                                                  {fund.fundSourceName}
                                                </span>
                                                <span className="text-sm font-semibold text-emerald-600 shrink-0">
                                                  {formatMoney(fund.balance)}
                                                </span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Input
                                        value={formatMoneyInput(row.amount)}
                                        onChange={(e) =>
                                          updateRepaymentRow(
                                            row.id,
                                            "amount",
                                            e.target.value,
                                          )
                                        }
                                        inputMode="numeric"
                                        placeholder="Số tiền hoàn"
                                        className="h-[26px] rounded-none border-0 bg-transparent px-0 py-0 leading-[26px] shadow-none focus-visible:ring-0"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* ── Thêm quỹ button ── */}
                              <div className="mt-[26px] h-[26px] flex items-center">
                                <Button
                                  variant="outline"
                                  onClick={addRepaymentRow}
                                  className="rounded-full border-primary/20 bg-white hover:bg-primary/5 gap-1.5 text-sm px-3 py-2"
                                >
                                  <Plus size={14} />
                                  Thêm quỹ quyết toán
                                </Button>
                              </div>

                              {/* ── Tổng quyết toán ── */}
                              <div className="mt-12 px-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-widest text-primary leading-6.5">
                                      Tổng số tiền
                                    </p>
                                    <p className="text-3xl font-bold tracking-tight leading-6.5 text-slate-900">
                                      {formatMoney(repaymentTotal)}
                                    </p>
                                  </div>
                                  <div className="text-sm tracking-tight text-slate-600 leading-6.5">
                                    Số tiền quyết toán còn lại:{" "}
                                    <span className="font-semibold text-emerald-600">
                                      {formatMoney(
                                        Math.max(
                                          (selectedRepaymentContributor?.outstandingAmount ??
                                            0) - repaymentTotal,
                                          0,
                                        ),
                                      )}
                                    </span>
                                  </div>
                                </div>
                                {repaymentTotal >
                                  selectedRepaymentContributor.outstandingAmount && (
                                  <div className="mt-[26px] px-1 text-sm tracking-tight text-rose-600 leading-[26px]">
                                    Tổng tiền đang lớn hơn số dư cần quyết toán
                                    cho người chi hộ được chọn.
                                  </div>
                                )}
                              </div>

                              {/* ── Submit button ── */}
                              <Button
                                onClick={handleSubmitInternalRepayment}
                                disabled={
                                  isSubmittingInternalRepayment ||
                                  !selectedRepaymentContributor
                                }
                                className="mt-[26px] h-[52px] w-full rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                {isSubmittingInternalRepayment ? (
                                  <span className="flex items-center gap-2">
                                    <Spinner
                                      size={16}
                                      className="animate-spin"
                                    />
                                    Đang ghi sổ...
                                  </span>
                                ) : (
                                  "Lưu phiếu"
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── QUỸ KHO TAB ─────────────────────────────── */}
        {activeTab === "funds" && (
          <motion.div
            key="funds"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-4"
          >
            <Card className="border border-border/50">
              <CardContent className="px-5 space-y-4">
                <h3 className="text-base font-semibold tracking-tighter flex items-center gap-1.5 pt-1">
                  <Bank size={16} className="text-primary" />
                  Danh sách quỹ kho
                  {fundSources.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 text-[10px] px-1.5 py-0 font-medium"
                    >
                      {fundSources.length}
                    </Badge>
                  )}
                </h3>
                {loadingFund ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))}
                  </div>
                ) : fundSources.length === 0 ? (
                  <div className="p-10 text-center">
                    <Bank
                      size={40}
                      className="mx-auto text-muted-foreground/30 mb-3"
                    />
                    <p className="text-sm text-muted-foreground tracking-tighter">
                      Chưa có quỹ nào
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-sm tracking-tighter">
                            #
                          </TableHead>
                          <TableHead className="text-sm tracking-tighter">
                            Nguồn quỹ
                          </TableHead>
                          <TableHead className="text-sm tracking-tighter">
                            Kho
                          </TableHead>
                          <TableHead className="text-sm tracking-tighter text-right">
                            Số dư
                          </TableHead>
                          <TableHead className="text-sm tracking-tighter text-right">
                            Cập nhật
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fundSources.map((fund, idx) => (
                          <TableRow
                            key={fund.id}
                            className={cn(
                              "cursor-pointer transition-colors",
                              selectedFundId === fund.id
                                ? "bg-primary/8 border-l-2 border-primary"
                                : "hover:bg-muted/30",
                            )}
                            onClick={() => {
                              setSelectedFundId(
                                selectedFundId === fund.id ? null : fund.id,
                              );
                              setFundTxPage(1);
                              handleFundTxResetFilters();
                            }}
                          >
                            <TableCell className="text-sm text-muted-foreground">
                              {idx + 1}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium tracking-tighter">
                                {fund.fundSourceName}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm tracking-tighter text-muted-foreground">
                                {fund.depotName}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={cn(
                                  "text-sm font-semibold tabular-nums",
                                  fund.balance >= 0
                                    ? "text-emerald-600"
                                    : "text-rose-600",
                                )}
                              >
                                {fund.balance.toLocaleString("vi-VN")}đ
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground tracking-tighter">
                              {new Date(fund.lastUpdatedAt).toLocaleString(
                                "vi-VN",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── Bottom panel: transactions ─── */}
            <AnimatePresence>
              {selectedFundId !== null && (
                <motion.div
                  key="fund-tx-panel"
                  initial={{ opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 60 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <Card className="border border-border/50">
                    <CardContent className="px-5 space-y-4">
                      {/* Panel header */}
                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <h3 className="text-base font-semibold tracking-tighter flex items-center gap-1.5">
                          <ClockCounterClockwise
                            size={16}
                            className="text-primary"
                          />
                          Giao dịch quỹ #{selectedFundId}
                          {fundTxData && (
                            <Badge
                              variant="secondary"
                              className="ml-1 text-[10px] px-1.5 py-0 font-medium"
                            >
                              {fundTxData.totalCount}
                            </Badge>
                          )}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs text-muted-foreground"
                          onClick={() => {
                            setSelectedFundId(null);
                            handleFundTxResetFilters();
                          }}
                        >
                          <X size={14} />
                          Đóng
                        </Button>
                      </div>

                      {/* ─── Filters ─── */}
                      <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground tracking-tighter">
                          <FunnelSimple size={13} />
                          Bộ lọc
                        </div>
                        <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
                          <div className="min-w-[280px] flex-1">
                            <Input
                              className="h-8 tracking-tighter text-xs"
                              placeholder="Tìm ghi chú, tên người nộp, số điện thoại..."
                              value={fundTxSearchInput}
                              onChange={(e) =>
                                setFundTxSearchInput(e.target.value)
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleFundTxApplyFilters()
                              }
                            />
                          </div>
                          <Select
                            value={selectedFundTxReferenceType}
                            onValueChange={(value) => {
                              setFundTxReferenceTypes(
                                value === "all"
                                  ? []
                                  : [value as DepotFundReferenceType],
                              );
                            }}
                          >
                            <SelectTrigger className="h-8 min-w-[150px] shrink-0 text-xs tracking-tighter">
                              <SelectValue placeholder="Loại tham chiếu" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tất cả</SelectItem>
                              {FUND_TX_REFERENCE_TYPE_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex shrink-0 items-center gap-2">
                            <Popover
                              open={fundTxFromDateOpen}
                              onOpenChange={setFundTxFromDateOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="default"
                                  className="h-8 min-w-32 justify-start gap-1.5 px-2.5 text-xs font-normal"
                                >
                                  <CalendarBlank className="h-3 w-3 shrink-0" />
                                  {fundTxFromDate ? (
                                    format(fundTxFromDate, "dd/MM/yyyy")
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Từ ngày
                                    </span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={fundTxFromDate}
                                  onSelect={(d) => {
                                    if (d && fundTxToDate && d > fundTxToDate) {
                                      setFundTxToDate(undefined);
                                    }
                                    setFundTxFromDate(d);
                                    setFundTxFromDateOpen(false);
                                  }}
                                  disabled={(d) =>
                                    fundTxToDate ? d > fundTxToDate : false
                                  }
                                  locale={viLocale}
                                  initialFocus
                                />
                                {fundTxFromDate && (
                                  <div className="border-t px-3 py-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-full text-xs text-muted-foreground"
                                      onClick={() => {
                                        setFundTxFromDate(undefined);
                                        setFundTxFromDateOpen(false);
                                      }}
                                    >
                                      Xóa
                                    </Button>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                            <span className="text-xs text-muted-foreground">
                              –
                            </span>
                            <Popover
                              open={fundTxToDateOpen}
                              onOpenChange={setFundTxToDateOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="default"
                                  className="h-8 min-w-32 justify-start gap-1.5 px-2.5 text-xs font-normal"
                                >
                                  <CalendarBlank className="h-3 w-3 shrink-0" />
                                  {fundTxToDate ? (
                                    format(fundTxToDate, "dd/MM/yyyy")
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Đến ngày
                                    </span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={fundTxToDate}
                                  onSelect={(d) => {
                                    if (
                                      d &&
                                      fundTxFromDate &&
                                      d < fundTxFromDate
                                    ) {
                                      setFundTxFromDate(undefined);
                                    }
                                    setFundTxToDate(d);
                                    setFundTxToDateOpen(false);
                                  }}
                                  disabled={(d) =>
                                    fundTxFromDate ? d < fundTxFromDate : false
                                  }
                                  locale={viLocale}
                                  initialFocus
                                />
                                {fundTxToDate && (
                                  <div className="border-t px-3 py-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-full text-xs text-muted-foreground"
                                      onClick={() => {
                                        setFundTxToDate(undefined);
                                        setFundTxToDateOpen(false);
                                      }}
                                    >
                                      Xóa
                                    </Button>
                                  </div>
                                )}
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              className="h-8 w-37 tracking-tighter text-xs"
                              placeholder="Tiền tối thiểu"
                              value={formatMoneyInput(fundTxMinAmount)}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(
                                  /\D/g,
                                  "",
                                );
                                setFundTxMinAmount(rawValue);
                                setFundTxAmountError(
                                  fundTxMaxAmount &&
                                    Number(rawValue) > Number(fundTxMaxAmount)
                                    ? "Tối thiểu không được lớn hơn tối đa"
                                    : "",
                                );
                              }}
                            />
                            <span className="text-xs text-muted-foreground">
                              –
                            </span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              className="h-8 w-37 tracking-tighter text-xs"
                              placeholder="Tiền tối đa"
                              value={formatMoneyInput(fundTxMaxAmount)}
                              onChange={(e) => {
                                const rawValue = e.target.value.replace(
                                  /\D/g,
                                  "",
                                );
                                setFundTxMaxAmount(rawValue);
                                setFundTxAmountError(
                                  fundTxMinAmount &&
                                    Number(rawValue) < Number(fundTxMinAmount)
                                    ? "Tối đa không được nhỏ hơn tối thiểu"
                                    : "",
                                );
                              }}
                            />
                          </div>
                          <div className="flex w-full items-center gap-2 sm:w-[260px] xl:w-[280px]">
                            <Button
                              size="sm"
                              className="h-8 flex-1 px-3 text-xs gap-1 tracking-tighter"
                              onClick={handleFundTxApplyFilters}
                              disabled={
                                !!fundTxAmountError || !!fundTxDateError
                              }
                            >
                              Áp dụng bộ lọc
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 flex-1 px-3 text-xs gap-1 text-muted-foreground tracking-tighter"
                              onClick={handleFundTxResetFilters}
                            >
                              Đặt lại
                            </Button>
                          </div>
                        </div>
                        {(fundTxAmountError || fundTxDateError) && (
                          <p className="text-xs text-rose-500 tracking-tighter flex items-center gap-1">
                            <WarningCircle size={13} weight="fill" />
                            {fundTxAmountError || fundTxDateError}
                          </p>
                        )}
                      </div>

                      {/* ─── Transaction table ─── */}
                      {loadingFundTx ? (
                        <div className="space-y-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton
                              key={i}
                              className="h-12 w-full rounded-lg"
                            />
                          ))}
                        </div>
                      ) : !fundTxData?.items?.length ? (
                        <div className="p-10 text-center">
                          <ClockCounterClockwise
                            size={40}
                            className="mx-auto text-muted-foreground/30 mb-3"
                          />
                          <p className="text-sm text-muted-foreground tracking-tighter">
                            Không có giao dịch nào
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-lg border border-border/60 overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                  <TableHead className="w-12 text-center text-sm tracking-tighter">
                                    #
                                  </TableHead>
                                  <TableHead className="text-sm tracking-tighter">
                                    Loại GD
                                  </TableHead>
                                  <TableHead className="text-sm tracking-tighter">
                                    Tham chiếu
                                  </TableHead>
                                  <TableHead className="text-sm tracking-tighter">
                                    Người nộp
                                  </TableHead>
                                  <TableHead className="text-sm tracking-tighter">
                                    Ghi chú
                                  </TableHead>
                                  <TableHead className="text-sm tracking-tighter text-right">
                                    Số tiền
                                  </TableHead>
                                  <TableHead className="text-sm tracking-tighter text-right">
                                    Thời gian
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {fundTxData.items.map((tx, idx) => {
                                  const isCredit = tx.amount >= 0;
                                  const displayRef =
                                    refTypeMap[tx.referenceType] ??
                                    tx.referenceType;
                                  const displayType =
                                    txTypeMap[tx.transactionType] ??
                                    tx.transactionType;
                                  return (
                                    <motion.tr
                                      key={tx.id}
                                      className="hover:bg-muted/30 transition-colors border-b border-border/40"
                                      initial={{ opacity: 0, y: 8 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{
                                        duration: 0.2,
                                        delay: idx * 0.03,
                                        ease: "easeOut",
                                      }}
                                    >
                                      <TableCell className="text-center text-sm text-muted-foreground">
                                        {(fundTxPage - 1) * fundTxPageSize +
                                          idx +
                                          1}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <div
                                            className={cn(
                                              "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                                              isCredit
                                                ? "bg-emerald-100 dark:bg-emerald-950/40"
                                                : "bg-rose-100 dark:bg-rose-950/40",
                                            )}
                                          >
                                            {isCredit ? (
                                              <ArrowDown
                                                size={12}
                                                weight="bold"
                                                className="text-emerald-600"
                                              />
                                            ) : (
                                              <ArrowUp
                                                size={12}
                                                weight="bold"
                                                className="text-rose-600"
                                              />
                                            )}
                                          </div>
                                          <span className="text-sm font-medium tracking-tighter">
                                            {displayType}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-sm tracking-tighter text-muted-foreground">
                                          {displayRef}
                                          {tx.referenceId != null
                                            ? ` #${tx.referenceId}`
                                            : ""}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        {tx.contributorName ? (
                                          <div className="text-sm tracking-tighter leading-tight">
                                            <p className="font-medium text-foreground">
                                              {tx.contributorName}
                                            </p>
                                            <p className="text-muted-foreground">
                                              {tx.contributorPhoneNumber || "—"}
                                            </p>
                                          </div>
                                        ) : (
                                          <span className="text-sm text-muted-foreground">
                                            —
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-sm tracking-tighter text-muted-foreground line-clamp-2">
                                          {tx.note || "—"}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span
                                          className={cn(
                                            "text-sm font-semibold tabular-nums",
                                            isCredit
                                              ? "text-emerald-600"
                                              : "text-rose-600",
                                          )}
                                        >
                                          {/* {isCredit ? "+" : ""} */}
                                          {tx.amount.toLocaleString("vi-VN")}đ
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right text-sm text-muted-foreground tracking-tighter">
                                        {new Date(tx.createdAt).toLocaleString(
                                          "vi-VN",
                                          {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          },
                                        )}
                                      </TableCell>
                                    </motion.tr>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground tracking-tighter">
                                Trang {fundTxData.pageNumber} /{" "}
                                {fundTxData.totalPages} ·{" "}
                                {fundTxData.totalCount} giao dịch
                              </p>
                              <Select
                                value={String(fundTxPageSize)}
                                onValueChange={(value) => {
                                  setFundTxPageSize(Number(value));
                                  setFundTxPage(1);
                                }}
                              >
                                <SelectTrigger className="h-7 w-[72px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[5, 10, 20, 50, 100].map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                      {size}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-xs text-muted-foreground tracking-tighter">
                                / trang
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                disabled={!fundTxData.hasPreviousPage}
                                onClick={() =>
                                  setFundTxPage((p) => Math.max(1, p - 1))
                                }
                              >
                                Trước
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs"
                                disabled={!fundTxData.hasNextPage}
                                onClick={() => setFundTxPage((p) => p + 1)}
                              >
                                Tiếp
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── Detail Dialog ─────────────────────────────────── */}
      <Dialog
        open={!!detailItem}
        onOpenChange={(open) => !open && setDetailItem(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="tracking-tighter">
              Chi tiết yêu cầu cấp quỹ
            </DialogTitle>
            <DialogDescription className="tracking-tighter">
              Yêu cầu số {detailItem?.id}
            </DialogDescription>
          </DialogHeader>

          {detailItem && (
            <div className="space-y-4">
              {(() => {
                const detailItems =
                  detailItemsData?.items ?? detailItem.items ?? [];

                return (
                  <>
                    {/* Status + amount */}
                    <div className="flex items-center justify-between">
                      <Badge
                        className={`${statusConfig[detailItem.status].className} border`}
                      >
                        {statusConfig[detailItem.status].label}
                      </Badge>
                      <span className="text-lg font-bold text-emerald-600 tracking-tighter">
                        {formatMoney(detailItem.totalAmount)}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                        <p className="text-sm text-muted-foreground tracking-tighter mb-0.5">
                          Ngày gửi
                        </p>
                        <p className="text-sm tracking-tighter">
                          {new Date(detailItem.createdAt).toLocaleString(
                            "vi-VN",
                          )}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                        <p className="text-sm text-muted-foreground tracking-tighter mb-0.5">
                          Người gửi
                        </p>
                        <p className="text-sm tracking-tighter">
                          {detailItem.requestedByUserName}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-sm text-muted-foreground tracking-tighter mb-0.5">
                        Mô tả
                      </p>
                      <p className="text-sm tracking-tighter">
                        {detailItem.description}
                      </p>
                    </div>

                    {/* Approved info */}
                    {detailItem.status === "Approved" &&
                      detailItem.approvedCampaignName && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800 p-2.5">
                          <p className="text-sm text-emerald-600 font-medium tracking-tighter mb-0.5">
                            Duyệt từ quỹ
                          </p>
                          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tracking-tighter">
                            {detailItem.approvedCampaignName}
                          </p>
                          {detailItem.reviewedByUserName && (
                            <p className="text-sm text-emerald-600/70 mt-1 tracking-tighter">
                              Bởi: {detailItem.reviewedByUserName}
                            </p>
                          )}
                        </div>
                      )}

                    {/* Rejected info */}
                    {detailItem.status === "Rejected" &&
                      detailItem.rejectionReason && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-800 p-2.5">
                          <p className="text-sm text-rose-600 font-medium tracking-tighter mb-0.5">
                            Lý do từ chối
                          </p>
                          <p className="text-sm text-rose-700 dark:text-rose-400 tracking-tighter">
                            {detailItem.rejectionReason}
                          </p>
                        </div>
                      )}

                    {/* Items */}
                    <div>
                      <h4 className="text-sm font-semibold tracking-tighter mb-2 flex items-center gap-1">
                        <Package size={14} className="text-primary" />
                        Vật phẩm ({detailItems.length})
                      </h4>
                      {loadingDetailItems ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, idx) => (
                            <Skeleton
                              key={idx}
                              className="h-16 w-full rounded-xl"
                            />
                          ))}
                        </div>
                      ) : detailItems.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
                          <p className="text-sm text-muted-foreground tracking-tighter">
                            Không có danh sách vật phẩm chi tiết
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {detailItems.map((item, idx) => (
                            <motion.div
                              key={item.id || idx}
                              className="rounded-lg border border-border/60 bg-background p-2.5"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.22,
                                delay: idx * 0.04,
                                ease: "easeOut",
                              }}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-sm font-semibold tracking-tighter">
                                  {item.itemName}
                                </p>
                                <span className="text-sm font-bold text-emerald-600 shrink-0">
                                  {formatMoney(
                                    item.totalPrice ??
                                      item.quantity * item.unitPrice,
                                  )}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground tracking-tighter">
                                <span>
                                  SL: {item.quantity} {item.unit}
                                </span>
                                <span>
                                  Đơn giá: {formatMoney(item.unitPrice)}
                                </span>
                                {hasMeasurementValue(item.volumePerUnit) && (
                                  <span>
                                    Thể tích/đv:{" "}
                                    {formatMeasurementNumber(
                                      item.volumePerUnit,
                                    )}{" "}
                                    dm3
                                  </span>
                                )}
                                {hasMeasurementValue(item.weightPerUnit) && (
                                  <span>
                                    Cân nặng/đv:{" "}
                                    {formatMeasurementNumber(
                                      item.weightPerUnit,
                                    )}{" "}
                                    kg
                                  </span>
                                )}
                                <span>
                                  Danh mục:{" "}
                                  {categoryMap[item.categoryCode] ??
                                    item.categoryCode}
                                </span>
                                {(item.notes || item.description) && (
                                  <span>
                                    Ghi chú: {item.notes ?? item.description}
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailItem(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
