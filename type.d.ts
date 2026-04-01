import type {
  PromptEntity,
  PromptDetailEntity,
  CreatePromptRequest,
  UpdatePromptRequest,
} from "@/services/prompt/type";
import type {
  MedicalSupportNeedType,
  SOSClothingPerson,
  SOSSpecialDietPerson,
  SOSStructuredData,
  SOSSupplyDetails,
} from "@/services/sos_request/type";

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
export type Priority = "P1" | "P2" | "P3" | "P4";
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
  receivedAt?: Date | null;
  aiAnalysis?: {
    riskFactors: string[];
  };
  injuredPersons?: Array<{
    index: number;
    name: string;
    customName?: string | null;
    personType?: string;
    medicalIssues?: string[];
    severity?: string;
  }>;
  // Extended fields from backend structuredData / victimInfo / reporterInfo
  peopleCount?: { adult: number; child: number; elderly: number };
  waitTimeMinutes?: number;
  sosType?: string;
  situation?: string;
  medicalIssues?: string[];
  supplies?: string[];
  canMove?: boolean;
  hasInjured?: boolean;
  othersAreStable?: boolean;
  additionalDescription?: string;
  otherSupplyDescription?: string | null;
  structuredData?: SOSStructuredData | null;
  supplyDetails?: SOSSupplyDetails | null;
  specialDietPersons?: SOSSpecialDietPerson[];
  clothingPersons?: SOSClothingPerson[];
  medicalSupportNeeds?: MedicalSupportNeedType[];
  medicalDescription?: string | null;
  waterDuration?: string | null;
  waterRemaining?: string | null;
  foodDuration?: string | null;
  areBlanketsEnough?: boolean | null;
  blanketRequestCount?: number | null;
  address?: string | null;
  victimPhone?: string;
  victimName?: string;
  reporterPhone?: string;
  reporterName?: string;
  createdByCoordinatorId?: string | null;
  createdByCoordinatorName?: string | null;
  isSentOnBehalf?: boolean;
  reporterIsOnline?: boolean;
  hopCount?: number;
  locationAccuracy?: number | null;
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

// Depot type for map display (matches backend DepotEntity)
export interface Depot {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  currentUtilization: number;
  status: "Available" | "Full" | "PendingAssignment" | "Closed";
  manager: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string;
  } | null;
  lastUpdatedAt: string;
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

// AI Prompt Page Types
export type EditorMode = "closed" | "creating" | "editing";

export type PromptTextField = "system_prompt" | "user_prompt_template";

export interface PromptFormData {
  name: string;
  purpose: string;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  version: string;
  api_url: string;
  is_active: boolean;
}

export interface PromptEditorProps {
  prompt?: PromptDetailEntity | null;
  isSubmitting?: boolean;
  onSave: (data: CreatePromptRequest | UpdatePromptRequest) => void;
  onCancel: () => void;
}

export interface PromptListProps {
  prompts: PromptEntity[];
  isLoading: boolean;
  selectedId: number | null;
  onSelect: (prompt: PromptEntity) => void;
  onEdit: (prompt: PromptEntity) => void;
  onDelete: (prompt: PromptEntity) => void;
}

export interface PromptDetailPanelProps {
  prompt: PromptDetailEntity | null;
  isLoading: boolean;
}

export interface DeletePromptDialogProps {
  prompt: PromptEntity | null;
  open: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
  liveWeather: WeatherApiCurrentPoint[];
  weatherLoading: boolean;
  weatherError: string | null;
  onRefreshWeather: () => void;
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
  onEdit?: (user: User) => void;
  onBan?: (user: User) => void;
  onActivate?: (user: User) => void;
  onViewDetail?: (userId: string) => void;
  isLoading?: boolean;
  totalCount?: number;
  serverPagination?: {
    totalCount: number;
    totalPages: number;
    page: number;
    pageSize: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
}

export interface UserStatsProps {
  stats: UserStatsType;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "coordinator" | "rescuer" | "victim" | "manager";
  status: "active" | "banned";
  region: string;
  phone: string;
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
  roles?: User["role"][];
  statuses?: User["status"][];
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

// AI Prompt Legacy Types (mock data)
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

//Coordinator Dashboard Types
export type LocationPanelData =
  | { type: "depot"; data: import("@/services/depot/type").DepotEntity }
  | {
      type: "assemblyPoint";
      data: import("@/services/assembly_points/type").AssemblyPointEntity;
    };

export interface LocationDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: LocationPanelData | null;
}

export interface AIDispatchPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: SOSCluster | null;
  aiDecision: AIDispatchDecision | null;
  availableRescuers: Rescuer[];
  onApprove: () => void;
  onOverride: (rescuerId: string) => void;
}

