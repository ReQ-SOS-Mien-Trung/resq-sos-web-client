"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PromptTemplate } from "@/types/admin-pages";

interface PromptTemplatesProps {
  templates: PromptTemplate[];
  onUseTemplate?: (template: PromptTemplate) => void;
}

export function PromptTemplates({
  templates,
  onUseTemplate,
}: PromptTemplatesProps) {
  const getCategoryBadge = (category: PromptTemplate["category"]) => {
    const variants = {
      dispatch: { label: "Điều phối", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
      classification: { label: "Phân loại", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
      recommendation: { label: "Đề xuất", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
      other: { label: "Khác", className: "bg-gray-500/10 text-gray-700 dark:text-gray-400" },
    };
    return variants[category];
  };

  return (
    <Card className="border border-border/50">
      <CardHeader>
        <CardTitle>Templates</CardTitle>
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
                    <p className="text-sm text-foreground/70 mb-2">
                      {template.description}
                    </p>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      {template.template}
                    </pre>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUseTemplate?.(template)}
                  >
                    Sử dụng
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
