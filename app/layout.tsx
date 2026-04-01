import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import { sfUIDisplay } from "./fonts";
import Providers from "./providers";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "ResQ SOS Mien Trung",
  description:
    "Hệ thống tiếp nhận tin báo SOS và điều phối cứu hộ khẩn cấp, hỗ trợ kịp thời cho người dân khu vực Miền Trung.",
};

const themeInitScript = `
  try {
    const rawThemeState = window.localStorage.getItem("theme-storage");
    const parsedThemeState = rawThemeState ? JSON.parse(rawThemeState) : null;
    const isDarkMode = Boolean(parsedThemeState?.state?.isDarkMode);

    document.documentElement.classList.toggle("dark", isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
  } catch {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Script
          src="https://cdn.lordicon.com/lordicon.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${sfUIDisplay.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
