import {
  ItemCategory,
  PromptFormData,
  RescueReport,
  SOSItem,
  Testimonial,
  WeatherLayer,
  ActivityTypeConfig,
  SeverityConfig,
} from "@/type";
import {
  ArrowsCounterClockwise,
  IdentificationCardIcon,
  Bell,
  Boat,
  ChartBar,
  ChatCircle,
  CheckCircle,
  Clock,
  Cloud,
  CloudSun,
  Drop,
  FirstAid,
  ForkKnife,
  Heart,
  LockKey,
  MapPin,
  MapTrifold,
  Package,
  Pulse,
  Radio,
  Robot,
  Shield,
  Spinner,
  SquaresFour,
  Stethoscope,
  Target,
  Tent,
  Thermometer,
  TShirt,
  Truck,
  UserCheck,
  Users,
  Warning,
  WarningCircle,
  Warehouse,
  Wind,
  Wrench,
  XCircle,
  FadersIcon,
  SlidersIcon,
  UserIcon,
  Folder,
} from "@phosphor-icons/react";

export const navLinks = [
  { href: "#features", label: "Tính năng" },
  { href: "#demo", label: "Demo" },
  { href: "#about", label: "Về chúng tôi" },
];

export const tabs = [
  {
    id: "centers" as const,
    label: "Trung tâm điều phối",
    icon: <Cloud className="w-4 h-4" />,
  },
  {
    id: "depots" as const,
    label: "Kho vật tư",
    icon: <Warehouse className="w-4 h-4" />,
  },
  {
    id: "teams" as const,
    label: "Đội cứu hộ",
    icon: <Users className="w-4 h-4" />,
  },
];

export const tabDescriptions = {
  centers:
    "Các trung tâm điều phối được đặt tại các tỉnh thành Miền Trung, đảm bảo phản hồi nhanh chóng.",
  depots:
    "Hệ thống kho vật tư phân bổ chiến lược, sẵn sàng cung ứng trong mọi tình huống.",
  teams:
    "Các đội cứu hộ chuyên nghiệp túc trực 24/7 tại các điểm nóng thiên tai.",
};

// Map images for each tab
export const mapImages = {
  centers: "/images/dotmapVN_1.png",
  depots: "/images/dotmapVN_2.png",
  teams: "/images/dotmapVN_3.png",
};

export const testimonials: Testimonial[] = [
  {
    id: "redcross",
    orgName: "Hội Chữ Thập Đỏ",
    orgIcon: <Heart className="w-5 h-5" />,
    headline: "Hội Chữ Thập Đỏ giảm 60% thời gian phản hồi",
    highlightText: "và tối ưu hóa nguồn lực cứu trợ",
    quote:
      "ResQ SOS đã giúp chúng tôi kết nối nhanh chóng với người dân cần hỗ trợ. Hệ thống AI phân tích giúp tiết kiệm thời gian và nguồn lực đáng kể.",
    author: {
      name: "Nguyễn Văn Minh",
      role: "Giám đốc Cứu trợ, Hội Chữ Thập Đỏ Đà Nẵng",
      avatar: "NM",
    },
  },
  {
    id: "military",
    orgName: "Quân Khu 5",
    orgIcon: <Shield className="w-5 h-5" />,
    headline: "Quân Khu 5 điều phối hiệu quả hơn 80%",
    highlightText: "trong các chiến dịch cứu hộ lớn",
    quote:
      "Với ResQ SOS, việc phối hợp giữa các đơn vị trở nên dễ dàng hơn bao giờ hết. Bản đồ real-time giúp chúng tôi nắm bắt tình hình chính xác.",
    author: {
      name: "Đại tá Trần Quốc Hùng",
      role: "Phó Tham mưu trưởng, Quân Khu 5",
      avatar: "TH",
    },
  },
  {
    id: "volunteer",
    orgName: "Đội Tình Nguyện",
    orgIcon: <Users className="w-5 h-5" />,
    headline: "500+ tình nguyện viên kết nối",
    highlightText: "cùng hành động khi thiên tai xảy ra",
    quote:
      "Ứng dụng rất dễ sử dụng, giúp chúng tôi nhận được thông báo ngay khi có ca SOS mới. Việc báo cáo tiến độ cũng rất thuận tiện.",
    author: {
      name: "Lê Thị Hương",
      role: "Trưởng nhóm Tình nguyện viên Quảng Nam",
      avatar: "LH",
    },
  },
];

