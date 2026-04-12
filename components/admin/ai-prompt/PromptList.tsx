"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lightning,
  Trash,
  PencilSimple,
  Robot,
  ThermometerHot,
  Hash,
  Key,
} from "@phosphor-icons/react";
import type { PromptListProps } from "@/type";
import type { PromptType } from "@/services/prompt/type";
import { PROMPT_TYPE_LABELS } from "@/services/prompt/constants";
import { PROMPT_TYPE_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PROVIDER_BADGE_CLASSNAMES = {
  Gemini: "border-sky-200 bg-sky-50 text-sky-700",
  OpenRouter: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

const PROMPT_TYPE_FILTER_THEME: Record<
  PromptType,
  { selected: string; unselected: string; badge: string }
> = {
  SosPriorityAnalysis: {
    selected: "border-red-500 bg-red-500 text-white",
    unselected: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    badge: "border-red-300/60 bg-white/80 text-red-700",
  },
  MissionPlanning: {
    selected: "border-emerald-500 bg-emerald-500 text-white",
    unselected:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    badge: "border-emerald-300/60 bg-white/80 text-emerald-700",
  },
  MissionRequirementsAssessment: {
    selected: "border-blue-500 bg-blue-500 text-white",
    unselected: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
    badge: "border-blue-300/60 bg-white/80 text-blue-700",
  },
  MissionDepotPlanning: {
    selected: "border-amber-500 bg-amber-500 text-white",
    unselected:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    badge: "border-amber-300/60 bg-white/80 text-amber-700",
  },
  MissionTeamPlanning: {
    selected: "border-violet-500 bg-violet-500 text-white",
    unselected:
      "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
    badge: "border-violet-300/60 bg-white/80 text-violet-700",
  },
  MissionPlanValidation: {
    selected: "border-cyan-500 bg-cyan-500 text-white",
    unselected: "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
    badge: "border-cyan-300/60 bg-white/80 text-cyan-700",
  },
};

const PromptList = ({
  prompts,
  isLoading,
  selectedId,
  selectedPromptType,
  promptTypeCounts,
  onSelectPromptType,
  onSelect,
  onEdit,
  onDelete,
}: PromptListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border border-border/50">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!prompts.length) {
    return (
      <Card className="border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Robot size={22} weight="duotone" />
            Lọc theo loại Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PromptTypeFilter
            selectedPromptType={selectedPromptType}
            promptTypeCounts={promptTypeCounts}
            onSelectPromptType={onSelectPromptType}
          />
          <div className="p-8 text-center">
            <Robot
              size={48}
              className="mx-auto text-muted-foreground/50 mb-3"
            />
            <p className="text-base text-muted-foreground font-medium">
              {selectedPromptType
                ? "Chưa có prompt thuộc loại này"
                : "Chọn một loại prompt để xem danh sách"}
            </p>
            <p className="text-base text-muted-foreground/70 mt-1">
              {selectedPromptType
                ? "Tạo prompt mới hoặc chọn loại prompt khác."
                : "Danh sách prompt sẽ chỉ hiện sau khi chọn loại."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Robot size={22} weight="duotone" />
          Danh sách Prompts ({prompts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PromptTypeFilter
          selectedPromptType={selectedPromptType}
          promptTypeCounts={promptTypeCounts}
          onSelectPromptType={onSelectPromptType}
        />
        <div className="space-y-2 max-h-[calc(100vh-390px)] overflow-y-auto">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              onClick={() => onSelect(prompt)}
              className={`group p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                selectedId === prompt.id
                  ? "border-primary/50 bg-primary/5 shadow-sm"
                  : "border-border/50 hover:border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-semibold text-base text-foreground truncate">
                      {prompt.name}
                    </h3>
                    <Badge
                      variant={prompt.isActive ? "success" : "secondary"}
                      className="shrink-0 text-xs px-1.5 py-0"
                    >
                      {prompt.isActive ? "Hoạt động" : "Tắt"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={PROVIDER_BADGE_CLASSNAMES[prompt.provider]}
                    >
                      {prompt.provider}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {prompt.purpose}
                  </p>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {PROMPT_TYPE_LABELS[prompt.promptType] ??
                        prompt.promptType}
                    </Badge>
                    <Badge variant="outline">
                      <Key size={12} className="mr-1" />
                      {prompt.hasApiKey ? "Có key riêng" : "Dùng key mặc định"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/80">
                    <span className="flex items-center gap-1">
                      <Robot size={14} />
                      {prompt.model || "Default"}
                    </span>
                    <span className="text-border">•</span>
                    <span className="flex items-center gap-1">
                      <ThermometerHot size={14} />
                      {prompt.temperature ?? "—"}
                    </span>
                    <span className="text-border">•</span>
                    <span className="flex items-center gap-1">
                      <Lightning size={14} />
                      {prompt.maxTokens?.toLocaleString() ?? "—"} tokens
                    </span>
                    <span className="text-border">•</span>
                    <span className="flex items-center gap-1">
                      <Hash size={14} />
                      {prompt.version || "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(prompt);
                    }}
                  >
                    <PencilSimple size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(prompt);
                    }}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const PromptTypeFilter = ({
  selectedPromptType,
  promptTypeCounts,
  onSelectPromptType,
}: Pick<
  PromptListProps,
  "selectedPromptType" | "promptTypeCounts" | "onSelectPromptType"
>) => (
  <div className="space-y-2">
    <p className="text-sm font-medium text-muted-foreground">Loại Prompt</p>
    <div className="flex flex-wrap gap-2">
      {PROMPT_TYPE_OPTIONS.map((option) => {
        const isSelected = selectedPromptType === option.value;
        const theme = PROMPT_TYPE_FILTER_THEME[option.value];

        return (
          <Button
            key={option.value}
            type="button"
            variant="outline"
            className={cn(
              "h-auto rounded-full px-3 py-2 text-left transition-colors",
              isSelected ? theme.selected : theme.unselected,
            )}
            onClick={() => onSelectPromptType(option.value)}
          >
            <span className="truncate text-sm font-medium">{option.label}</span>
            <span
              className={cn(
                "ml-2 inline-flex min-w-6 items-center justify-center rounded-full border px-1.5 py-0.5 text-xs font-semibold",
                isSelected
                  ? "border-white/30 bg-white/20 text-white"
                  : theme.badge,
              )}
            >
              {promptTypeCounts[option.value] ?? 0}
            </span>
          </Button>
        );
      })}
    </div>
  </div>
);

export default PromptList;
