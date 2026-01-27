import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  Package,
  Play,
  ArrowRight,
  Bell,
  Radio,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Truck,
  MessageSquare,
  Map,
  Lock,
  Eye,
  Server,
  Zap,
  Clock,
  ShieldCheck,
  Database,
  Wifi,
  Brain,
} from "lucide-react";
import { HeaderHome, NetworkMapSection, TestimonialsSection } from "@/components/homes";
import { features, partners } from "@/lib/constants";

const Home = () => {

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white">
      <HeaderHome />

      {/* Hero Section */}
      <section className="relative pt-28 lg:pt-36 pb-20 lg:pb-32 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-radial-[ellipse_at_top] from-primary/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-150 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="max-w-2xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 hover:bg-white/10 transition-colors cursor-pointer group">
                <span className="text-primary font-medium text-sm">✦ Mới</span>
                <span className="text-gray-400 text-sm">
                  Ra mắt hệ thống AI điều phối
                </span>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
                <span className="text-primary">Hệ thống cứu hộ</span>
                <br />
                <span className="text-white">khẩn cấp_</span>
              </h1>

              {/* Description */}
              <p className="text-lg sm:text-xl text-gray-400 mb-8 leading-relaxed max-w-xl">
                ResQ SOS là nền tảng tiếp nhận và điều phối cứu hộ khẩn cấp cho
                khu vực Miền Trung Việt Nam. Kết nối nhanh chóng giữa người dân
                và lực lượng cứu hộ, tất cả trong một hệ thống thống nhất.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white px-6 h-12 text-base font-medium"
                  asChild
                >
                  <Link href="/sign-in">Đăng nhập hệ thống</Link>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-gray-300 hover:text-white hover:bg-white/10 px-6 h-12 text-base font-medium group"
                  asChild
                >
                  <Link href="#demo">
                    <Play className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                    Xem demo
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right - Dashboard Preview */}
            <div className="relative lg:pl-8">
              {/* Dashboard mockup */}
              <div className="relative bg-[#1a1a1f] rounded-xl border border-white/10 shadow-2xl overflow-hidden">
                {/* Browser header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0f0f11]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 text-xs text-gray-500">
                      <Shield className="w-3 h-3 text-primary" />
                      <span>resqsos.vn / Dashboard / Coordinator</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard content */}
                <div className="p-4">
                  {/* Top stats */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-white">
                        ResQ SOS Dashboard
                      </span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                      ● Đang hoạt động
                    </Badge>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-[#0f0f11] rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">
                        SOS hôm nay
                      </div>
                      <div className="text-xl font-bold text-white">24</div>
                      <div className="text-xs text-primary">+12%</div>
                    </div>
                    <div className="bg-[#0f0f11] rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Đã xử lý</div>
                      <div className="text-xl font-bold text-white">18</div>
                      <div className="text-xs text-green-400">75%</div>
                    </div>
                    <div className="bg-[#0f0f11] rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Đang chờ</div>
                      <div className="text-xl font-bold text-primary">6</div>
                      <div className="text-xs text-yellow-400">Ưu tiên</div>
                    </div>
                  </div>

                  {/* Chart placeholder */}
                  <div className="bg-[#0f0f11] rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">
                        Hoạt động 7 ngày qua
                      </span>
                      <span className="text-xs text-gray-600">30d ▾</span>
                    </div>
                    <div className="flex items-end gap-1 h-16">
                      {[
                        40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 65, 78,
                      ].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-primary/60 rounded-sm hover:bg-primary transition-colors"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Recent alerts */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-xs text-gray-300 flex-1">
                        SOS Khẩn cấp - Quảng Nam
                      </span>
                      <span className="text-xs text-red-400">2 phút trước</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="text-xs text-gray-300 flex-1">
                        Đội cứu hộ đang di chuyển
                      </span>
                      <span className="text-xs text-primary">5 phút trước</span>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-gray-300 flex-1">
                        Hoàn thành cứu hộ - Đà Nẵng
                      </span>
                      <span className="text-xs text-green-400">
                        12 phút trước
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-[#1a1a1f] rounded-lg border border-white/10 p-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Phản hồi TB</div>
                    <div className="text-sm font-bold text-white">
                      4.2 <span className="text-xs text-gray-500">phút</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <section className="py-8 border-y border-white/5 bg-[#0a0a0c]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="text-sm text-gray-500 whitespace-nowrap">
              <span className="text-primary font-medium">Tính năng</span> nổi
              bật
              <br className="hidden md:block" />
              của hệ thống
            </div>
            <div className="flex-1 flex flex-wrap items-center justify-center md:justify-start gap-6 md:gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group cursor-pointer"
                >
                  <span className="text-gray-600 group-hover:text-primary transition-colors">
                    {feature.icon}
                  </span>
                  <span className="text-sm">{feature.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 mb-12">
            Được tin tưởng bởi các
            <br />
            <span className="text-white font-medium">
              tổ chức hàng đầu Việt Nam
            </span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 lg:gap-16">
            {partners.map((partner, index) => (
              <div
                key={index}
                className="flex items-center gap-3 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer group"
              >
                <span className="opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all">
                  {partner.icon}
                </span>
                <span className="text-sm font-medium">{partner.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Tất cả tính năng bạn cần,
              <br />
              trong một nền tảng
            </h2>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            <div className="flex items-center gap-1 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="text-xs text-gray-500 mr-2">QUẢN LÝ</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium">
                <Bell className="w-4 h-4 text-primary" />
                SOS
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 text-gray-400 text-sm font-medium transition-colors">
                <Radio className="w-4 h-4 text-primary" />
                Điều phối
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 text-gray-400 text-sm font-medium transition-colors">
                <Package className="w-4 h-4 text-primary" />
                Kho vật tư
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 text-gray-400 text-sm font-medium transition-colors">
                <Users className="w-4 h-4 text-primary" />
                Đội cứu hộ
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 text-gray-400 text-sm font-medium transition-colors">
                <Map className="w-4 h-4 text-primary" />
                Bản đồ
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 text-gray-400 text-sm font-medium transition-colors">
                <MessageSquare className="w-4 h-4 text-primary" />
                Tin nhắn
              </button>
            </div>
            <div className="flex items-center gap-1 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="text-xs text-gray-500 mr-2">PHÂN TÍCH</span>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 text-gray-400 text-sm font-medium transition-colors">
                <Brain className="w-4 h-4 text-primary" />
                AI
              </button>
            </div>
          </div>

          {/* Feature Cards - Row 1 */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* SOS Management Card */}
            <div className="bg-[#1a1a1f] rounded-2xl border border-white/10 p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold text-white">Quản lý SOS</h3>
              </div>
              <p className="text-gray-400 mb-6">
                Tiếp nhận và xử lý tin báo SOS với{" "}
                <span className="text-white font-medium">
                  định vị GPS chính xác, phân loại mức độ khẩn cấp, và thông báo
                  tức thì
                </span>{" "}
                đến đội cứu hộ gần nhất.
              </p>

              {/* Mock SOS Form */}
              <div className="bg-[#0f0f11] rounded-xl p-4 border border-white/5">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      Vị trí
                    </label>
                    <div className="bg-[#1a1a1f] rounded-lg px-3 py-2 text-sm text-gray-300 border border-white/10">
                      📍 Quảng Nam, Việt Nam
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">
                      Mức độ khẩn cấp
                    </label>
                    <div className="flex gap-2">
                      <span className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30">
                        Khẩn cấp
                      </span>
                      <span className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-500 text-xs font-medium border border-white/10">
                        Trung bình
                      </span>
                      <span className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-500 text-xs font-medium border border-white/10">
                        Thấp
                      </span>
                    </div>
                  </div>
                  <button className="w-full py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-gray-100 transition-colors">
                    Gửi yêu cầu SOS
                  </button>
                  <p className="text-center text-xs text-gray-600">
                    hoặc gọi đường dây nóng
                  </p>
                  <button className="w-full py-2.5 rounded-lg bg-[#1a1a1f] text-white font-medium text-sm border border-white/10 flex items-center justify-center gap-2">
                    📞 1900-SOS-VN
                  </button>
                </div>
              </div>
            </div>

            {/* Coordinator Card */}
            <div className="bg-[#1a1a1f] rounded-2xl border border-white/10 p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-4">
                <Radio className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold text-white">Điều phối viên</h3>
              </div>
              <p className="text-gray-400 mb-6">
                <span className="text-white font-medium">
                  Bảng điều khiển trực quan
                </span>{" "}
                giúp coordinator theo dõi và phân công nhiệm vụ cho đội cứu hộ
                theo thời gian thực.
              </p>

              {/* Mock Table */}
              <div className="bg-[#0f0f11] rounded-xl border border-white/5 overflow-hidden">
                <div className="p-3 border-b border-white/5">
                  <span className="text-sm font-medium text-white">
                    Danh sách SOS
                  </span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5 text-xs text-gray-500">
                      <th className="text-left p-3 font-medium">Mã SOS</th>
                      <th className="text-left p-3 font-medium">Vị trí</th>
                      <th className="text-left p-3 font-medium">Trạng thái</th>
                      <th className="text-left p-3 font-medium">Đội</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b border-white/5">
                      <td className="p-3 text-gray-300">#SOS-2847</td>
                      <td className="p-3 text-gray-300">Đà Nẵng</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs">
                          Đang xử lý
                        </span>
                      </td>
                      <td className="p-3 text-gray-300">Đội A</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="p-3 text-gray-300">#SOS-2846</td>
                      <td className="p-3 text-gray-300">Quảng Nam</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">
                          Hoàn thành
                        </span>
                      </td>
                      <td className="p-3 text-gray-300">Đội B</td>
                    </tr>
                    <tr>
                      <td className="p-3 text-gray-300">#SOS-2845</td>
                      <td className="p-3 text-gray-300">Huế</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs">
                          Khẩn cấp
                        </span>
                      </td>
                      <td className="p-3 text-gray-300">Đội C</td>
                    </tr>
                  </tbody>
                </table>

                {/* Nested detail */}
                <div className="m-3 bg-[#1a1a1f] rounded-lg p-3 border border-white/10">
                  <div className="text-xs text-gray-500 mb-2">
                    Chi tiết #SOS-2845
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">ID</span>
                      <div className="text-white font-medium">2845</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Nạn nhân</span>
                      <div className="text-white font-medium">3 người</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Vật tư</span>
                      <div className="text-white font-medium">
                        Áo phao, Lương thực
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Cards - Row 2 */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Inventory Card */}
            <div className="bg-[#1a1a1f] rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Package className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white">Quản lý kho</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Theo dõi tồn kho với{" "}
                <span className="text-white font-medium">
                  cảnh báo thiếu hụt, quản lý xuất nhập
                </span>{" "}
                và báo cáo tự động.
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 bg-[#0f0f11] rounded-lg">
                  <span className="text-gray-400">Áo phao</span>
                  <span className="text-green-400">1,200 cái</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#0f0f11] rounded-lg">
                  <span className="text-gray-400">Lương thực</span>
                  <span className="text-yellow-400">450 kg ⚠️</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-[#0f0f11] rounded-lg">
                  <span className="text-gray-400">Nước uống</span>
                  <span className="text-green-400">800 thùng</span>
                </div>
              </div>
            </div>

            {/* Rescue Team Card */}
            <div className="bg-[#1a1a1f] rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white">Đội cứu hộ</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Quản lý đội ngũ với{" "}
                <span className="text-white font-medium">
                  30+ đội cứu hộ chuyên nghiệp
                </span>{" "}
                sẵn sàng 24/7.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 bg-[#0f0f11] rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white">Đội Alpha</div>
                    <div className="text-xs text-gray-500">
                      Đà Nẵng • 8 thành viên
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs">
                    Sẵn sàng
                  </span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-[#0f0f11] rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white">Đội Beta</div>
                    <div className="text-xs text-gray-500">
                      Quảng Nam • 6 thành viên
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs">
                    Đang đi
                  </span>
                </div>
              </div>
            </div>

            {/* AI Analysis Card */}
            <div className="bg-[#1a1a1f] rounded-2xl border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-3">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-white">Phân tích AI</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                <span className="text-white font-medium">
                  AI thông minh tự động phân loại
                </span>{" "}
                mức độ khẩn cấp và đề xuất phương án tối ưu.
              </p>
              <div className="bg-[#0f0f11] rounded-lg p-3 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="text-xs text-primary font-medium">
                    AI Suggestion
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Phát hiện 3 ca SOS cùng khu vực. Đề xuất điều động Đội Alpha
                  với 2 xuồng cứu hộ và 50 áo phao.
                </p>
                <div className="flex gap-2 mt-3">
                  <button className="px-3 py-1.5 rounded bg-primary/20 text-primary text-xs font-medium">
                    Áp dụng
                  </button>
                  <button className="px-3 py-1.5 rounded bg-white/5 text-gray-400 text-xs font-medium">
                    Bỏ qua
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Security & Reliability Section - Light Theme */}
      <section className="py-20 lg:py-32 bg-[#ffffff] text-gray-900">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.15] max-w-xl">
              Vận hành ổn định với
              <br />
              <span className="text-gray-900">độ tin cậy cao</span>
              <span className="text-primary">_</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed max-w-md lg:pt-2">
              Với phương châm đặt an toàn lên hàng đầu, chúng tôi đảm bảo hệ
              thống và dữ liệu luôn được bảo vệ, sẵn sàng phục vụ 24/7 trong mọi
              tình huống khẩn cấp.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {/* Row 1 */}
            <div className="group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Server className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Uptime 99.9%
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Hệ thống hoạt động ổn định với thời gian uptime cao, đảm bảo
                không bỏ lỡ bất kỳ tín hiệu SOS nào.
              </p>
            </div>

            <div className="group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                Mã hóa dữ liệu
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Mã hóa end-to-end cho mọi thông tin cá nhân và dữ liệu vị trí
                của người dùng.
              </p>
            </div>

            <div className="group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Giám sát 24/7
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Đội ngũ kỹ thuật giám sát hệ thống liên tục, phát hiện và xử lý
                sự cố ngay lập tức.
              </p>
            </div>

            <div className="group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Sao lưu tự động
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Dữ liệu được sao lưu tự động hàng ngày, đảm bảo không mất mát
                thông tin quan trọng.
              </p>
            </div>

            {/* Row 2 */}
            <div className="group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Phản hồi nhanh
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Thời gian phản hồi trung bình dưới 5 phút cho mọi yêu cầu SOS
                khẩn cấp.
              </p>
            </div>

            <div className="group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Xác thực đa lớp
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Bảo vệ tài khoản với xác thực 2 yếu tố và kiểm soát truy cập
                theo vai trò.
              </p>
            </div>

            <div className="group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Wifi className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Hoạt động offline
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Hỗ trợ chế độ offline, đồng bộ dữ liệu khi có kết nối mạng trở
                lại.
              </p>
            </div>

            <div className="group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Lịch sử đầy đủ
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Lưu trữ lịch sử hoạt động chi tiết, hỗ trợ báo cáo và phân tích
                sau sự kiện.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Network Map Section */}
      <NetworkMapSection />

      {/* Footer - Dark Theme */}
      <footer className="py-8 bg-[#0f0f11] border-t border-white/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold text-white">
                ResQ<span className="text-primary">SOS</span>
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">
                Điều khoản
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Bảo mật
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Liên hệ
              </a>
            </div>

            <p className="text-sm text-gray-600">© 2026 ResQ SOS Miền Trung</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