export const partners = [
  { name: "Bộ Công An", icon: <Shield className="w-6 h-6" /> },
  { name: "Hội Chữ Thập Đỏ", icon: <Heart className="w-6 h-6" /> },
  { name: "UNDP Vietnam", icon: <Users className="w-6 h-6" /> },
  { name: "Quân Khu 5", icon: <Shield className="w-6 h-6" /> },
  { name: "UNICEF", icon: <Users className="w-6 h-6" /> },
  { name: "WHO", icon: <Pulse className="w-6 h-6" /> },
];

export const features = [
  {
    icon: <Bell className="w-5 h-5" />,
    label: "Tiếp nhận SOS",
  },
  {
    icon: <MapPin className="w-5 h-5" />,
    label: "Định vị GPS",
  },
  {
    icon: <Radio className="w-5 h-5" />,
    label: "Điều phối",
  },
  {
    icon: <ChartBar className="w-5 h-5" />,
    label: "Báo cáo",
  },
  {
    icon: <Package className="w-5 h-5" />,
    label: "Quản lý kho",
  },
  {
    icon: <Users className="w-5 h-5" />,
    label: "Đội cứu hộ",
  },
];

export const SOSs: SOSItem[] = [
  {
    image: "/images/flood-relief-qb.png",
    title: "Cứu trợ khẩn cấp Lệ Thủy - Quảng Bình",
    slug: "cuu-tro-khan-cap-le-thuy-quang-binh",
    location: "Huyện Lệ Thủy, Quảng Bình",
    date: "2025-10-15",
    time: "07:30 AM",
  },
  {
    image: "/images/rescue-ht.png",
    title: "Đội cứu hộ tiếp cận vùng ngập sâu Hương Khê",
    slug: "doi-cuu-ho-tiep-can-huong-khe",
    location: "Huyện Hương Khê, Hà Tĩnh",
    date: "2025-10-16",
    time: "09:00 AM",
  },
  {
    image: "/images/supplies-qt.png",
    title: "Phân phát nhu yếu phẩm xã Hải Lăng",
    slug: "phan-phat-nhu-yeu-pham-hai-lang",
    location: "Huyện Hải Lăng, Quảng Trị",
    date: "2025-10-18",
    time: "08:30 AM",
  },
  {
    image: "/images/training-hue.png",
    title: "Tập huấn kỹ năng sơ cấp cứu tình nguyện viên",
    slug: "tap-huan-ky-nang-so-cap-cuu",
    location: "TP. Huế, Thừa Thiên Huế",
    date: "2025-09-20",
    time: "02:00 PM",
  },
  {
    image: "/images/charity-dn.png",
    title: "Chiến dịch gom áo ấm mùa đông",
    slug: "chien-dich-gom-ao-am-mua-dong",
    location: "TP. Đà Nẵng",
    date: "2025-11-01",
    time: "08:00 AM",
  },
  {
    image: "/images/evacuation-qnam.png",
    title: "Sơ tán người dân vùng sạt lở Nam Trà My",
    slug: "so-tan-nguoi-dan-nam-tra-my",
    location: "Huyện Nam Trà My, Quảng Nam",
    date: "2025-10-25",
    time: "10:00 AM",
  },
  {
    image: "/images/medical-qngai.png",
    title: "Khám chữa bệnh miễn phí sau bão",
    slug: "kham-chua-benh-mien-phi-sau-bao",
    location: "Huyện Bình Sơn, Quảng Ngãi",
    date: "2025-11-05",
    time: "07:00 AM",
  },
];

export const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Re-export from locations.ts for backward compatibility
export { CENTRAL_VN_LOCATIONS } from "./locations";

