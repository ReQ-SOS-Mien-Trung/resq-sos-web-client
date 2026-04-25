export type InventoryActionTone =
  | "emerald"
  | "red"
  | "orange"
  | "blue"
  | "teal"
  | "purple"
  | "amber"
  | "slate"
  | "cyan";

export interface InventoryActionFallback {
  label: string;
  className: string;
  tone: InventoryActionTone;
}

export const INVENTORY_ACTION_TYPE_FALLBACKS: Record<
  string,
  InventoryActionFallback
> = {
  Import: {
    label: "Nhập kho",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    tone: "emerald",
  },
  Export: {
    label: "Xuất kho",
    className: "bg-red-100 text-red-700 border-red-200",
    tone: "red",
  },
  Adjust: {
    label: "Điều chỉnh",
    className: "bg-orange-100 text-orange-700 border-orange-200",
    tone: "orange",
  },
  Adjustment: {
    label: "Điều chỉnh",
    className: "bg-orange-100 text-orange-700 border-orange-200",
    tone: "orange",
  },
  Return: {
    label: "Hoàn trả",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    tone: "blue",
  },
  TransferIn: {
    label: "Chuyển nhập",
    className: "bg-teal-100 text-teal-700 border-teal-200",
    tone: "teal",
  },
  TransferOut: {
    label: "Chuyển xuất",
    className: "bg-purple-100 text-purple-700 border-purple-200",
    tone: "purple",
  },
  Reserve: {
    label: "Giữ hàng",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    tone: "amber",
  },
  ReleaseReserve: {
    label: "Hủy giữ hàng",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    tone: "slate",
  },
  MissionPickup: {
    label: "Xuất cho nhiệm vụ",
    className: "bg-red-100 text-red-700 border-red-200",
    tone: "red",
  },
  MissionReturn: {
    label: "Hoàn trả từ nhiệm vụ",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    tone: "blue",
  },
  DepotTransfer: {
    label: "Chuyển kho",
    className: "bg-purple-100 text-purple-700 border-purple-200",
    tone: "purple",
  },
  DepotTransferIn: {
    label: "Nhập chuyển kho",
    className: "bg-teal-100 text-teal-700 border-teal-200",
    tone: "teal",
  },
  DepotTransferOut: {
    label: "Xuất chuyển kho",
    className: "bg-purple-100 text-purple-700 border-purple-200",
    tone: "purple",
  },
  DepotClosure: {
    label: "Đóng kho",
    className: "bg-cyan-100 text-cyan-700 border-cyan-200",
    tone: "cyan",
  },
  DepotClosureTransfer: {
    label: "Điều chuyển đóng kho",
    className: "bg-purple-100 text-purple-700 border-purple-200",
    tone: "purple",
  },
  DepotClosureExternalDisposal: {
    label: "Xử lý ngoài khi đóng kho",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    tone: "slate",
  },
  Disposal: {
    label: "Tiêu hủy",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    tone: "slate",
  },
  Decommission: {
    label: "Loại biên",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    tone: "slate",
  },
  PurchaseImport: {
    label: "Nhập mua",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    tone: "emerald",
  },
  DonationImport: {
    label: "Nhập quyên góp",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    tone: "emerald",
  },
};

export const INVENTORY_SOURCE_TYPE_FALLBACKS: Record<string, string> = {
  Donation: "Quyên góp",
  Purchase: "Mua sắm",
  VatInvoice: "Hóa đơn VAT",
  FundingRequest: "Yêu cầu cấp quỹ",
  Mission: "Nhiệm vụ",
  MissionPickup: "Lấy hàng nhiệm vụ",
  MissionReturn: "Hoàn trả nhiệm vụ",
  SupplyRequest: "Yêu cầu tiếp tế",
  DepotTransfer: "Chuyển kho",
  DepotClosure: "Đóng kho",
  DepotClosureTransfer: "Điều chuyển đóng kho",
  DepotClosureExternalResolution: "Xử lý ngoài khi đóng kho",
  DepotClosureExternalDisposal: "Tiêu hủy ngoài khi đóng kho",
  Adjustment: "Điều chỉnh",
  ManualAdjustment: "Điều chỉnh thủ công",
  InventoryDisposal: "Tiêu hủy tồn kho",
  Decommission: "Loại biên",
  Manual: "Thủ công",
};

export function humanizeInventoryEnum(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
}

export function getInventoryActionFallback(
  actionType: string | null | undefined,
): InventoryActionFallback {
  const key = String(actionType ?? "").trim();
  return (
    INVENTORY_ACTION_TYPE_FALLBACKS[key] ?? {
      label: humanizeInventoryEnum(key),
      className: "bg-muted text-muted-foreground border-border",
      tone: "slate",
    }
  );
}

export function getInventorySourceLabelFallback(
  sourceType: string | null | undefined,
): string {
  const key = String(sourceType ?? "").trim();
  return INVENTORY_SOURCE_TYPE_FALLBACKS[key] ?? humanizeInventoryEnum(key);
}
