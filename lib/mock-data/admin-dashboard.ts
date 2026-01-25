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
    label: "Yêu cầu SOS",
    value: "156",
    change: 12,
    changeType: "increase",
    comparison: "so với tuần trước",
  },
  {
    label: "Cứu hộ viên",
    value: "89",
    change: 8,
    changeType: "increase",
    comparison: "đang hoạt động",
  },
  {
    label: "Tỷ lệ thành công",
    value: "94%",
    change: 3,
    changeType: "increase",
    comparison: "so với tháng trước",
  },
  {
    label: "Thời gian phản hồi",
    value: "8 phút",
    change: 15,
    changeType: "decrease",
    comparison: "so với tuần trước",
  },
];

export const mockRevenueData: RevenueChartData = {
  currentValue: 1245,
  change: 18,
  changeType: "increase",
  timeFrame: "1Y",
  data: [
    { month: "T3", value: 85, date: "2025-03-01" },
    { month: "T4", value: 92, date: "2025-04-01" },
    { month: "T5", value: 78, date: "2025-05-01" },
    { month: "T6", value: 145, date: "2025-06-01" },
    { month: "T7", value: 168, date: "2025-07-01" },
    { month: "T8", value: 132, date: "2025-08-01" },
    { month: "T9", value: 198, date: "2025-09-01" },
    { month: "T10", value: 245, date: "2025-10-01" },
    { month: "T11", value: 178, date: "2025-11-01" },
    { month: "T12", value: 112, date: "2025-12-01" },
    { month: "T1", value: 156, date: "2026-01-01" },
    { month: "T2", value: 142, date: "2026-02-01" },
  ],
};

export const mockCalendarData: CalendarData = {
  currentMonth: "Tháng 1",
  currentYear: 2026,
  highlightedDate: 25,
  meetings: [
    {
      id: "1",
      title: "Họp điều phối cứu hộ",
      time: "8:00 SA - 9:00 SA",
      duration: "1h",
      participants: 15,
      platform: "Google Meet",
      link: "https://meet.google.com/xxx",
    },
    {
      id: "2",
      title: "Tập huấn cứu hộ viên mới",
      time: "14:00 CH - 16:00 CH",
      duration: "2h",
      participants: 25,
      platform: "Zoom",
      link: "https://zoom.us/xxx",
    },
  ],
};

export const mockLeadsData: LeadsData = {
  status: [
    { name: "Đang xử lý", value: 45, percentage: 29 },
    { name: "Hoàn thành", value: 98, percentage: 63 },
    { name: "Đang chờ", value: 18, percentage: 12 },
    { name: "Hủy bỏ", value: 5, percentage: 3 },
  ],
  sources: [
    { name: "Ứng dụng SOS", value: 78, percentage: 50 },
    { name: "Hotline", value: 42, percentage: 27 },
    { name: "Website", value: 25, percentage: 16 },
    { name: "Báo cáo trực tiếp", value: 11, percentage: 7 },
  ],
  qualification: [
    { name: "Khẩn cấp", value: 38, percentage: 24 },
    { name: "Trung bình", value: 75, percentage: 48 },
    { name: "Thấp", value: 43, percentage: 28 },
  ],
};

export const mockTopCountriesData: TopCountriesData = {
  countries: [
    { name: "Đà Nẵng", percentage: 35, code: "DN" },
    { name: "Quảng Nam", percentage: 28, code: "QN" },
    { name: "Thừa Thiên Huế", percentage: 22, code: "TTH" },
    { name: "Quảng Ngãi", percentage: 15, code: "QNG" },
  ],
};

export const mockRetentionData: RetentionRateData = {
  currentRate: 94,
  change: 5,
  changeType: "increase",
  segments: [
    { name: "Lũ lụt", color: "#ef4444", value: 45 },
    { name: "Sạt lở", color: "#f97316", value: 30 },
    { name: "Bão", color: "#eab308", value: 25 },
  ],
  monthlyData: [
    {
      month: "T6",
      segments: { "Lũ lụt": 15, "Sạt lở": 8, Bão: 5 },
      total: 28,
    },
    {
      month: "T7",
      segments: { "Lũ lụt": 18, "Sạt lở": 10, Bão: 8 },
      total: 36,
    },
    {
      month: "T8",
      segments: { "Lũ lụt": 22, "Sạt lở": 12, Bão: 10 },
      total: 44,
    },
    {
      month: "T9",
      segments: { "Lũ lụt": 35, "Sạt lở": 18, Bão: 15 },
      total: 68,
    },
    {
      month: "T10",
      segments: { "Lũ lụt": 48, "Sạt lở": 25, Bão: 22 },
      total: 95,
    },
    {
      month: "T11",
      segments: { "Lũ lụt": 42, "Sạt lở": 20, Bão: 18 },
      total: 80,
    },
    {
      month: "T12",
      segments: { "Lũ lụt": 28, "Sạt lở": 12, Bão: 8 },
      total: 48,
    },
  ],
};

export const mockFavorites: FavoriteItem[] = [
  { id: "1", name: "Cứu hộ viên", count: 89 },
  { id: "2", name: "Cảnh báo", count: 12 },
  { id: "3", name: "Hoạt động", count: 156 },
];

export const mockProjects: Project[] = [
  { id: "1", name: "Đà Nẵng", status: "active" },
  { id: "2", name: "Quảng Nam", status: "active" },
  { id: "3", name: "Thừa Thiên Huế", status: "active" },
  { id: "4", name: "Quảng Ngãi", status: "active" },
  { id: "5", name: "Quảng Bình", status: "active" },
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
