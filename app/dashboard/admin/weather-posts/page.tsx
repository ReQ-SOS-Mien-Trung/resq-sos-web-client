"use client";

import { useEffect, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { mockWeatherPosts } from "@/lib/mock-data/admin-weather-posts";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  WeatherPostCard,
  PostEditor,
  PostScheduler,
} from "@/components/admin/weather-posts";
import { Button } from "@/components/ui/button";
import { Plus, Grid, List } from "lucide-react";
import type { WeatherPost } from "@/types/admin-pages";
import { PageLoading } from "@/components/admin/PageLoading";

export default function WeatherPostsPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [posts, setPosts] = useState(mockWeatherPosts);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showEditor, setShowEditor] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
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
    return <PageLoading title="Đang tải bài đăng" subtitle="Đang chuẩn bị nội dung thời tiết…" />;
  }

  return (
    <DashboardLayout
      favorites={dashboardData.favorites}
      projects={dashboardData.projects}
      cloudStorage={dashboardData.cloudStorage}
    >
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Bài đăng thời tiết
            </h1>
            <p className="text-muted-foreground">
              Quản lý các bài đăng về thời tiết và cảnh báo
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? (
                <List className="h-4 w-4" />
              ) : (
                <Grid className="h-4 w-4" />
              )}
            </Button>
            <Button onClick={() => setShowEditor(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo bài đăng
            </Button>
          </div>
        </div>

        {showEditor && (
          <PostEditor
            onSave={(post) => {
              console.log("Save post:", post);
              setShowEditor(false);
            }}
            onCancel={() => setShowEditor(false)}
          />
        )}

        {showScheduler && (
          <PostScheduler
            onSchedule={(date, time) => {
              console.log("Schedule:", date, time);
              setShowScheduler(false);
            }}
            onCancel={() => setShowScheduler(false)}
          />
        )}

        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }
        >
          {posts.map((post) => (
            <WeatherPostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
