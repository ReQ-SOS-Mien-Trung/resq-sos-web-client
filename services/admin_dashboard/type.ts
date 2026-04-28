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

// ─── Personnel Dashboard: Mission Team Reports Summary ───

export interface MissionTeamReportsSummaryResponse {
  totalCompletedTeams: number;
  notStartedCount: number;
  draftCount: number;
  submittedCount: number;
  submissionRate: number;
}

// ─── Personnel Dashboard: SOS Requests Summary ───

export interface SosRequestsSummaryResponse {
  totalSosRequests: number;
  changePercent: number | null;
  changeDirection: ChangeDirection;
  comparisonLabel: string;
}

// ─── Personnel Dashboard: Rescuers Overview ───

export interface RescuerOverviewTotals {
  total: number;
  core: number;
  volunteer: number;
  active: number;
  banned: number;
}

export interface RescuerOverviewThisMonth {
  month: number;
  year: number;
  newCount: number;
  previousNewCount: number;
  growthPercent: number;
}

export interface RescuerOverviewPeakMonth {
  month: number;
  year: number;
  monthLabel: string;
  newCount: number;
}

export interface RescuerOverviewMonthlyItem {
  month: number;
  year: number;
  monthLabel: string;
  total: number;
  newCount: number;
  core: number;
  volunteer: number;
}

export interface RescuerOverviewResponse {
  generatedAt: string;
  timezone: string;
  totals: RescuerOverviewTotals;
  thisMonth: RescuerOverviewThisMonth;
  peakMonth: RescuerOverviewPeakMonth;
  monthly: RescuerOverviewMonthlyItem[];
}
