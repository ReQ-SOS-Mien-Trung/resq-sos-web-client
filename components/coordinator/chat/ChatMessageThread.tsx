import { ScrollArea } from "@/components/ui/scroll-area";
import { ReceiveMessageEvent } from "@/services/chat/type";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageThreadProps {
  messages: ReceiveMessageEvent[];
  isLoading: boolean;
  conversationPartnerLabel?: string;
}

export default function ChatMessageThread({
  messages,
  isLoading,
  conversationPartnerLabel,
}: ChatMessageThreadProps) {
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Đang tải hội thoại...
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Chưa có tin nhắn. Hãy gửi tin đầu tiên.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {messages.map((message) => {
          if (message.messageType === "SystemMessage") {
            return (
              <div
                key={`${message.id}-${message.createdAt}`}
                className="flex justify-center"
              >
                <p className="rounded-full px-3 py-1 text-xs bg-muted text-muted-foreground">
                  {message.content}
                </p>
              </div>
            );
          }

          const isOwnMessage =
            !!currentUserId && message.senderId === currentUserId;
          const isAiMessage = message.messageType === "AiMessage";
          const senderLabel =
            message.senderName?.trim() ||
            (!isOwnMessage && !isAiMessage ? conversationPartnerLabel : null) ||
            (!isOwnMessage && !isAiMessage ? "Người dân" : "Unknown");

          return (
            <div
              key={`${message.id}-${message.createdAt}`}
              className={cn(
                "flex",
                isOwnMessage ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2",
                  isOwnMessage
                    ? "bg-primary text-primary-foreground"
                    : isAiMessage
                      ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                      : "bg-muted text-foreground",
                )}
              >
                <div className="text-sm break-words [&_a]:underline [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/15 [&_pre]:p-2 [&_ul]:list-disc [&_ul]:pl-5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
                <p
                  className={cn(
                    "mt-1 text-[11px]",
                    isOwnMessage
                      ? "text-primary-foreground/80"
                      : isAiMessage
                        ? "text-amber-700/80 dark:text-amber-200/80"
                        : "text-muted-foreground",
                  )}
                >
                  {senderLabel} •{" "}
                  {new Date(message.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