//Admin Prompt
export const PROMPT_VARIABLES = [
  { label: "Tên nạn nhân", value: "victim_name" },
  { label: "Tọa độ", value: "coordinates" },
  { label: "Mức độ khẩn cấp", value: "urgency_level" },
  { label: "Mô tả tình huống", value: "situation_description" },
  { label: "Số người bị nạn", value: "victim_count" },
  { label: "Loại thiên tai", value: "disaster_type" },
  { label: "Khu vực", value: "region" },
  { label: "Thời gian", value: "timestamp" },
  { label: "Tài nguyên", value: "resources" },
  { label: "Yêu cầu", value: "request" },
] as const;

export const INITIAL_FORM_DATA: PromptFormData = {
  name: "",
  purpose: "",
  system_prompt: "",
  user_prompt_template: "",
  model: "",
  temperature: 0,
  max_tokens: 0,
  version: "",
  api_url: "",
  is_active: true,
};

export const variantsCategory = {
  dispatch: {
    label: "Điều phối",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  classification: {
    label: "Phân loại",
    className: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  },
  recommendation: {
    label: "Đề xuất",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  other: {
    label: "Khác",
    className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  },
};

export const variantsBadge = {
  public: {
    label: "Công khai",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  private: {
    label: "Riêng tư",
    className: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  },
  support: {
    label: "Hỗ trợ",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
};

export const categoryColors: Record<string, string> = {
  // Trạng thái
  "Đang xử lý": "from-blue-500 to-cyan-500",
  "Hoàn thành": "from-emerald-400 to-green-500",
  "Đang chờ": "from-amber-400 to-orange-500",
  "Hủy bỏ": "from-red-400 to-rose-500",
  // Nguồn
  "Ứng dụng SOS": "from-red-500 to-orange-500",
  Hotline: "from-blue-400 to-indigo-500",
  Website: "from-purple-400 to-violet-500",
  "Báo cáo trực tiếp": "from-emerald-400 to-teal-500",
  // Mức độ
  "Khẩn cấp": "from-red-500 to-rose-600",
  "Trung bình": "from-amber-400 to-yellow-500",
  Thấp: "from-blue-400 to-cyan-500",
};

export const getSegmentColor = (name: string) => {
  if (name === "Lũ lụt") return "#ef4444"; // Red
  if (name === "Sạt lở") return "#f97316"; // Orange
  if (name === "Bão") return "#eab308"; // Yellow
  return "#ef4444";
};

export const timeFrames: Array<"1D" | "1W" | "1M" | "6M" | "1Y" | "ALL"> = [
  "1D",
  "1W",
  "1M",
  "6M",
  "1Y",
  "ALL",
];

export const navigationItems = [
  {
    icon: SquaresFour,
    label: "Tổng quan",
    href: "/dashboard/admin",
  },
  {
    icon: UserIcon,
    label: "Quản lý người dùng",
    children: [
      { icon: UserIcon, label: "Quản lý người dùng", href: "/dashboard/admin/users" },
      { icon: UserCheck, label: "Quản lý cứu hộ viên", href: "/dashboard/admin/rescuers" },
      { icon: IdentificationCardIcon, label: "Quản lý hồ sơ cứu hộ viên", href: "/dashboard/admin/rescuer-verification" },
    ],
  },
  {
    icon: SlidersIcon,
    label: "Cấu hình hệ thống",
    children: [
      { icon: FadersIcon, label: "Tham số hệ thống", href: "/dashboard/admin/config" },
      { icon: Robot, label: "Cấu hình AI Prompt", href: "/dashboard/admin/ai-prompt" },
      { icon: ChatCircle, label: "Cấu hình phòng chat", href: "/dashboard/admin/chat-config" },
    ],
  },
  {
    icon: IdentificationCardIcon,
    label: "Quản lý điểm tập kết",
    href: "/dashboard/admin/assembly-points",
  },
  { icon: ChartBar, label: "Phân bổ quỹ từ thiện", href: "/dashboard/admin/reports" },
  { icon: Folder, label: "Quản lý quỹ chiến dịch", href: "/dashboard/admin/campaigns" },
  {
    icon: LockKey,
    label: "Phân quyền người dùng",
    href: "/dashboard/admin/permissions",
  },
  {
    icon: MapTrifold,
    label: "Khoanh vùng cứu hộ",
    href: "/dashboard/admin/map-zone",
  },
  {
    icon: CloudSun,
    label: "Thời tiết",
    children: [
      { icon: CloudSun, label: "Bài đăng thời tiết", href: "/dashboard/admin/weather-posts" },
      { icon: Drop, label: "Thời tiết & Lũ lụt", href: "/dashboard/admin/weather-flood" },
    ],
  },
];

export const getFavoriteIcon = (name: string) => {
  switch (name) {
    case "Cứu hộ viên":
      return Shield;
    case "Cảnh báo":
      return Warning;
    case "Hoạt động":
      return Pulse;
    default:
      return Shield;
  }
};

export const getFavoriteHref = (name: string): string => {
  switch (name) {
    case "Cứu hộ viên":
      return "/dashboard/admin#rescuer-overview";
    case "Cảnh báo":
      return "/dashboard/admin#sos-overview";
    case "Hoạt động":
      return "/dashboard/admin#sos-overview";
    default:
      return "/dashboard/admin";
  }
};

export const getMetricIcon = (label: string) => {
  switch (label.toLowerCase()) {
    case "yêu cầu sos":
      return WarningCircle;
    case "cứu hộ viên":
      return Users;
    case "tỷ lệ thành công":
      return Target;
    case "thời gian phản hồi":
      return Clock;
    default:
      return WarningCircle;
  }
};

//Admin Tops Countries
export const countryFlags: Record<string, string> = {
  "Đà Nẵng": "🇲",
  "Quảng Nam": "🇲",
  "Thừa Thiên Huế": "🇲",
  "Quảng Ngãi": "🇲",
  "Quảng Bình": "🇲",
  "Quảng Trị": "🇲",
};

export const getStatusBadge = (status: RescueReport["status"]) => {
  const variants = {
    pending: {
      label: "Đang chờ",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    },
    "in-progress": {
      label: "Đang xử lý",
      className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    },
    completed: {
      label: "Hoàn thành",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    },
    cancelled: {
      label: "Đã hủy",
      className: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    },
  };
  return variants[status];
};

//Inventory Category Overview
export const categoryIcons: Record<ItemCategory, React.ReactNode> = {
  MEDICAL: <Stethoscope className="h-5 w-5" />,
  FOOD: <ForkKnife className="h-5 w-5" />,
  WATER: <Drop className="h-5 w-5" weight="fill" />,
  EQUIPMENT: <Wrench className="h-5 w-5" />,
  SHELTER: <Tent className="h-5 w-5" />,
  CLOTHING: <TShirt className="h-5 w-5" weight="fill" />,
};

export const categoryNames: Record<ItemCategory, string> = {
  MEDICAL: "Y Tế",
  FOOD: "Thực Phẩm",
  WATER: "Nước Uống",
  EQUIPMENT: "Thiết Bị",
  SHELTER: "Lều Trại",
  CLOTHING: "Quần Áo",
};

/** Icon map keyed by API item-category code (ItemCategoryEntity.code) */
export const categoryCodeIcons: Record<string, React.ReactNode> = {
  Food: <ForkKnife className="h-5 w-5" />,
  Water: <Drop className="h-5 w-5" weight="fill" />,
  Medical: <Stethoscope className="h-5 w-5" />,
  Hygiene: <Drop className="h-5 w-5" />,
  Shelter: <Tent className="h-5 w-5" />,
  Clothing: <TShirt className="h-5 w-5" weight="fill" />,
  RescueEquipment: <Wrench className="h-5 w-5" />,
  Others: <Package className="h-5 w-5" />,
};

export const stockLevelNames: Record<string, string> = {
  CRITICAL: "Thiếu",
  LOW: "Thấp",
  NORMAL: "Đủ",
  OVERSTOCKED: "Dư",
};

// Windy Weather Map Layers
export const WINDY_LAYERS: {
  id: WeatherLayer;
  label: string;
  icon: React.ReactNode;
}[] = [
    { id: "wind", label: "Gió", icon: <Wind className="h-4 w-4" /> },
    { id: "temp", label: "Nhiệt độ", icon: <Thermometer className="h-4 w-4" /> },
    {
      id: "rain",
      label: "Mưa",
      icon: <Drop className="h-4 w-4" weight="fill" />,
    },
    { id: "clouds", label: "Mây", icon: <Cloud className="h-4 w-4" /> },
  ];

// ════════════════════════════════
// Location Details Panel - Status Configs
// ════════════════════════════════
export const depotStatusConfig = {
  Available: {
    label: "Có sẵn",
    color: "bg-green-500",
    textColor: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    icon: CheckCircle,
  },
  Full: {
    label: "Đầy kho",
    color: "bg-orange-500",
    textColor: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    icon: WarningCircle,
  },
  PendingAssignment: {
    label: "Chờ phân công",
    color: "bg-blue-500",
    textColor: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    icon: ArrowsCounterClockwise,
  },
  Closed: {
    label: "Đóng cửa",
    color: "bg-red-500",
    textColor: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    icon: XCircle,
  },
};

export const assemblyPointStatusConfig = {
  Created: {
    label: "Mới tạo",
    color: "bg-sky-500",
    textColor: "text-sky-700 dark:text-sky-400",
    bgColor: "bg-sky-50 dark:bg-sky-950/30",
    icon: Clock,
  },
  Active: {
    label: "Hoạt động",
    color: "bg-green-500",
    textColor: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    icon: CheckCircle,
  },
  Overloaded: {
    label: "Quá tải",
    color: "bg-orange-500",
    textColor: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    icon: WarningCircle,
  },
  UnderMaintenance: {
    label: "Đang bảo trì",
    color: "bg-violet-500",
    textColor: "text-violet-700 dark:text-violet-400",
    bgColor: "bg-violet-50 dark:bg-violet-950/30",
    icon: Spinner,
  },
  Closed: {
    label: "Đã đóng",
    color: "bg-red-500",
    textColor: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    icon: XCircle,
  },
};

// ---- Rescue Plan Panel Constants ----

export const activityTypeConfig: Record<string, ActivityTypeConfig> = {
  ASSESS: {
    label: "Chuẩn bị",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  RESCUE: {
    label: "Giải cứu",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  MEDICAL_AID: {
    label: "Y tế",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  EVACUATE: {
    label: "Sơ tán",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  DELIVER_SUPPLIES: {
    label: "Tiếp tế",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  COLLECT_SUPPLIES: {
    label: "Lấy vật tư",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  MIXED: {
    label: "Hỗn hợp",
    color: "text-indigo-700 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
};

export const resourceTypeIcons: Record<string, React.ReactNode> = {
  TEAM: <Users className="h-5 w-5" weight="fill" />,
  BOAT: <Boat className="h-5 w-5" weight="fill" />,
  MEDICAL_KIT: <FirstAid className="h-5 w-5" weight="fill" />,
  EQUIPMENT: <Wrench className="h-5 w-5" weight="fill" />,
  VEHICLE: <Truck className="h-5 w-5" weight="fill" />,
  FOOD: <Package className="h-5 w-5" weight="fill" />,
  WATER: <Drop className="h-5 w-5" weight="fill" />,
  FUEL: <Truck className="h-5 w-5" weight="fill" />,
};

export const severityConfig: Record<string, SeverityConfig> = {
  Critical: { variant: "p1", label: "Rất nghiêm trọng" },
  High: { variant: "p2", label: "Nghiêm trọng" },
  Medium: { variant: "p3", label: "Trung bình" },
  Low: { variant: "p4", label: "Thấp" },
};

export const priorityLabelMap: Record<string, string> = {
  Critical: "Rất nghiêm trọng",
  High: "Nghiêm trọng",
  Medium: "Trung bình",
  Low: "Thấp",
};
