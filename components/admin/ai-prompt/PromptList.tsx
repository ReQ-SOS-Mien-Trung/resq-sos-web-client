"use client";

import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PencilSimple, Robot, Trash } from "@phosphor-icons/react";
import { PROMPT_TYPE_LABELS } from "@/services/prompt/constants";
import type { PromptEntity, PromptType } from "@/services/prompt/type";
import type { AiConfigSummaryEntity } from "@/services/ai-config/type";
import { PROMPT_TYPE_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type PromptListProps = {
  prompts: PromptEntity[];
  isLoading: boolean;
  selectedId: number | null;
  activatingPromptId?: number | null;
  recommendedRollbackId?: number | null;
  selectedPromptType: PromptType | null;
  promptTypeCounts: Record<PromptType, number>;
  aiConfig?: AiConfigSummaryEntity | null;
  onSelectPromptType: (promptType: PromptType) => void;
  onSelect: (prompt: PromptEntity) => void;
  onEdit: (prompt: PromptEntity) => void | Promise<void>;
  onDelete: (prompt: PromptEntity) => void;
  onToggleActive: (prompt: PromptEntity, nextActive: boolean) => void;
};

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

function PromptTypeFilter({
  selectedPromptType,
  promptTypeCounts,
  onSelectPromptType,
}: {
  selectedPromptType: PromptType | null;
  promptTypeCounts: Record<PromptType, number>;
  onSelectPromptType: (promptType: PromptType) => void;
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2 pr-1">
        {PROMPT_TYPE_OPTIONS.map((option) => {
          const theme = PROMPT_TYPE_FILTER_THEME[option.value];
          const isSelected = selectedPromptType === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelectPromptType(option.value)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                isSelected ? theme.selected : theme.unselected,
              )}
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs",
                  isSelected
                    ? "border-white/30 bg-white/20 text-white"
                    : theme.badge,
                )}
              >
                {promptTypeCounts[option.value]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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

function getStatusLabel(status: string) {
  if (status === "Active") {
    return "Đang chạy";
  }

  if (status === "Draft") {
    return "Bản nháp";
  }

  if (status === "Archived") {
    return "Lưu trữ";
  }

  return status;
}

const PromptList = ({
  prompts,
  isLoading,
  selectedId,
  activatingPromptId = null,
  recommendedRollbackId = null,
  selectedPromptType,
  promptTypeCounts,
  aiConfig = null,
  onSelectPromptType,
  onSelect,
  onEdit,
  onDelete,
  onToggleActive,
}: PromptListProps) => {
  const [showAllVersions, setShowAllVersions] = useState(false);

  const archivedCount = useMemo(
    () => prompts.filter((prompt) => prompt.status === "Archived").length,
    [prompts],
  );

  const visiblePrompts = useMemo(() => {
    if (showAllVersions) {
      return prompts;
    }

    const compactPrompts = prompts.slice(0, 6);

    if (
      selectedId !== null &&
      !compactPrompts.some((prompt) => prompt.id === selectedId)
    ) {
      const selectedPrompt = prompts.find((prompt) => prompt.id === selectedId);
      if (selectedPrompt) {
        compactPrompts.push(selectedPrompt);
      }
    }

    return compactPrompts;
  }, [prompts, selectedId, showAllVersions]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border border-border/50">
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Robot size={22} weight="duotone" />
          Danh sách phiên bản mẫu lệnh
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <PromptTypeFilter
          selectedPromptType={selectedPromptType}
          promptTypeCounts={promptTypeCounts}
          onSelectPromptType={onSelectPromptType}
        />

        {prompts.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/95 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Đang hiển thị {visiblePrompts.length}/{prompts.length} phiên bản.
              {archivedCount > 0
                ? ` Có ${archivedCount} bản lưu trữ để khôi phục khi cần.`
                : ""}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAllVersions((previous) => !previous)}
            >
              {showAllVersions ? "Thu gọn danh sách" : "Xem tất cả phiên bản"}
            </Button>
          </div>
        ) : null}

        {!selectedPromptType ? (
          <div className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
            Chọn một loại mẫu lệnh để xem các phiên bản tương ứng.
          </div>
        ) : prompts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
            Chưa có mẫu lệnh nào thuộc loại này.
          </div>
        ) : (
          <div className="space-y-2">
            {visiblePrompts.map((prompt) => {
              const isDraft = prompt.status === "Draft";
              const isActive = prompt.status === "Active";
              const isActivating = activatingPromptId === prompt.id;
              const isSwitchOn = isActive || isActivating;
              const isRecommendedRollback =
                recommendedRollbackId !== null &&
                prompt.id === recommendedRollbackId &&
                prompt.status === "Archived";

              return (
                <div
                  key={prompt.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(prompt)}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      onSelect(prompt);
                    }
                  }}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-all",
                    selectedId === prompt.id
                      ? "border-primary/50 bg-primary/5 shadow-sm"
                      : "border-border/60 hover:border-border hover:bg-muted/20",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">
                          {prompt.name}
                        </p>
                        {!isDraft ? (
                          <Badge
                            variant={
                              prompt.status === "Active" ? "success" : "outline"
                            }
                          >
                            {getStatusLabel(prompt.status)}
                          </Badge>
                        ) : null}
                        {isRecommendedRollback ? (
                          <Badge variant="outline">Gợi ý khôi phục</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {PROMPT_TYPE_LABELS[prompt.promptType] ??
                          prompt.promptType}
                      </p>
                    </div>
                    <Badge variant="outline">{prompt.version || "—"}</Badge>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <span>Tạo: {formatDate(prompt.createdAt)}</span>
                      <span>Cập nhật: {formatDate(prompt.updatedAt)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span className="text-xs font-medium text-muted-foreground">
                          {isActive
                            ? "Đang chạy"
                            : isActivating
                              ? "Đang kích hoạt..."
                              : "Kích hoạt"}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isSwitchOn}
                          aria-label={`Kích hoạt ${prompt.name}`}
                          disabled={isActive || isActivating}
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleActive(prompt, true);
                          }}
                          className={cn(
                            "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors",
                            isSwitchOn
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-border bg-muted",
                            isActive || isActivating
                              ? "cursor-default"
                              : "cursor-pointer hover:border-emerald-400",
                            isActivating && "opacity-80",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                              isSwitchOn ? "translate-x-5" : "translate-x-0",
                            )}
                          />
                        </button>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          void onEdit(prompt);
                        }}
                      >
                        <PencilSimple size={14} className="mr-1.5" />
                        {isDraft ? "Sửa bản nháp" : "Tạo bản nháp"}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={!isDraft}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(prompt);
                        }}
                      >
                        <Trash size={14} className="mr-1.5" />
                        Xóa bản nháp
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PromptList;