export interface ClusterDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cluster: SOSCluster | null;
  onProcessCluster: () => void;
  onSOSSelect: (sos: SOSRequest) => void;
}

export interface SOSDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sosRequest: SOSRequest | null;
  onProcessSOS: (sosIds: string[]) => void;
  isProcessing?: boolean;
  /** SOS requests in the same auto-cluster (within 1 km) */
  nearbySOSRequests: SOSRequest[];
  allSOSRequests: SOSRequest[];
}

export interface RescuePlanPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clusterSOSRequests: SOSRequest[];
  clusterId: number | null;
  rescueSuggestion:
    | import("@/services/sos_cluster/type").ClusterRescueSuggestionResponse
    | null;
  onApprove: () => void;
  onReAnalyze: () => void;
  isReAnalyzing: boolean;
  /** Called with decoded [lat,lng][] coords to draw a route on the map */
  onShowRoute?: (coords: [number, number][]) => void;
  /** Which tab to show when the panel opens */
  defaultTab?: "plan" | "missions";
}

export interface ActivityTypeConfig {
  label: string;
  color: string;
  bgColor: string;
}

export interface SeverityConfig {
  variant: "p1" | "p2" | "p3" | "p4" | "warning";
  label: string;
}

export interface CoordinatorMapProps {
  sosRequests: SOSRequest[];
  rescuers: Rescuer[];
  // DepotEntity from backend
  depots: {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    capacity: number;
    currentUtilization: number;
    status: "Available" | "Full" | "PendingAssignment" | "Closed";
    manager: {
      id: string;
      fullName: string;
      email: string | null;
      phone: string;
    } | null;
    lastUpdatedAt: string;
  }[];
  // AssemblyPointEntity from backend
  assemblyPoints?: {
    id: number;
    code: string;
    name: string;
    latitude: number;
    longitude: number;
    maxCapacity: number;
    status:
      | "Created"
      | "Active"
      | "Overloaded"
      | "UnderMaintenance"
      | "Closed";
    lastUpdatedAt: string | null;
    hasActiveEvent?: boolean;
  }[];
  // SOS Clusters from backend
  clusters?: import("@/services/sos_cluster/type").SOSClusterEntity[];
  /** Client-side auto-clusters (groups of nearby PENDING SOS) */
  autoClusters?: SOSRequest[][];
  selectedSOS?: SOSRequest | null;
  selectedRescuer?: Rescuer | null;
  aiDecision?: AIDispatchDecision | null;
  onSOSSelect: (sos: SOSRequest) => void;
  onRescuerSelect: (rescuer: Rescuer) => void;
  onDepotSelect?: (depot: CoordinatorMapProps["depots"][number]) => void;
  onAssemblyPointSelect?: (
    point: NonNullable<CoordinatorMapProps["assemblyPoints"]>[number],
  ) => void;
  onClusterSelect?: (
    cluster: import("@/services/sos_cluster/type").SOSClusterEntity,
  ) => void;
  flyToLocation?: Location | null;
  /** Zoom level to use when flying to location (default: 16) */
  flyToZoom?: number;
  /** Current user/device location from geolocation API */
  userLocation?: Location | null;
  /** Used to trigger map resize when side panel opens/closes */
  panelOpen?: boolean;
  /** Called when map view changes (pan/zoom) with center + zoom */
  onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void;
  /** Whether the map is in a mode where the user is allowed to pick a location */
  isPickingLocation?: boolean;
  /** Callback when the user clicks on the map */
  onMapClick?: (lat: number, lng: number) => void;
  /** Decoded polyline coords [lat, lng][] to draw as a rescue route overlay */
  routeOverlay?: [number, number][];
  /** Called when route overlay should be cleared */
  onClearRouteOverlay?: () => void;
}

