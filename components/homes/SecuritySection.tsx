import {
  Server,
  Lock,
  ArrowRight,
  Eye,
  Database,
  Zap,
  ShieldCheck,
  Wifi,
  Clock,
} from "lucide-react";

const SecuritySection = () => {
  return (
    <section className="py-20 lg:py-32 bg-[#ffffff] text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-16 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.15] max-w-xl">
            Vận hành ổn định với
            <br />
            <span className="text-gray-900">độ tin cậy cao</span>
            <span className="text-primary">_</span>
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed max-w-md lg:pt-2">
            Với phương châm đặt an toàn lên hàng đầu, chúng tôi đảm bảo hệ thống
            và dữ liệu luôn được bảo vệ, sẵn sàng phục vụ 24/7 trong mọi tình
            huống khẩn cấp.
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
              Hệ thống hoạt động ổn định với thời gian uptime cao, đảm bảo không
              bỏ lỡ bất kỳ tín hiệu SOS nào.
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
              Mã hóa end-to-end cho mọi thông tin cá nhân và dữ liệu vị trí của
              người dùng.
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
              Đội ngũ kỹ thuật giám sát hệ thống liên tục, phát hiện và xử lý sự
              cố ngay lập tức.
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
              Thời gian phản hồi trung bình dưới 5 phút cho mọi yêu cầu SOS khẩn
              cấp.
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
              Bảo vệ tài khoản với xác thực 2 yếu tố và kiểm soát truy cập theo
              vai trò.
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
  );
};

export default SecuritySection;
