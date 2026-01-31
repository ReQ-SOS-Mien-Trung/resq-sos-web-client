interface Ticker {
  market: {
    name: string;
  };
  base: string;
  target: string;
  converted_last: {
    usd: number;
  };
  timestamp: string;
  trade_url: string;
}

export interface Testimonial {
  id: string;
  orgName: string;
  orgIcon: React.ReactNode;
  headline: string;
  highlightText: string;
  quote: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
}

type Period =
  | "daily"
  | "weekly"
  | "monthly"
  | "3months"
  | "6months"
  | "yearly"
  | "max";

// Based on the Hybrid Logic: Backend (PostGIS + Gemini AI)
export type Priority = "P1" | "P2" | "P3";
export type RescuerType = "TRUCK" | "MOTORBOAT" | "SMALL_BOAT";
export type SOSStatus = "PENDING" | "ASSIGNED" | "RESCUED";
export type RescuerStatus = "AVAILABLE" | "BUSY";

export interface Location {
  lat: number;
  lng: number;
}

export interface SOSRequest {
  id: string;
  groupId: string;
  location: Location;
  priority: Priority;
  needs: {
    medical: boolean;
    food: boolean;
    boat: boolean;
  };
  status: SOSStatus;
  message: string;
  createdAt: Date;
  aiAnalysis?: {
    riskFactors: string[];
  };
}

export interface Rescuer {
  id: string;
  name: string;
  type: RescuerType;
  status: RescuerStatus;
  location: Location;
  currentLoad: number;
  capacity: number;
  capabilities: string[];
}

export interface Depot {
  id: string;
  name: string;
  location: Location;
  inventory: {
    lifeJackets: number;
    foodPacks: number;
    medKits: number;
  };
}

export interface SOSCluster {
  id: string;
  center: Location;
  sosRequests: SOSRequest[];
  highestPriority: Priority;
  totalVictims: number;
}

// AI Dispatch Decision
export interface AIDispatchDecision {
  clusterId: string;
  situation: string;
  reasoning: string;
  proposedPlan: MissionStep[];
  recommendedRescuer: Rescuer;
  alternativeRescuers: Rescuer[];
  confidence: number; // 0-100
}

export interface MissionStep {
  stepNumber: number;
  action:
    | "PICKUP_SUPPLIES"
    | "GO_TO_VICTIM"
    | "TRANSPORT_TO_SAFETY"
    | "RETURN_TO_BASE";
  location: Location;
  locationName: string;
  details: string;
  estimatedTime: number; // minutes
}

export interface Mission {
  id: string;
  rescuerId: string;
  clusterId: string;
  sosRequestIds: string[];
  status: "PENDING_APPROVAL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  steps: MissionStep[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Map state
export interface MapViewState {
  center: Location;
  zoom: number;
}

export type SOSItem = {
  image: string;
  title: string;
  slug: string;
  location: string;
  date: string;
  time: string;
};

export interface CalendarWidgetProps {
  data: CalendarData;
}

export type WeatherApiCurrentResponse = {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    localtime: string;
  };
  current: {
    last_updated: string;
    temp_c: number;
    humidity: number;
    wind_degree: number;
    wind_dir: string;
    wind_kph: number;
    precip_mm: number;
    condition: {
      text: string;
      icon: string;
    };
  };
};

//Admin types
export interface UserFiltersProps {
  filters: UserFiltersType;
  onFiltersChange: (filters: UserFiltersType) => void;
}

export interface VerificationQueueProps {
  verifications: RescuerVerification[];
  onView?: (verification: RescuerVerification) => void;
  onApprove?: (verification: RescuerVerification) => void;
  onReject?: (verification: RescuerVerification) => void;
}

export interface RescuerProfileProps {
  verification: RescuerVerification;
}

export interface DocumentViewerProps {
  verification: RescuerVerification;
  onVerify?: (docId: string) => void;
  onReject?: (docId: string) => void;
}

export interface RescuerListProps {
  registrations: RescuerRegistration[];
  onView?: (registration: RescuerRegistration) => void;
  onApprove?: (registration: RescuerRegistration) => void;
  onReject?: (registration: RescuerRegistration) => void;
}

export interface RegistrationFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export interface ReportTableProps {
  reports: RescueReport[];
  onView?: (report: RescueReport) => void;
  onDownload?: (report: RescueReport) => void;
}

export interface ReportStatsProps {
  stats: ReportStatsType;
}

export interface ReportFiltersProps {
  filters: {
    type?: RescueReport["type"];
    status?: RescueReport["status"];
    region?: string;
    search?: string;
  };
  onFiltersChange: (filters: any) => void;
  onExport?: () => void;
}

export interface PromptEditorProps {
  prompt?: AIPrompt;
  onSave: (prompt: Partial<AIPrompt>) => void;
  onCancel: () => void;
}

export interface PromptPreviewProps {
  prompt: string;
  variables: string[];
  onTest?: (input: Record<string, string>) => void;
}

export interface PromptTemplatesProps {
  templates: PromptTemplate[];
  onUseTemplate?: (template: PromptTemplate) => void;
}

export interface ChatRoomListProps {
  rooms: ChatRoom[];
  onEdit?: (room: ChatRoom) => void;
  onDelete?: (room: ChatRoom) => void;
}

export interface ChatSettingsProps {
  room: ChatRoom;
  onSave: (settings: ChatRoom["settings"]) => void;
  onCancel: () => void;
}

export interface MessageTemplatesProps {
  templates: MessageTemplate[];
  onEdit?: (template: MessageTemplate) => void;
  onDelete?: (template: MessageTemplate) => void;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  favorites: FavoriteItem[];
  projects: Project[];
  cloudStorage: CloudStorage;
}