// Assembly Point type for map display (from backend AssemblyPointEntity)
export interface AssemblyPoint {
  id: number;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  maxCapacity: number;
  status:
    | "Created"
    | "Active"
    | "Overloaded"
    | "UnderMaintenance"
    | "Closed";
  lastUpdatedAt: string | null;
  hasActiveEvent?: boolean;
}

export interface SOSSidebarProps {
  sosRequests: SOSRequest[];
  rescuers: Rescuer[];
  missions: Mission[];
  onSOSSelect: (sos: SOSRequest) => void;
  onRescuerSelect: (rescuer: Rescuer) => void;
  selectedSOS?: SOSRequest | null;
  /** Auto-detected clusters of nearby PENDING SOS requests (within 10 km) */
  autoClusters: SOSRequest[][];
  onCreateCluster: (sosIds: string[]) => void;
  onClusterOnly: (clusterGroups: SOSRequest[][]) => void;
  isCreatingCluster?: boolean;
  /** Which cluster index is currently being processed */
  processingClusterIndex?: number | null;
  /** Which standalone SOS ID is currently being processed */
  processingSosId?: string | null;
  /** Backend SOS clusters */
  backendClusters: import("@/services/sos_cluster/type").SOSClusterEntity[];
  /** Trigger AI analysis for an existing backend cluster */
  onAnalyzeCluster: (clusterId: number) => void;
  isAnalyzingCluster?: boolean;
  /** Which backend cluster ID is being analyzed */
  analyzingClusterId?: number | null;
  /** Real-time AI status */
  analyzingStatus?: string;
  /** Open manual mission builder for a cluster */
  onManualMission?: (clusterId: number) => void;
  /** View rescue plan history for a cluster */
  onViewClusterPlan?: (clusterId: number) => void;
  /** View/edit an existing mission in the builder */
  onViewMission?: (clusterId: number, missionId: number) => void;
}

export type WeatherLayer = "wind" | "temp" | "rain" | "clouds";

// Inventory Management Types - ReQ-SOS Depot Manager Dashboard
// For managing warehouse inventory in disaster relief operations

export type StockLevel = "CRITICAL" | "LOW" | "NORMAL" | "OVERSTOCKED";
export type ItemCategory =
  | "MEDICAL"
  | "FOOD"
  | "EQUIPMENT"
  | "CLOTHING"
  | "SHELTER"
  | "WATER";
export type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";
export type RequestType = "INBOUND" | "OUTBOUND";
export type ShipmentStatus =
  | "PREPARING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RETURNED";

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  sku: string;
  quantity: number;
  unit: string;
  minStock: number;
  maxStock: number;
  stockLevel: StockLevel;
  location: string; // Warehouse location code (e.g., "A-01-02")
  expiryDate?: Date;
  lastUpdated: Date;
  imageUrl?: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
  totalQuantity: number;
  criticalItems: number;
  lowStockItems: number;
}

export interface SupplyRequest {
  id: string;
  type: RequestType;
  status: RequestStatus;
  items: RequestItem[];
  requestedBy: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  priority: "HIGH" | "MEDIUM" | "LOW";
  notes?: string;
  destinationDepot?: string;
  sourceDepot?: string;
  missionId?: string; // Link to rescue mission if applicable
}

export interface RequestItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

export interface Shipment {
  id: string;
  requestId: string;
  status: ShipmentStatus;
  items: RequestItem[];
  origin: string;
  destination: string;
  carrier: string;
  trackingNumber?: string;
  estimatedArrival: Date;
  actualArrival?: Date;
  createdAt: Date;
}

export interface DepotManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  depotId: string;
  depotName: string;
  role: "DEPOT_MANAGER" | "DEPOT_STAFF";
}

export interface DepotInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  totalItems: number;
  totalCategories: number;
  criticalAlerts: number;
  lowStockAlerts: number;
  pendingRequests: number;
  activeShipments: number;
}

