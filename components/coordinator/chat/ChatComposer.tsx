"use client";

import { FormEvent, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, PencilSimpleLine, PaperPlaneTilt } from "@phosphor-icons/react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
});

interface ChatComposerProps {
  disabled?: boolean;
  onSend: (content: string) => void;
}

export default function ChatComposer({ disabled, onSend }: ChatComposerProps) {
  const [content, setContent] = useState("");
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = content.trim();
    if (!normalized || disabled) {
      return;
    }

    onSend(normalized);
    setContent("");
  };

  return (
    <form className="border-t bg-background p-3" onSubmit={handleSubmit}>
      <div
        className="mx-auto w-full max-w-2xl space-y-2"
        data-color-mode="light"
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={() => {
              setShowMarkdownEditor((prev) => !prev);
            }}
          >
            {showMarkdownEditor ? (
              <PencilSimpleLine className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>

          <Input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                const normalized = content.trim();
                if (!normalized || disabled) {
                  return;
                }
                onSend(normalized);
                setContent("");
              }
            }}
            placeholder="Nhập nội dung hỗ trợ victim..."
            disabled={disabled}
            className="h-10 rounded-full border-slate-200 bg-slate-50 px-4"
          />

          <Button
            type="submit"
            disabled={disabled || !content.trim()}
            className="h-10 shrink-0 rounded-full px-4"
          >
            <PaperPlaneTilt className="h-4 w-4" weight="fill" />
          </Button>
        </div>

        {showMarkdownEditor ? (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] text-muted-foreground">
                Hỗ trợ Markdown: đậm, nghiêng, danh sách, link
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1.5 rounded-full text-xs"
                onClick={() => {
                  setMode((prev) => (prev === "edit" ? "preview" : "edit"));
                }}
              >
                {mode === "edit" ? "Xem trước" : "Chỉnh sửa"}
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <MDEditor
                value={content}
                onChange={(value) => setContent(value ?? "")}
                preview={mode}
                height={110}
                visibleDragbar={false}
                previewOptions={{
                  skipHtml: true,
                }}
                textareaProps={{
                  placeholder: "Nhập nội dung hỗ trợ victim...",
                  disabled,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </form>
  );
}
