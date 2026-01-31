"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import {
  mockChatRooms,
  mockMessageTemplates,
} from "@/lib/mock-data/admin-chat-config";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  ChatRoomList,
  ChatSettings,
  MessageTemplates,
} from "@/components/admin/chat-config";
import { PageLoading } from "@/components/admin";

export default function ChatConfigPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !dashboardData) {
    return <PageLoading />;
  }

  return (
    <DashboardLayout
      favorites={dashboardData.favorites}
      projects={dashboardData.projects}
      cloudStorage={dashboardData.cloudStorage}
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Cấu hình phòng chat
          </h1>
          <p className="text-muted-foreground">
            Quản lý phòng chat và templates tin nhắn
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChatRoomList
            rooms={mockChatRooms}
            onEdit={(room) => setSelectedRoom(room)}
          />
          {selectedRoom && (
            <ChatSettings
              room={selectedRoom}
              onSave={(settings) => {
                console.log("Save settings:", settings);
                setSelectedRoom(null);
              }}
              onCancel={() => setSelectedRoom(null)}
            />
          )}
        </div>

        <MessageTemplates templates={mockMessageTemplates} />
      </div>
    </DashboardLayout>
  );
}
