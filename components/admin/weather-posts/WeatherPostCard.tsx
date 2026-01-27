"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye, Calendar, User } from "lucide-react";
import type { WeatherPost } from "@/types/admin-pages";
import { cn } from "@/lib/utils";

interface WeatherPostCardProps {
  post: WeatherPost;
  onEdit?: (post: WeatherPost) => void;
  onDelete?: (post: WeatherPost) => void;
  onView?: (post: WeatherPost) => void;
}

export function WeatherPostCard({
  post,
  onEdit,
  onDelete,
  onView,
}: WeatherPostCardProps) {
  const getStatusBadge = (status: WeatherPost["status"]) => {
    const variants = {
      published: {
        label: "Đã xuất bản",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      },
      draft: {
        label: "Bản nháp",
        className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
      },
      scheduled: {
        label: "Đã lên lịch",
        className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
      },
    };
    return variants[status];
  };

  const getCategoryBadge = (category: WeatherPost["category"]) => {
    const variants = {
      weather: { label: "Thời tiết", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
      flood: { label: "Lũ lụt", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
      alert: { label: "Cảnh báo", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
      general: { label: "Chung", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
    };
    return variants[category];
  };

  const statusBadge = getStatusBadge(post.status);
  const categoryBadge = getCategoryBadge(post.category);

  return (
    <Card className="border border-border/50 hover:shadow-lg transition-shadow">
      {post.imageUrl && (
        <div className="h-48 w-full bg-muted rounded-t-lg overflow-hidden">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">
              {post.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
              <Badge className={categoryBadge.className}>
                {categoryBadge.label}
              </Badge>
            </div>
          </div>
        </div>
        <p className="text-sm text-foreground/70 line-clamp-3 mb-3">
          {post.content}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{post.author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(post.publishDate).toLocaleDateString("vi-VN")}
            </span>
          </div>
          {post.views > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{post.views.toLocaleString()} lượt xem</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView?.(post)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Xem
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(post)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Sửa
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete?.(post)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
