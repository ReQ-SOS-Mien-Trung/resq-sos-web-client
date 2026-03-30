// ─── SOS Statuses Metadata ───

export interface SosStatusOption {
  key: string;
  value: string;
}

// ─── Victims by Period ───

export interface VictimsByPeriodParams {
  from?: string;
  to?: string;
  granularity?: "day" | "week" | "month";
  statuses?: string[];
}

export interface VictimsByPeriodItem {
  period: string;
  totalVictims: number;
}

export type VictimsByPeriodResponse = VictimsByPeriodItem[];
