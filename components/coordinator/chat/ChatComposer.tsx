"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye,
  ImageSquare,
  PencilSimpleLine,
  PaperPlaneTilt,
} from "@phosphor-icons/react";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
});

interface ChatComposerProps {
  disabled?: boolean;
  onSend: (content: string) => void | Promise<void>;
  onUploadImage?: (file: File) => Promise<void>;
}

export default function ChatComposer({
  disabled,
  onSend,
  onUploadImage,
}: ChatComposerProps) {
  const [content, setContent] = useState("");
  const [showMarkdownEditor, setShowMarkdownEditor] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(
    null,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isComposerDisabled = disabled || isUploadingImage;

  useEffect(() => {
    return () => {
      if (pendingImagePreview) {
        URL.revokeObjectURL(pendingImagePreview);
      }
    };
  }, [pendingImagePreview]);

  const clearPendingImage = () => {
    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
    }
    setPendingImageFile(null);
    setPendingImagePreview(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = content.trim();
    if (isComposerDisabled) {
      return;
    }

    if (!normalized && !pendingImageFile) {
      return;
    }

    if (normalized) {
      await onSend(normalized);
      setContent("");
    }

    if (pendingImageFile && onUploadImage) {
      try {
        setIsUploadingImage(true);
        await onUploadImage(pendingImageFile);
        clearPendingImage();
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const handleSelectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !onUploadImage || isComposerDisabled) {
      return;
    }

    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
    }

    setPendingImageFile(file);
    setPendingImagePreview(URL.createObjectURL(file));
  };

  return (
    <form
      ref={formRef}
      className="border-t bg-background p-3"
      onSubmit={handleSubmit}
    >
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
            disabled={isComposerDisabled}
          >
            {showMarkdownEditor ? (
              <PencilSimpleLine className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void handleSelectImage(event);
            }}
            disabled={isComposerDisabled}
          />

          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            disabled={isComposerDisabled || !onUploadImage}
            title="Gửi ảnh"
          >
            <ImageSquare className="h-4 w-4" />
          </Button>

          <Input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            placeholder="Nhập nội dung hỗ trợ victim..."
            disabled={isComposerDisabled}
            className="h-10 rounded-full border-slate-200 bg-slate-50 px-4"
          />

          <Button
            type="submit"
            disabled={
              isComposerDisabled || (!content.trim() && !pendingImageFile)
            }
            className="h-10 shrink-0 rounded-full px-4"
          >
            <PaperPlaneTilt className="h-4 w-4" weight="fill" />
          </Button>
        </div>

        {pendingImageFile && pendingImagePreview ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="truncate text-xs text-muted-foreground">
                Ảnh chờ gửi: {pendingImageFile.name}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 rounded-full px-2 text-xs"
                onClick={clearPendingImage}
                disabled={isComposerDisabled}
              >
                Xóa ảnh
              </Button>
            </div>
            <img
              src={pendingImagePreview}
              alt={pendingImageFile.name}
              className="max-h-52 w-auto max-w-full rounded-lg border border-black/10 object-cover"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Ảnh sẽ chỉ được upload khi bạn bấm gửi.
            </p>
          </div>
        ) : null}

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
                  disabled: isComposerDisabled,
                }}
              />
            </div>
          </div>
        ) : null}

        {isUploadingImage ? (
          <p className="text-xs text-muted-foreground">Đang tải ảnh lên...</p>
        ) : null}
      </div>
    </form>
  );
}
