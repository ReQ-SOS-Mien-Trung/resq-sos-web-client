import {
  Bell,
  Radio,
  Package,
  Users,
  Map,
  MessageSquare,
  Brain,
} from "lucide-react";

const ProductsSection = () => {
  return (
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
                Phát hiện 3 ca SOS cùng khu vực. Đề xuất điều động Đội Alpha với
                2 xuồng cứu hộ và 50 áo phao.
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
  );
};

export default ProductsSection;

