"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FloppyDisk, X, CircleNotch, Gear, Plus } from "@phosphor-icons/react";
import {
  PromptDetailEntity,
  CreatePromptRequest,
  UpdatePromptRequest,
} from "@/services/prompt/type";

interface PromptEditorProps {
  prompt?: PromptDetailEntity | null;
  isSubmitting?: boolean;
  onSave: (data: CreatePromptRequest | UpdatePromptRequest) => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  purpose: string;
  system_prompt: string;
  user_prompt_template: string;
  model: string;
  temperature: number;
  max_tokens: number;
  version: string;
  api_url: string;
  is_active: boolean;
}

const PROMPT_VARIABLES = [
  { label: "Tên nạn nhân", value: "victim_name" },
  { label: "Tọa độ", value: "coordinates" },
  { label: "Mức độ khẩn cấp", value: "urgency_level" },
  { label: "Mô tả tình huống", value: "situation_description" },
  { label: "Số người bị nạn", value: "victim_count" },
  { label: "Loại thiên tai", value: "disaster_type" },
  { label: "Khu vực", value: "region" },
  { label: "Thời gian", value: "timestamp" },
  { label: "Tài nguyên", value: "resources" },
  { label: "Yêu cầu", value: "request" },
];

const stripVersionPrefix = (version: string): string => {
  return version.replace(/^v/i, "");
};

const PromptEditor = ({
  prompt,
  isSubmitting,
  onSave,
  onCancel,
}: PromptEditorProps) => {
  const isEditing = !!prompt;

  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const userPromptRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    purpose: "",
    system_prompt: "",
    user_prompt_template: "",
    model: "",
    temperature: 0,
    max_tokens: 0,
    version: "",
    api_url: "",
    is_active: true,
  });

  useEffect(() => {
    if (prompt) {
      setFormData({
        name: prompt.name,
        purpose: prompt.purpose,
        system_prompt: prompt.systemPrompt,
        user_prompt_template: prompt.userPromptTemplate || "",
        model: prompt.model,
        temperature: prompt.temperature,
        max_tokens: prompt.maxTokens,
        version: stripVersionPrefix(prompt.version),
        api_url: prompt.apiUrl,
        is_active: prompt.isActive,
      });
    }
  }, [prompt]);

  const insertVariable = useCallback(
    (
      ref: React.RefObject<HTMLTextAreaElement | null>,
      field: "system_prompt" | "user_prompt_template",
      variable: string,
    ) => {
      const textarea = ref.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData[field];
      const insertion = `{${variable}}`;
      const newText = text.slice(0, start) + insertion + text.slice(end);

      updateField(field, newText);

      // Restore cursor position after insertion
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + insertion.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    },
    [formData],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataWithVersion = {
      ...formData,
      version: `v${stripVersionPrefix(formData.version)}`,
    };
    if (isEditing) {
      onSave(dataWithVersion as UpdatePromptRequest);
    } else {
      const { is_active, ...createData } = dataWithVersion;
      onSave(createData as CreatePromptRequest);
    }
  };

  const updateField = <K extends keyof FormData>(
    key: K,
    value: FormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="border border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gear size={20} weight="duotone" />
            {isEditing ? "Chỉnh sửa Prompt" : "Tạo Prompt mới"}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onCancel}
          >
            <X size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Tên Prompt *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
                placeholder="VD: Dispatch Decision Prompt"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="version">Phiên bản</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70 select-none pointer-events-none">
                  v
                </span>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, "");
                    updateField("version", val);
                  }}
                  placeholder="1.0"
                  className="pl-6"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purpose">Mục đích *</Label>
            <Input
              id="purpose"
              value={formData.purpose}
              onChange={(e) => updateField("purpose", e.target.value)}
              required
              placeholder="Mô tả ngắn gọn mục đích của prompt này"
            />
          </div>

          <Separator />

          {/* Model Config */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => updateField("model", e.target.value)}
                required
                placeholder="VD: gemini-2.0-flash"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={formData.temperature}
                onChange={(e) =>
                  updateField("temperature", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                min="1"
                value={formData.max_tokens}
                onChange={(e) =>
                  updateField("max_tokens", parseInt(e.target.value) || 0)
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="api_url">API URL *</Label>
            <Input
              id="api_url"
              value={formData.api_url}
              onChange={(e) => updateField("api_url", e.target.value)}
              required
              placeholder="https://api.example.com/v1/chat"
            />
          </div>

          <Separator />

          {/* Prompts */}
          <div className="space-y-2">
            <Label htmlFor="system_prompt">System Prompt *</Label>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {PROMPT_VARIABLES.map((v) => (
                <button
                  key={`sys-${v.value}`}
                  type="button"
                  onClick={() =>
                    insertVariable(systemPromptRef, "system_prompt", v.value)
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <Plus size={10} weight="bold" />
                  {v.label}
                </button>
              ))}
            </div>
            <Textarea
              id="system_prompt"
              ref={systemPromptRef}
              value={formData.system_prompt}
              onChange={(e) => updateField("system_prompt", e.target.value)}
              required
              rows={6}
              className="font-mono text-sm"
              placeholder="Nhập system prompt..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_prompt_template">User Prompt Template</Label>
            <div className="flex flex-wrap gap-1.5 pb-1">
              {PROMPT_VARIABLES.map((v) => (
                <button
                  key={`usr-${v.value}`}
                  type="button"
                  onClick={() =>
                    insertVariable(
                      userPromptRef,
                      "user_prompt_template",
                      v.value,
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <Plus size={10} weight="bold" />
                  {v.label}
                </button>
              ))}
            </div>
            <Textarea
              id="user_prompt_template"
              ref={userPromptRef}
              value={formData.user_prompt_template}
              onChange={(e) =>
                updateField("user_prompt_template", e.target.value)
              }
              rows={4}
              className="font-mono text-sm"
              placeholder="Nhập user prompt template với biến {variable}..."
            />
          </div>

          {/* Active toggle (only for edit mode) */}
          {isEditing && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => updateField("is_active", e.target.checked)}
                className="rounded border-border"
              />
              <Label htmlFor="is_active" className="cursor-pointer text-sm">
                Kích hoạt prompt này
              </Label>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <CircleNotch size={16} className="mr-2 animate-spin" />
              ) : (
                <FloppyDisk size={16} className="mr-2" />
              )}
              {isEditing ? "Cập nhật" : "Tạo mới"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PromptEditor;
