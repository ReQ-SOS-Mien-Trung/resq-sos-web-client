import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Play,
  ArrowRight,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Truck,
} from "lucide-react";

const HeroSection = () => {
  return (
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
              ResQ SOS là nền tảng tiếp nhận và điều phối cứu hộ khẩn cấp cho khu
              vực Miền Trung Việt Nam. Kết nối nhanh chóng giữa người dân và lực
              lượng cứu hộ, tất cả trong một hệ thống thống nhất.
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
                    <div className="text-xs text-gray-500 mb-1">SOS hôm nay</div>
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
  );
};

export default HeroSection;

