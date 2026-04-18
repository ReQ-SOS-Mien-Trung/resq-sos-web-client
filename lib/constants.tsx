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
  Bell,
  Boat,
  ChartBar,
  CheckCircle,
  Clock,
  Cloud,
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
  Shield,
  Siren,
  SquaresFour,
  Stethoscope,
  Target,
  Tent,
  Thermometer,
  TShirt,
  Truck,
  Users,
  Warning,
  WarningCircle,
  Warehouse,
  Wind,
  Wrench,
  XCircle,
  SlidersIcon,
  UserIcon,
  PiggyBankIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { PROMPT_TYPE_LABELS } from "@/services/prompt/constants";
import type { PromptType } from "@/services/prompt/type";

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
export const PROMPT_TYPE_OPTIONS = [
  {
    label: PROMPT_TYPE_LABELS.SosPriorityAnalysis,
    value: "SosPriorityAnalysis",
    description: "Dùng để phân tích mức độ ưu tiên và dữ liệu SOS.",
  },
  {
    label: PROMPT_TYPE_LABELS.MissionPlanning,
    value: "MissionPlanning",
    description: "Prompt legacy fallback cho AI gợi ý mission và rescue plan.",
  },
  {
    label: PROMPT_TYPE_LABELS.MissionRequirementsAssessment,
    value: "MissionRequirementsAssessment",
    description:
      "Stage pipeline phân tích SOS và trả fragment nhu cầu mission.",
  },
  {
    label: PROMPT_TYPE_LABELS.MissionDepotPlanning,
    value: "MissionDepotPlanning",
    description:
      "Stage pipeline chọn một kho và lập kế hoạch vật tư bằng inventory tool.",
  },
  {
    label: PROMPT_TYPE_LABELS.MissionTeamPlanning,
    value: "MissionTeamPlanning",
    description:
      "Stage pipeline gán đội cứu hộ và điểm tập kết bằng team/assembly tools.",
  },
  {
    label: PROMPT_TYPE_LABELS.MissionPlanValidation,
    value: "MissionPlanValidation",
    description: "Stage pipeline chuẩn hóa draft thành JSON mission cuối cùng.",
  },
] as const satisfies readonly {
  label: string;
  value: PromptType;
  description: string;
}[];

export const AI_PROVIDER_OPTIONS = [
  {
    label: "Gemini",
    value: "Gemini",
    description:
      "Dùng Google AI Studio API key hoặc default Gemini config của server.",
    models: [
      {
        label: "Gemini 3.1 Pro Preview",
        code: "gemini-3.1-pro-preview",
      },
      {
        label: "Gemini 3.1 Flash Lite Preview",
        code: "gemini-3.1-flash-lite-preview",
      },
      {
        label: "Gemini 3 Flash Preview",
        code: "gemini-3-flash-preview",
      },
      {
        label: "Gemini 2.5 Flash",
        code: "gemini-2.5-flash",
      },
      {
        label: "Gemini 2.5 Pro",
        code: "gemini-2.5-pro",
      },
      {
        label: "Gemini 2 Flash",
        code: "gemini-2-flash",
      },
      {
        label: "Gemini 2 Flash Lite",
        code: "gemini-2-flash-lite",
      },
      {
        label: "Gemini 2.5 Flash TTS",
        code: "gemini-2.5-flash-tts",
      },
      {
        label: "Gemini 2.5 Pro TTS",
        code: "gemini-2.5-pro-tts",
      },
    ],
  },
  {
    label: "OpenRouter",
    value: "OpenRouter",
    description:
      "Dùng endpoint OpenRouter theo chuẩn OpenAI-compatible chat completions.",
    models: [
      {
        label: "GPT-4o Mini",
        code: "openai/gpt-4o-mini",
      },
      {
        label: "GPT-4.1 Mini",
        code: "openai/gpt-4.1-mini",
      },
      {
        label: "Claude 3.5 Sonnet",
        code: "anthropic/claude-3.5-sonnet",
      },
      {
        label: "Llama 3.3 70B Instruct",
        code: "meta-llama/llama-3.3-70b-instruct",
      },
    ],
  },
] as const;

