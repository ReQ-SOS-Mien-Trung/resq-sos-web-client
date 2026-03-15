import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PaperPlaneTilt } from "@phosphor-icons/react";

interface ChatComposerProps {
  disabled?: boolean;
  onSend: (content: string) => void;
}

export default function ChatComposer({ disabled, onSend }: ChatComposerProps) {
  const [content, setContent] = useState("");

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
    <form className="p-4 border-t bg-background" onSubmit={handleSubmit}>
      <div className="space-y-3">
        <Textarea
          placeholder="Nhập nội dung hỗ trợ victim..."
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={disabled}
          className="min-h-[88px] resize-none"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={disabled || !content.trim()}>
            <PaperPlaneTilt className="h-4 w-4" weight="fill" />
            Gửi tin
          </Button>
        </div>
      </div>
    </form>
  );
}
