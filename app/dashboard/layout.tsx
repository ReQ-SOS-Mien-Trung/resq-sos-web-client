import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coordinator Dashboard | ReQ-SOS Miền Trung",
  description:
    "Bảng điều khiển điều phối cứu hộ thiên tai - ReQ-SOS Miền Trung",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