export const PROMPT_VARIABLES_BY_TYPE = {
  SosPriorityAnalysis: [
    { label: "Dữ liệu đã trích xuất", value: "structured_data" },
    { label: "Tin nhắn gốc", value: "raw_message" },
    { label: "Loại SOS", value: "sos_type" },
  ],
  MissionPlanning: [
    { label: "JSON SOS requests", value: "sos_requests_data" },
    { label: "Tổng số SOS", value: "total_count" },
    { label: "Ghi chú kho", value: "depots_data" },
  ],
  MissionRequirementsAssessment: [
    { label: "JSON SOS requests", value: "sos_requests_data" },
    { label: "Tổng số SOS", value: "total_count" },
  ],
  MissionDepotPlanning: [
    { label: "JSON SOS requests", value: "sos_requests_data" },
    { label: "Requirements fragment", value: "requirements_fragment" },
    { label: "Yêu cầu một kho", value: "single_depot_required" },
    { label: "Số kho hợp lệ", value: "eligible_depot_count" },
  ],
  MissionTeamPlanning: [
    { label: "JSON SOS requests", value: "sos_requests_data" },
    { label: "Requirements fragment", value: "requirements_fragment" },
    { label: "Depot fragment", value: "depot_fragment" },
    { label: "Số đội gần khu vực", value: "nearby_team_count" },
  ],
  MissionPlanValidation: [
    { label: "JSON SOS requests", value: "sos_requests_data" },
    { label: "Mission draft body", value: "mission_draft_body" },
  ],
} as const satisfies Record<
  PromptType,
  readonly { label: string; value: string }[]
>;

export const INITIAL_FORM_DATA: PromptFormData = {
  name: "",
  prompt_type: "MissionPlanning",
  purpose: "",
  system_prompt: "",
  user_prompt_template: "",
  version: "",
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
      {
        icon: UsersIcon,
        label: "Quản lý người dùng",
        href: "/dashboard/admin/users",
      },
      {
        icon: ({ className }: { size?: number; className?: string }) => (
          <IconifyIcon
            icon="fluent-emoji-high-contrast:rescue-workers-helmet"
            width={20}
            height={20}
            className={className}
          />
        ),
        label: "Quản lý cứu hộ viên",
        href: "/dashboard/admin/rescuers",
      },
      {
        icon: ({ className }: { size?: number; className?: string }) => (
          <IconifyIcon
            icon="vaadin:user-card"
            width={18}
            height={18}
            className={className}
          />
        ),
        label: "Quản lý hồ sơ cứu hộ viên",
        href: "/dashboard/admin/rescuer-verification",
      },
    ],
  },
  {
    icon: SlidersIcon,
    label: "Cấu hình hệ thống",
    children: [
      {
        icon: ({ className }: { size?: number; className?: string }) => (
          <IconifyIcon
            icon="mynaui:config-vertical"
            width={20}
            height={20}
            className={className}
          />
        ),
        label: "Tham số hệ thống",
        href: "/dashboard/admin/config",
      },
      {
        icon: ({ className }: { size?: number; className?: string }) => (
          <IconifyIcon
            icon="streamline:ai-prompt-spark"
            width={18}
            height={18}
            className={className}
          />
        ),
        label: "Cấu hình AI Prompt",
        href: "/dashboard/admin/ai-prompt",
      },
      {
        icon: ({ className }: { size?: number; className?: string }) => (
          <IconifyIcon
            icon="proicons:chat"
            width={20}
            height={20}
            className={className}
          />
        ),
        label: "Cấu hình phòng chat",
        href: "/dashboard/admin/chat-config",
      },
    ],
  },
  {
    icon: ({ size, className }: { size?: number; className?: string }) => (
      <IconifyIcon
        icon="fa7-solid:people-roof"
        width={size}
        height={size}
        className={className}
      />
    ),
    label: "Quản lý điểm tập kết",
    href: "/dashboard/admin/assembly-points",
  },
  {
    icon: Warehouse,
    label: "Quản lý kho",
    href: "/dashboard/admin/depots",
  },
  {
    icon: ({ size, className }: { size?: number; className?: string }) => (
      <IconifyIcon
        icon="solar:hand-money-outline"
        width={size}
        height={size}
        className={className}
      />
    ),
    label: "Phân bổ quỹ từ thiện",
    href: "/dashboard/admin/reports",
  },
  {
    icon: PiggyBankIcon,
    label: "Quản lý quỹ chiến dịch",
    href: "/dashboard/admin/campaigns",
  },
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
    icon: ({ className }: { size?: number; className?: string }) => (
      <IconifyIcon
        icon="wi:forecast-io-hail"
        width={24}
        height={24}
        className={className}
      />
    ),
    label: "Thời tiết & Lũ lụt",
    href: "/dashboard/admin/weather-flood",
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
  Available: {
    label: "Khả dụng",
    color: "bg-green-500",
    textColor: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    icon: CheckCircle,
  },
  Unavailable: {
    label: "Không khả dụng",
    color: "bg-orange-500",
    textColor: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    icon: WarningCircle,
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
    label: "Phân phát vật phẩm",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  RETURN_SUPPLIES: {
    label: "Hoàn trả vật phẩm",
    color: "text-cyan-700 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  RETURN_ASSEMBLY_POINT: {
    label: "Quay về điểm tập kết",
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
  },
  RETURN_TO_ASSEMBLY_POINT: {
    label: "Quay về điểm tập kết",
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
  },
  RETURN_ASSEMBLY: {
    label: "Quay về điểm tập kết",
    color: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-100 dark:bg-slate-900/30",
  },
  COLLECT_SUPPLIES: {
    label: "Tiếp nhận vật phẩm",
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
