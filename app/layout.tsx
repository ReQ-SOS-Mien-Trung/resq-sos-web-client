import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import { sfUIDisplay } from "./fonts";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "ResQ SOS Mien Trung",
  description:
    "Hệ thống tiếp nhận tin báo SOS và điều phối cứu hộ khẩn cấp, hỗ trợ kịp thời cho người dân khu vực Miền Trung.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          src="https://cdn.lordicon.com/lordicon.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${sfUIDisplay.variable} antialiased`} suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
