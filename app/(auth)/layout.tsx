import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding with Full Background Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image - Full Screen */}
        <Image
          src="/images/authenbackground.jpg"
          alt="ResQ SOS Branding"
          fill
          className="object-cover"
          priority
          quality={90}
        />

        {/* Content Overlay - Logo and Text */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white h-full">
          {/* Logo - Overlay on top with backdrop */}
          <Link
            href="/"
            className="flex items-center gap-3 transition-transform hover:scale-105 z-20 w-fit px-4 py-2 rounded-xl bg-black/30 backdrop-blur-sm"
          >
            <Image
              src="/icons/logo.svg"
              alt="ResQ SOS Logo"
              width={48}
              height={48}
              className="w-12 h-12 drop-shadow-lg"
            />
            <div>
              <h1 className="text-2xl font-bold font-sans">ResQ SOS</h1>
              <p className="text-sm opacity-90 font-sans">Miền Trung</p>
            </div>
          </Link>

          {/* Text Content - Overlay on bottom with backdrop */}
          <div className="space-y-4 max-w-lg animate-in fade-in-0 slide-in-from-left duration-700 p-6 rounded-2xl bg-black/40 backdrop-blur-sm">
            <h2 className="text-4xl font-bold leading-tight font-sans">
              Hệ thống tiếp nhận tin báo SOS và điều phối cứu hộ khẩn cấp
            </h2>
            <p className="text-lg opacity-95 leading-relaxed font-sans">
              Hỗ trợ kịp thời cho người dân khu vực Miền Trung trong các tình
              huống khẩn cấp
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden w-full p-6 bg-gradient-to-r from-orange-500/10 to-orange-400/5">
        <Link
          href="/"
          className="flex items-center gap-3 transition-transform hover:scale-105"
        >
          <Image
            src="/icons/logo.svg"
            alt="ResQ SOS Logo"
            width={40}
            height={40}
            className="w-10 h-10"
          />
          <div>
            <h1 className="text-xl font-bold font-sans">ResQ SOS</h1>
            <p className="text-xs opacity-90 font-sans">Miền Trung</p>
          </div>
        </Link>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-in fade-in-0 slide-in-from-right duration-700 scale-in">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
