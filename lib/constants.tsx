import { RescueReport, SOSItem, Testimonial } from "@/type";
import {
  ChartBar,
  ChatCircle,
  Clock,
  CloudSun,
  Drop,
  Pulse,
  Robot,
  SquaresFour,
  Target,
  UserCheck,
  UserPlus,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import {
  Bell,
  Cloud,
  Heart,
  MapPin,
  Shield,
  Users,
  Warehouse,
  Radio,
  BarChart3,
  Package,
  Activity,
} from "lucide-react";

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
  { name: "WHO", icon: <Activity className="w-6 h-6" /> },
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
    icon: <BarChart3 className="w-5 h-5" />,
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

export const CENTRAL_VN_LOCATIONS: Array<{ name: string; q: string }> = [
  // Using coordinates avoids ambiguity in city/province names.
  { name: "Thừa Thiên Huế", q: "16.4637,107.5909" },
  { name: "Đà Nẵng", q: "16.0544,108.2022" },
  { name: "Quảng Nam", q: "15.5394,108.0191" },
  { name: "Quảng Ngãi", q: "15.1214,108.8044" },
  { name: "Bình Định", q: "13.7765,109.2237" },
];

//Admin Prompt
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
  { icon: Users, label: "Quản lý người dùng", href: "/dashboard/admin/users" },
  {
    icon: CloudSun,
    label: "Bài đăng thời tiết",
    href: "/dashboard/admin/weather-posts",
  },
  {
    icon: Drop,
    label: "Thời tiết & Lũ lụt",
    href: "/dashboard/admin/weather-flood",
  },
  { icon: ChartBar, label: "Báo cáo cứu hộ", href: "/dashboard/admin/reports" },
  {
    icon: UserCheck,
    label: "Đăng ký cứu hộ viên",
    href: "/dashboard/admin/rescuer-registration",
  },
  {
    icon: Robot,
    label: "Cấu hình AI Prompt",
    href: "/dashboard/admin/ai-prompt",
  },
  {
    icon: ChatCircle,
    label: "Cấu hình phòng chat",
    href: "/dashboard/admin/chat-config",
  },
  {
    icon: UserPlus,
    label: "Xác nhận cứu hộ viên",
    href: "/dashboard/admin/rescuer-verification",
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
