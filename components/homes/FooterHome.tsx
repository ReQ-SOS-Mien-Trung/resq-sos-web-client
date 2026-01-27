import { Shield } from "lucide-react";

const FooterHome = () => {
  return (
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
  );
};

export default FooterHome;

