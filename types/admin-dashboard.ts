export interface SummaryMetric {
  label: string;
  value: string;
  change: number;
  changeType: "increase" | "decrease";
  comparison: string;
}

export interface RevenueDataPoint {
  month: string;
  value: number;
  date: string;
}

export interface RevenueChartData {
  currentValue: number;
  change: number;
  changeType: "increase" | "decrease";
  timeFrame: "1D" | "1W" | "1M" | "6M" | "1Y" | "ALL";
  data: RevenueDataPoint[];
}

export interface CalendarMeeting {
  id: string;
  title: string;
  time: string;
  duration: string;
  participants: number;
  platform: "Google Meet" | "Slack" | "Zoom" | "Teams";
  link?: string;
}

export interface CalendarData {
  currentMonth: string;
  currentYear: number;
  highlightedDate: number;
  meetings: CalendarMeeting[];
}

export interface LeadsCategory {
  name: string;
  value: number;
  percentage: number;
}

export interface LeadsData {
  status: LeadsCategory[];
  sources: LeadsCategory[];
  qualification: LeadsCategory[];
}

export interface CountryData {
  name: string;
  percentage: number;
  code?: string;
}

export interface TopCountriesData {
  countries: CountryData[];
}

export interface RetentionSegment {
  name: string;
  color: string;
  value: number;
}

export interface RetentionDataPoint {
  month: string;
  segments: {
    [key: string]: number;
  };
  total: number;
}

export interface RetentionRateData {
  currentRate: number;
  change: number;
  changeType: "increase" | "decrease";
  segments: RetentionSegment[];
  monthlyData: RetentionDataPoint[];
}

export interface FavoriteItem {
  id: string;
  name: string;
  count: number;
  icon?: string;
}

export interface Project {
  id: string;
  name: string;
  status: "active" | "completed" | "archived";
}

export interface CloudStorage {
  used: number;
  total: number;
  percentage: number;
  unit: "GB" | "TB";
}

export interface DashboardData {
  summaryMetrics: SummaryMetric[];
  revenue: RevenueChartData;
  calendar: CalendarData;
  leads: LeadsData;
  topCountries: TopCountriesData;
  retention: RetentionRateData;
  favorites: FavoriteItem[];
  projects: Project[];
  cloudStorage: CloudStorage;
}