export interface HeaderProps {
  onSidebarToggle?: () => void;
  sidebarOpen?: boolean;
}

export interface LeadsManagementProps {
  data: LeadsData;
}

export interface RetentionRateProps {
  data: RetentionRateData;
}

export interface RevenueChartProps {
  data: RevenueChartData;
}

//Admin Dashboard Types
export type PageLoadingProps = {
  title?: string;
  subtitle?: string;
  className?: string;
};

export interface TopCountriesProps {
  data: TopCountriesData;
}

export interface SummaryCardsProps {
  metrics: SummaryMetric[];
}

export interface SidebarProps {
  favorites: FavoriteItem[];
  projects: Project[];
  cloudStorage: CloudStorage;
  isOpen?: boolean;
}

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

//Weather & Flood & Post Types
export interface WeatherPostCardProps {
  post: WeatherPost;
  onEdit?: (post: WeatherPost) => void;
  onDelete?: (post: WeatherPost) => void;
  onView?: (post: WeatherPost) => void;
}

export interface PostSchedulerProps {
  onSchedule: (date: string, time: string) => void;
  onCancel: () => void;
}

export interface PostEditorProps {
  post?: WeatherPost;
  onSave: (post: Partial<WeatherPost>) => void;
  onCancel: () => void;
}

export interface WeatherMapProps {
  floodAlerts: FloodAlert[];
}

export type WeatherApiCurrentPoint =
  | {
      name: string;
      lat: number;
      lon: number;
      localtime: string;
      last_updated: string;
      temp_c: number;
      humidity: number;
      wind_degree: number;
      wind_dir: string;
      wind_kph: number;
      precip_mm: number;
      condition_text: string;
      condition_icon: string;
    }
  | {
      name: string;
      q: string;
      error: string;
    };

export interface WeatherChartProps {
  data: WeatherData[];
}

export interface FloodAlertsProps {
  alerts: FloodAlert[];
  onView?: (alert: FloodAlert) => void;
  onResolve?: (alert: FloodAlert) => void;
}

// User Management Types
export interface UserTableProps {
  users: User[];
  filters?: UserFilters;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  onBan?: (user: User) => void;
  onActivate?: (user: User) => void;
}

export interface UserStatsProps {
  stats: UserStatsType;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "coordinator" | "rescuer" | "citizen";
  status: "active" | "pending" | "banned" | "inactive";
  region: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface UserStats {
  total: number;
  active: number;
  pending: number;
  banned: number;
}

export interface UserFilters {
  role?: User["role"];
  status?: User["status"];
  region?: string;
  search?: string;
}

// Weather Posts Types
export interface WeatherPost {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  publishDate: string;
  scheduledDate?: string;
  status: "published" | "draft" | "scheduled";
  author: string;
  views: number;
  category: "weather" | "flood" | "alert" | "general";
}

// Weather & Flood Types
export interface WeatherData {
  region: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  condition: "sunny" | "cloudy" | "rainy" | "stormy";
  timestamp: string;
}

export interface FloodAlert {
  id: string;
  region: string;
  level: "low" | "medium" | "high" | "critical";
  status: "active" | "resolved" | "monitoring";
  description: string;
  coordinates: { lat: number; lng: number };
  createdAt: string;
  updatedAt: string;
  affectedAreas: string[];
}

// Reports Types
export interface RescueReport {
  id: string;
  title: string;
  type: "rescue" | "evacuation" | "supply" | "medical" | "other";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  location: string;
  region: string;
  date: string;
  reporter: string;
  description: string;
  casualties?: number;
  rescued?: number;
  fileUrl?: string;
}

export interface ReportStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

// Rescuer Registration Types
export interface RescuerRegistration {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  experience: string;
  skills: string[];
  documents: {
    id: string;
    type: "id" | "certificate" | "license" | "other";
    url: string;
    name: string;
  }[];
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  notes?: string;
}

// AI Prompt Types
export interface AIPrompt {
  id: string;
  name: string;
  category: "dispatch" | "classification" | "recommendation" | "other";
  prompt: string;
  variables: string[];
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  testResults?: {
    input: string;
    output: string;
    timestamp: string;
  }[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  category: AIPrompt["category"];
  template: string;
  description: string;
}

// Chat Config Types
export interface ChatRoom {
  id: string;
  name: string;
  type: "public" | "private" | "support";
  status: "active" | "inactive" | "archived";
  participants: number;
  lastMessage?: string;
  lastMessageAt?: string;
  settings: {
    autoReply: boolean;
    maxParticipants?: number;
    allowFileUpload: boolean;
    moderation: boolean;
  };
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: "greeting" | "response" | "escalation" | "closing";
  variables?: string[];
}

export interface AutoReplyRule {
  id: string;
  trigger: string;
  response: string;
  priority: number;
  enabled: boolean;
}

// Rescuer Verification Types
export interface RescuerVerification {
  id: string;
  rescuerId: string;
  rescuerName: string;
  email: string;
  phone: string;
  region: string;
  status: "pending" | "verified" | "rejected";
  documents: {
    id: string;
    type: "id" | "certificate" | "license" | "background-check" | "other";
    url: string;
    name: string;
    verified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
  }[];
  profile: {
    experience: string;
    skills: string[];
    certifications: string[];
    previousWork?: string;
  };
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  comments?: string;
  history: {
    action: "submitted" | "reviewed" | "approved" | "rejected" | "updated";
    timestamp: string;
    by?: string;
    note?: string;
  }[];
}
