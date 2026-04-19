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

// ─── Personnel Dashboard: Rescuers Daily Statistics ───

export type ChangeDirection = "increase" | "decrease" | "no_change" | "new";

export interface DailyChange {
  currentCount: number;
  previousCount: number;
  changeValue: number;
  changePercent: number | null;
  changeDirection: ChangeDirection;
  comparisonPeriod: string;
  comparisonLabel: string;
}

export interface RescuersDailyStatisticsResponse {
  totalRescuers: number;
  dailyChange: DailyChange;
}

// ─── Personnel Dashboard: Mission Success Rate Summary ───

export interface MissionSuccessRateSummaryResponse {
  successRate: number;
  changePercent: number;
  changeDirection: ChangeDirection;
  comparisonLabel: string;
}

// ─── Personnel Dashboard: SOS Requests Summary ───

export interface SosRequestsSummaryResponse {
  totalSosRequests: number;
  changePercent: number | null;
  changeDirection: ChangeDirection;
  comparisonLabel: string;
}