// Dashboard Statistics
export interface IInventoryStats {
  totalItems: number;
  totalCategories: number;
  criticalStock: number;
  lowStock: number;
  normalStock: number;
  pendingInbound: number;
  pendingOutbound: number;
  activeShipments: number;
  itemsExpiringSoon: number;
}

// Activity Log
export interface ActivityLog {
  id: string;
  action:
    | "STOCK_IN"
    | "STOCK_OUT"
    | "ADJUSTMENT"
    | "REQUEST_CREATED"
    | "REQUEST_APPROVED"
    | "SHIPMENT_SENT"
    | "SHIPMENT_RECEIVED";
  itemId?: string;
  itemName?: string;
  quantity?: number;
  performedBy: string;
  performedAt: Date;
  details: string;
}

//Inventory Management Types - ReQ-SOS Depot Manager Dashboard
export interface RecentActivityProps {
  activities: ActivityLog[];
  maxItems?: number;
}

export interface LowStockAlertsProps {
  items: InventoryItem[];
  onItemClick?: (item: InventoryItem) => void;
  onViewAll?: () => void;
}

export interface ItemDetailsSheetProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestInbound?: () => void;
  onRequestOutbound?: () => void;
  onEdit?: () => void;
}

export interface InventoryStatsProps {
  stats: IInventoryStats;
}

export interface DepotSidebarProps {
  depotInfo: DepotInfo;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  inventoryItems: InventoryItem[];
  supplyRequests: SupplyRequest[];
  shipments: Shipment[];
  onItemSelect: (item: InventoryItem) => void;
  onRequestSelect: (request: SupplyRequest) => void;
  onShipmentSelect: (shipment: Shipment) => void;
  selectedItem?: InventoryItem | null;
  selectedRequest?: SupplyRequest | null;
  selectedCategory?: string | null;
  onCategorySelect?: (category: string | null) => void;
  onViewAllRequests?: () => void;
  /** API item categories – when provided, drives the filter badges */
  apiCategories?: {
    id: number;
    code: string;
    name: string;
    quantity: number;
    description: string;
  }[];
}

export interface CategoryOverviewProps {
  items?: InventoryItem[];
  /** API item categories – when provided, renders cards from real data */
  apiCategories?: {
    id: number;
    code: string;
    name: string;
    quantity: number;
    description: string;
  }[];
  onCategorySelect?: (category: string) => void;
  selectedCategory?: string | null;
}

export interface CategorySummary {
  category: string;
  totalItems: number;
  totalQuantity: number;
  criticalCount: number;
  lowCount: number;
  normalCount: number;
}

//Coordinator Dashboard Types
export type Priority = "P1" | "P2" | "P3" | "P4";
export type RescuerType = "TRUCK" | "MOTORBOAT" | "SMALL_BOAT";
export type SOSStatus = "PENDING" | "ASSIGNED" | "RESCUED";
export type RescuerStatus = "AVAILABLE" | "BUSY";

export interface Location {
  lat: number;
  lng: number;
}

export interface SOSRequest {
  id: string;
  groupId: string; // Family ID - for logical grouping
  location: Location;
  priority: Priority;
  needs: {
    medical: boolean;
    food: boolean;
    boat: boolean;
  };
  status: SOSStatus;
  message: string; // e.g., "Water at roof level, pregnant wife"
  createdAt: Date;
  aiAnalysis?: {
    riskFactors: string[]; // ["Deep Water", "Medical Emergency"]
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

// Cluster for map display (DBSCAN spatial clustering)
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

export interface WindyLeafletMapProps {
  sosRequests?: SOSRequest[];
  rescuers?: Rescuer[];
  // DepotEntity from backend
  depots?: {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    capacity: number;
    currentUtilization: number;
    status: "Available" | "Full" | "PendingAssignment" | "Closed";
    manager: {
      id: string;
      fullName: string;
      email: string | null;
      phone: string;
    } | null;
    lastUpdatedAt: string;
  }[];
  selectedSOS?: SOSRequest | null;
  selectedRescuer?: Rescuer | null;
  onSOSSelect?: (sos: SOSRequest) => void;
  onRescuerSelect?: (rescuer: Rescuer) => void;
  flyToLocation?: Location | null;
  /** Current user/device location from geolocation API */
  userLocation?: Location | null;
}
