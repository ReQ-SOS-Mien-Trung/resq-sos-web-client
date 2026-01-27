"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, MessageSquare } from "lucide-react";
import type { MessageTemplate } from "@/types/admin-pages";

interface MessageTemplatesProps {
  templates: MessageTemplate[];
  onEdit?: (template: MessageTemplate) => void;
  onDelete?: (template: MessageTemplate) => void;
}

export function MessageTemplates({
  templates,
  onEdit,
  onDelete,
}: MessageTemplatesProps) {
  const getCategoryBadge = (category: MessageTemplate["category"]) => {
    const variants = {
      greeting: { label: "Chào hỏi", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
      response: { label: "Phản hồi", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
      escalation: { label: "Chuyển tiếp", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
      closing: { label: "Kết thúc", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
    };
    return variants[category];
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Templates tin nhắn
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {templates.map((template) => {
            const categoryBadge = getCategoryBadge(template.category);
            return (
              <div
                key={template.id}
                className="p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {template.name}
                      </h3>
                      <Badge className={categoryBadge.className}>
                        {categoryBadge.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {template.content}
                    </p>
                    {template.variables && template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.variables.map((variable, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-muted rounded-md"
                          >
                            {`{${variable}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit?.(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete?.(template)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
