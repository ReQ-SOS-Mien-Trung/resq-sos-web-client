"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  Eye,
  Hash,
  Key,
  Robot,
  Sparkle,
} from "@phosphor-icons/react";
import { PROMPT_TYPE_LABELS } from "@/services/prompt/constants";
import type { PromptDetailEntity } from "@/services/prompt/type";
import type { AiConfigSummaryEntity } from "@/services/ai-config/type";

type PromptDetailPanelProps = {
  prompt: PromptDetailEntity | null;
  isLoading: boolean;
  aiConfig?: AiConfigSummaryEntity | null;
};

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PromptDetailPanel = ({
  prompt,
  isLoading,
  aiConfig = null,
}: PromptDetailPanelProps) => {
  if (isLoading) {
    return (
      <Card className="border border-border/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
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
            className="mx-auto mb-3 text-muted-foreground/40"
            weight="duotone"
          />
          <p className="text-base font-medium text-muted-foreground">
            Chọn một prompt để xem chi tiết
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-in slide-in-from-right-2 border border-border/50 duration-300">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{prompt.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {prompt.purpose || "—"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">
                {PROMPT_TYPE_LABELS[prompt.promptType] ?? prompt.promptType}
              </Badge>
              <Badge variant={prompt.status === "Active" ? "success" : "outline"}>
                {prompt.status}
              </Badge>
              <Badge variant="outline">{prompt.version || "—"}</Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Version</p>
            <p className="mt-1 text-sm font-medium">{prompt.version || "—"}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Tạo lúc</p>
            <p className="mt-1 text-sm font-medium">
              {formatDate(prompt.createdAt)}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">Cập nhật</p>
            <p className="mt-1 text-sm font-medium">
              {formatDate(prompt.updatedAt)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <Robot size={18} className="mt-0.5 text-primary" />
            <div className="min-w-0 space-y-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  AI config dùng chung
                </p>
                <p className="text-sm text-muted-foreground">
                  Prompt này sẽ dùng AI config hệ thống đang chọn hoặc đang active.
                </p>
              </div>

              {aiConfig ? (
                <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <p className="text-muted-foreground">Tên config</p>
                    <p className="mt-1 font-medium">{aiConfig.name}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <p className="text-muted-foreground">Provider / Model</p>
                    <p className="mt-1 font-medium break-all">
                      {aiConfig.provider} • {aiConfig.model}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <p className="text-muted-foreground">Version</p>
                    <p className="mt-1 font-medium">
                      {aiConfig.version || "—"} • {aiConfig.status}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <p className="text-muted-foreground">API key</p>
                    <p className="mt-1 font-medium">
                      {aiConfig.hasApiKey
                        ? aiConfig.apiKeyMasked || "Đã cấu hình"
                        : "Chưa có key riêng"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa có AI config để gắn vào phần test hoặc hiển thị tóm tắt.
                </p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Sparkle size={14} />
            System Prompt
          </h4>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border/30 bg-muted/70 p-3 font-mono text-sm leading-relaxed">
            {prompt.systemPrompt || "—"}
          </pre>
        </div>

        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Hash size={14} />
            User Prompt Template
          </h4>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-border/30 bg-muted/70 p-3 font-mono text-sm leading-relaxed">
            {prompt.userPromptTemplate || "—"}
          </pre>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <span className="flex items-center gap-2">
            <Clock size={14} />
            Tạo: {formatDate(prompt.createdAt)}
          </span>
          <span className="flex items-center gap-2">
            <Key size={14} />
            AI config: {aiConfig?.name ?? "Chưa chọn"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default PromptDetailPanel;
