import type { Metadata } from "next";
import "./globals.css";
import { sfUIDisplay } from "./fonts";

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
    <html lang="en">
      <body className={`${sfUIDisplay.variable} antialiased`}>{children}</body>
    </html>
  );
}
