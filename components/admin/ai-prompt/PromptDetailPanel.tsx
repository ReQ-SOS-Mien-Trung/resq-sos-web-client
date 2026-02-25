"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Robot,
  Lightning,
  ThermometerHot,
  Hash,
  Clock,
  Globe,
  Eye,
} from "@phosphor-icons/react";
import type { PromptDetailPanelProps } from "@/type";

const PromptDetailPanel = ({ prompt, isLoading }: PromptDetailPanelProps) => {
  if (isLoading) {
    return (
      <Card className="border border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!prompt) {
    return (
      <Card className="border border-border/50">
        <CardContent className="p-12 text-center">
          <Eye
            size={48}
            className="mx-auto text-muted-foreground/40 mb-3"
            weight="duotone"
          />
          <p className="text-muted-foreground font-medium">
            Chọn một prompt để xem chi tiết
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Nhấn vào prompt trong danh sách bên trái
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border border-border/50 animate-in fade-in slide-in-from-right-2 duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{prompt.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {prompt.purpose}
            </p>
          </div>
          <Badge
            variant={prompt.isActive ? "success" : "secondary"}
            className="shrink-0"
          >
            {prompt.isActive ? "Hoạt động" : "Tắt"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
            <Robot size={16} className="text-blue-500 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Model</p>
              <p className="text-xs font-medium">{prompt.model}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
            <ThermometerHot size={16} className="text-orange-500 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Temperature</p>
              <p className="text-xs font-medium">{prompt.temperature}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
            <Lightning size={16} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Max Tokens</p>
              <p className="text-xs font-medium">
                {prompt.maxTokens.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
            <Hash size={16} className="text-purple-500 shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Version</p>
              <p className="text-xs font-medium">{prompt.version}</p>
            </div>
          </div>
        </div>

        {/* API URL */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
          <Globe size={16} className="text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground">API URL</p>
            <p className="text-xs font-mono truncate">{prompt.apiUrl}</p>
          </div>
        </div>

        <Separator />

        {/* System Prompt */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            System Prompt
          </h4>
          <div className="relative">
            <pre className="text-xs font-mono bg-muted/70 p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap wrap-break-word leading-relaxed border border-border/30">
              {prompt.systemPrompt}
            </pre>
          </div>
        </div>

        {/* User Prompt Template */}
        {prompt.userPromptTemplate && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              User Prompt Template
            </h4>
            <pre className="text-xs font-mono bg-muted/70 p-3 rounded-lg overflow-auto max-h-36 whitespace-pre-wrap wrap-break-word leading-relaxed border border-border/30">
              {prompt.userPromptTemplate}
            </pre>
          </div>
        )}

        <Separator />

        {/* Timestamps */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            Tạo: {formatDate(prompt.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            Cập nhật: {formatDate(prompt.updatedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PromptDetailPanel;
