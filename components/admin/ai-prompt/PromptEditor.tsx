"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { FloppyDisk, X, CircleNotch, Gear, Plus } from "@phosphor-icons/react";
import type {
  PromptEditorProps,
  PromptFormData,
  PromptTextField,
} from "@/type";
import { PROMPT_VARIABLES, INITIAL_FORM_DATA } from "@/lib/constants";
import type {
  PromptDetailEntity,
  CreatePromptRequest,
  UpdatePromptRequest,
} from "@/services/prompt/type";

// --- Helpers ---

const stripVersionPrefix = (version: string): string =>
  version.replace(/^v/i, "");

const toVersionString = (version: string): string =>
  `v${stripVersionPrefix(version)}`;

const mapDetailToForm = (detail: PromptDetailEntity): PromptFormData => ({
  name: detail.name,
  purpose: detail.purpose,
  system_prompt: detail.systemPrompt,
  user_prompt_template: detail.userPromptTemplate || "",
  model: detail.model,
  temperature: detail.temperature,
  max_tokens: detail.maxTokens,
  version: stripVersionPrefix(detail.version),
  api_url: detail.apiUrl,
  is_active: detail.isActive,
});

// --- Sub-components ---

const VariableChips = ({
  field,
  onInsert,
}: {
  field: PromptTextField;
  onInsert: (field: PromptTextField, variable: string) => void;
}) => (
  <div className="flex flex-wrap gap-1.5 pb-1">
    {PROMPT_VARIABLES.map((v) => (
      <button
        key={`${field}-${v.value}`}
        type="button"
        onClick={() => onInsert(field, v.value)}
        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
      >
        <Plus size={10} weight="bold" />
        {v.label}
      </button>
    ))}
  </div>
);

const PromptEditor = ({
  prompt,
  isSubmitting,
  onSave,
  onCancel,
}: PromptEditorProps) => {
  const isEditing = !!prompt;

  const systemPromptRef = useRef<HTMLTextAreaElement>(null);
  const userPromptRef = useRef<HTMLTextAreaElement>(null);

  const textareaRefMap: Record<
    PromptTextField,
    React.RefObject<HTMLTextAreaElement | null>
  > = {
    system_prompt: systemPromptRef,
    user_prompt_template: userPromptRef,
  };

  const [formData, setFormData] = useState<PromptFormData>(INITIAL_FORM_DATA);

  useEffect(() => {
    if (prompt) setFormData(mapDetailToForm(prompt));
  }, [prompt]);

  const updateField = <K extends keyof PromptFormData>(
    key: K,
    value: PromptFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleInsertVariable = useCallback(
    (field: PromptTextField, variable: string) => {
      const textarea = textareaRefMap[field].current;
      if (!textarea) return;

      const { selectionStart: start, selectionEnd: end } = textarea;
      const insertion = `{${variable}}`;
      const newText =
        formData[field].slice(0, start) +
        insertion +
        formData[field].slice(end);

      updateField(field, newText);

      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + insertion.length;
        textarea.setSelectionRange(pos, pos);
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, version: toVersionString(formData.version) };

    if (isEditing) {
      onSave(payload as UpdatePromptRequest);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { is_active, ...createData } = payload;
      onSave(createData as CreatePromptRequest);
    }
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground/70 select-none pointer-events-none">
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
            <VariableChips
              field="system_prompt"
              onInsert={handleInsertVariable}
            />
            <Textarea
              id="system_prompt"
              ref={systemPromptRef}
              value={formData.system_prompt}
              onChange={(e) => updateField("system_prompt", e.target.value)}
              required
              rows={6}
              className="font-mono text-base"
              placeholder="Nhập system prompt..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_prompt_template">User Prompt Template</Label>
            <VariableChips
              field="user_prompt_template"
              onInsert={handleInsertVariable}
            />
            <Textarea
              id="user_prompt_template"
              ref={userPromptRef}
              value={formData.user_prompt_template}
              onChange={(e) =>
                updateField("user_prompt_template", e.target.value)
              }
              rows={4}
              className="font-mono text-base"
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
              <Label htmlFor="is_active" className="cursor-pointer text-base">
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
