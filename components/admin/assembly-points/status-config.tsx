import type { ReactNode } from "react";
import {
  CheckCircle,
  Clock,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import type {
  AssemblyPointStatus,
  AssemblyPointStatusMetadata,
} from "@/services/assembly_points/type";

export const ASSEMBLY_POINT_STATUS_ORDER: AssemblyPointStatus[] = [
  "Created",
  "Active",
  "Unavailable",
  "Closed",
];

interface AssemblyPointStatusStyle {
  fallbackLabel: string;
  color: string;
  bg: string;
  icon: ReactNode;
}

export interface AssemblyPointStatusConfig {
  label: string;
  color: string;
  bg: string;
  className: string;
  icon: ReactNode;
}

export type AssemblyPointStatusConfigMap = Record<
  AssemblyPointStatus,
  AssemblyPointStatusConfig
>;

const STATUS_STYLE: Record<AssemblyPointStatus, AssemblyPointStatusStyle> = {
  Created: {
    fallbackLabel: "Mới tạo",
    color: "text-sky-700",
    bg: "bg-sky-500/10 border-sky-200",
    icon: <Clock size={20} weight="fill" className="text-sky-500" />,
  },
  Active: {
    fallbackLabel: "Đang hoạt động",
    color: "text-emerald-700",
    bg: "bg-emerald-500/10 border-emerald-200",
    icon: <CheckCircle size={20} weight="fill" className="text-emerald-500" />,
  },
  Unavailable: {
    fallbackLabel: "Không khả dụng",
    color: "text-amber-700",
    bg: "bg-amber-500/10 border-amber-200",
    icon: <WarningCircle size={20} weight="fill" className="text-amber-500" />,
  },
  Closed: {
    fallbackLabel: "Đã đóng",
    color: "text-red-700",
    bg: "bg-red-500/10 border-red-200",
    icon: <XCircle size={20} weight="fill" className="text-red-500" />,
  },
};

export const FALLBACK_ASSEMBLY_POINT_STATUS_CONFIG: AssemblyPointStatusConfig =
  {
    label: "Không xác định",
    color: "text-slate-700",
    bg: "bg-slate-500/10 border-slate-200",
    className: "bg-slate-500/10 border-slate-200 text-slate-700",
    icon: <WarningCircle size={20} weight="fill" className="text-slate-500" />,
  };

export function buildAssemblyPointStatusConfig(
  metadata?: AssemblyPointStatusMetadata[],
): AssemblyPointStatusConfigMap {
  const metadataMap = new Map(metadata?.map((item) => [item.key, item.value]));
  const config = {} as AssemblyPointStatusConfigMap;

  for (const status of ASSEMBLY_POINT_STATUS_ORDER) {
    const style = STATUS_STYLE[status];
    const label = metadataMap.get(status) ?? style.fallbackLabel;

    config[status] = {
      label,
      color: style.color,
      bg: style.bg,
      className: `${style.bg} ${style.color}`,
      icon: style.icon,
    };
  }

  return config;
}

export function getAssemblyPointStatusConfig(
  status: string | null | undefined,
  config: AssemblyPointStatusConfigMap,
): AssemblyPointStatusConfig {
  if (!status) return FALLBACK_ASSEMBLY_POINT_STATUS_CONFIG;

  return (
    config[status as AssemblyPointStatus] ??
    FALLBACK_ASSEMBLY_POINT_STATUS_CONFIG
  );
}
