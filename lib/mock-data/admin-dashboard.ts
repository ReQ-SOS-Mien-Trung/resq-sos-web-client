import type {
  DashboardData,
  SummaryMetric,
  RevenueChartData,
  CalendarData,
  LeadsData,
  TopCountriesData,
  RetentionRateData,
  FavoriteItem,
  Project,
  CloudStorage,
} from "@/types/admin-dashboard";

export const mockSummaryMetrics: SummaryMetric[] = [
  {
    label: "Leads",
    value: "129",
    change: 2,
    changeType: "increase",
    comparison: "vs last week",
  },
  {
    label: "CLV",
    value: "14d",
    change: 4,
    changeType: "increase",
    comparison: "vs last week",
  },
  {
    label: "Conversion Rate",
    value: "24%",
    change: 2,
    changeType: "increase",
    comparison: "vs last week",
  },
  {
    label: "Revenue",
    value: "$1.4K",
    change: 4,
    changeType: "increase",
    comparison: "vs last month",
  },
];

export const mockRevenueData: RevenueChartData = {
  currentValue: 32209,
  change: 22,
  changeType: "increase",
  timeFrame: "1Y",
  data: [
    { month: "Mar", value: 18500, date: "2025-03-01" },
    { month: "Apr", value: 19200, date: "2025-04-01" },
    { month: "May", value: 21000, date: "2025-05-01" },
    { month: "Jun", value: 22500, date: "2025-06-01" },
    { month: "Jul", value: 23800, date: "2025-07-01" },
    { month: "Aug", value: 25100, date: "2025-08-01" },
    { month: "Sep", value: 18202, date: "2025-09-01" },
    { month: "Oct", value: 26500, date: "2025-10-01" },
    { month: "Nov", value: 28000, date: "2025-11-01" },
    { month: "Dec", value: 29500, date: "2025-12-01" },
    { month: "Jan", value: 31000, date: "2026-01-01" },
    { month: "Feb", value: 32209, date: "2026-02-01" },
  ],
};

export const mockCalendarData: CalendarData = {
  currentMonth: "October",
  currentYear: 2025,
  highlightedDate: 8,
  meetings: [
    {
      id: "1",
      title: "Mesh Weekly Meeting",
      time: "9:00 am - 10:00 am",
      duration: "1h",
      participants: 10,
      platform: "Google Meet",
      link: "https://meet.google.com/xxx",
    },
    {
      id: "2",
      title: "Gamification Demo",
      time: "10:45 am - 11:45 am",
      duration: "1h",
      participants: 8,
      platform: "Slack",
      link: "https://slack.com/xxx",
    },
  ],
};

export const mockLeadsData: LeadsData = {
  status: [
    { name: "Qualified", value: 85, percentage: 65 },
    { name: "Contacted", value: 45, percentage: 35 },
    { name: "Lost", value: 12, percentage: 9 },
    { name: "Won", value: 38, percentage: 29 },
  ],
  sources: [
    { name: "Website", value: 52, percentage: 40 },
    { name: "Social Media", value: 35, percentage: 27 },
    { name: "Referral", value: 28, percentage: 22 },
    { name: "Email", value: 14, percentage: 11 },
  ],
  qualification: [
    { name: "High", value: 48, percentage: 37 },
    { name: "Medium", value: 55, percentage: 43 },
    { name: "Low", value: 26, percentage: 20 },
  ],
};

export const mockTopCountriesData: TopCountriesData = {
  countries: [
    { name: "Australia", percentage: 48, code: "AU" },
    { name: "Malaysia", percentage: 33, code: "MY" },
    { name: "Indonesia", percentage: 25, code: "ID" },
    { name: "Singapore", percentage: 17, code: "SG" },
  ],
};

export const mockRetentionData: RetentionRateData = {
  currentRate: 95,
  change: 12,
  changeType: "increase",
  segments: [
    { name: "SMEs", color: "#c084fc", value: 35 }, // Light purple
    { name: "Startups", color: "#a855f7", value: 30 }, // Medium purple
    { name: "Enterprises", color: "#9333ea", value: 30 }, // Dark purple
  ],
  monthlyData: [
    {
      month: "Jun",
      segments: { SMEs: 28, Startups: 25, Enterprises: 22 },
      total: 75,
    },
    {
      month: "Jul",
      segments: { SMEs: 30, Startups: 26, Enterprises: 24 },
      total: 80,
    },
    {
      month: "Aug",
      segments: { SMEs: 32, Startups: 27, Enterprises: 26 },
      total: 85,
    },
    {
      month: "Sep",
      segments: { SMEs: 33, Startups: 28, Enterprises: 27 },
      total: 88,
    },
    {
      month: "Oct",
      segments: { SMEs: 34, Startups: 29, Enterprises: 28 },
      total: 91,
    },
    {
      month: "Nov",
      segments: { SMEs: 35, Startups: 29, Enterprises: 29 },
      total: 93,
    },
    {
      month: "Dec",
      segments: { SMEs: 35, Startups: 30, Enterprises: 30 },
      total: 95,
    },
  ],
};

export const mockFavorites: FavoriteItem[] = [
  { id: "1", name: "Companies", count: 1212 },
  { id: "2", name: "Contacts", count: 898 },
  { id: "3", name: "Meetings", count: 32 },
];

export const mockProjects: Project[] = [
  { id: "1", name: "Project Alpha", status: "active" },
  { id: "2", name: "Project Beta", status: "active" },
  { id: "3", name: "Project Gamma", status: "completed" },
];

export const mockCloudStorage: CloudStorage = {
  used: 1.8,
  total: 2,
  percentage: 90,
  unit: "GB",
};

export const getDashboardData = async (): Promise<DashboardData> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  return {
    summaryMetrics: mockSummaryMetrics,
    revenue: mockRevenueData,
    calendar: mockCalendarData,
    leads: mockLeadsData,
    topCountries: mockTopCountriesData,
    retention: mockRetentionData,
    favorites: mockFavorites,
    projects: mockProjects,
    cloudStorage: mockCloudStorage,
  };
};
