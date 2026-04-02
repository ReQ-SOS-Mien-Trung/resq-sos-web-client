import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatedLogo } from "@/components/auth/AnimatedLogo";

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding with Full Background Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image - Full Screen */}
        <Image
          src="/images/IMG_1301.JPG"
          alt="ResQ SOS Branding"
          fill
          className="object-cover"
          priority
        />

        <div className="absolute left-12 top-12 z-10">
          <Link
            href="/"
            aria-label="Trang chu ResQ SOS"
            className="block transition-transform hover:scale-105"
          >
            <AnimatedLogo className="h-[clamp(5.25rem,7.8vw,8.4rem)] w-[clamp(5.25rem,7.8vw,8.4rem)] drop-shadow-[0_10px_24px_rgba(255,87,34,0.28)]" />
          </Link>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden w-full p-6 bg-linear-to-r from-orange-500/10 to-orange-400/5">
        <Link
          href="/"
          aria-label="Trang chu ResQ SOS"
          className="w-fit rounded-2xl bg-black/5 p-2 transition-transform hover:scale-105"
        >
          <AnimatedLogo className="h-11 w-11" />
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
