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
} from "@phosphor-icons/react";
import type { PromptListProps } from "@/type";

const PromptList = ({
  prompts,
  isLoading,
  selectedId,
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
        <CardContent className="p-8 text-center">
          <Robot size={48} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground font-medium">
            Chưa có prompt nào
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Tạo prompt mới để bắt đầu cấu hình AI
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Robot size={20} weight="duotone" />
          Danh sách Prompts ({prompts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
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
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {prompt.name}
                  </h3>
                  <Badge
                    variant={prompt.isActive ? "success" : "secondary"}
                    className="shrink-0 text-[10px] px-1.5 py-0"
                  >
                    {prompt.isActive ? "Hoạt động" : "Tắt"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {prompt.purpose}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/80">
                  <span className="flex items-center gap-1">
                    <Robot size={12} />
                    {prompt.model}
                  </span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1">
                    <ThermometerHot size={12} />
                    {prompt.temperature}
                  </span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1">
                    <Lightning size={12} />
                    {prompt.maxTokens} tokens
                  </span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1">
                    <Hash size={12} />v{prompt.version}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(prompt);
                  }}
                >
                  <PencilSimple size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(prompt);
                  }}
                >
                  <Trash size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PromptList;
