"use client";

import Link from "next/link";
import Image from "next/image";
import { Undo2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Main Heading */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-black">
          Ùiii Uôiii!
        </h1>

        {/* Subheading */}
        <h2 className="text-xl sm:text-2xl md:text-3xl text-black font-medium">
          Bạn đã mất đường
        </h2>

        {/* Illustration */}
        <div className="relative w-full max-w-md mx-auto my-8">
          <Image
            src="/images/404.png"
            alt="404 illustration - message in a bottle"
            width={600}
            height={600}
            className="w-full h-auto object-contain"
            priority
          />
        </div>

        {/* Go Home Link */}
        <div className="mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg sm:text-xl text-black hover:text-black/80 transition-colors border-b-2 border-black pb-1"
          >
            <Undo2 className="w-5 h-5 sm:w-6 sm:h-6" />
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
