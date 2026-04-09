"use client";

import { useState } from "react";
import { ArrowSquareOut, Package } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  onOpenSosRequest?: (sosRequestId: number) => void;
}

type SosCardData = {
  sosRequestId: number;
  status?: string;
  priority?: string;
  sosType?: string;
  summary?: string;
  details: Array<{ label: string; value: string }>;
  source: "quick-dispatch" | "sos-list" | "sos-selected";
};

function toCleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseSummaryParts(
  summary?: string,
): Array<{ label: string; value: string }> {
  if (!summary) return [];

  const parts = summary
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const details: Array<{ label: string; value: string }> = [];
  for (const part of parts.slice(1)) {
    const separatorIndex = part.indexOf(":");
    if (separatorIndex <= 0) continue;

    const label = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (!label || !value) continue;
    details.push({ label, value });
  }

  return details.slice(0, 4);
}

function parseQuickDispatchCard(content: string): SosCardData | null {
  const marker = "[SOS_QUICK_DISPATCH]";
  const markerIndex = content.indexOf(marker);
  if (markerIndex < 0) return null;

  const jsonStartIndex = content.indexOf("{", markerIndex);
  if (jsonStartIndex < 0) return null;

  const jsonPayload = content.slice(jsonStartIndex).trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonPayload) as Record<string, unknown>;
  } catch {
    return null;
  }

  const sosRequestId = Number(parsed.sosRequestId ?? parsed.id ?? parsed.sosId);
  if (!Number.isFinite(sosRequestId) || sosRequestId <= 0) {
    return null;
  }

  const summary = toCleanText(parsed.summary);
  const details = parseSummaryParts(summary ?? undefined);

  return {
    sosRequestId,
    status: toCleanText(parsed.status) ?? undefined,
    priority: toCleanText(parsed.priorityLevel) ?? undefined,
    sosType: toCleanText(parsed.sosType) ?? undefined,
    summary: summary ?? undefined,
    details,
    source: "quick-dispatch",
  };
}

function parseSosListCards(content: string): SosCardData[] {
  const normalized = content.toLowerCase();
  if (!normalized.includes("danh sách yêu cầu sos")) {
    return [];
  }

  const cards: SosCardData[] = [];
  const lines = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const idMatch = line.match(/\[id:\s*(\d+)\]/i);
    if (!idMatch?.[1]) continue;

    const sosRequestId = Number(idMatch[1]);
    if (!Number.isFinite(sosRequestId) || sosRequestId <= 0) continue;

    const typeMatch = line.match(/\]\s*([A-Za-z_]+)\s*trạng\s*thái/i);
    const statusMatch = line.match(/trạng\s*thái:\s*([^|]+)/i);
    const priorityMatch = line.match(/ưu\s*tiên:\s*([^|]+)/i);
    const summaryMatch = line.match(/nội\s*dung:\s*([^|]+)/i);
    const peopleMatch = line.match(/số\s*người:\s*([^|]+)/i);
    const childrenMatch = line.match(/trẻ\s*em:\s*([^|]+)/i);
    const eldersMatch = line.match(/người\s*già:\s*([^|]+)/i);
    const injuredMatch = line.match(/bị\s*thương:\s*([^|]+)/i);

    const details: Array<{ label: string; value: string }> = [];
    if (peopleMatch?.[1]) {
      details.push({ label: "Số người", value: peopleMatch[1].trim() });
    }
    if (childrenMatch?.[1]) {
      details.push({ label: "Trẻ em", value: childrenMatch[1].trim() });
    }
    if (eldersMatch?.[1]) {
      details.push({ label: "Người già", value: eldersMatch[1].trim() });
    }
    if (injuredMatch?.[1]) {
      details.push({ label: "Bị thương", value: injuredMatch[1].trim() });
    }

    cards.push({
      sosRequestId,
      status: statusMatch?.[1]?.trim(),
      priority: priorityMatch?.[1]?.trim(),
      sosType: typeMatch?.[1]?.trim(),
      summary: summaryMatch?.[1]?.trim(),
      details,
      source: "sos-list",
    });
  }

  return cards;
}

function parseSelectedSosCard(content: string): SosCardData | null {
  const normalized = content.toLowerCase();
  if (!normalized.includes("đã chọn yêu cầu sos")) {
    return null;
  }

  const idMatch = content.match(/sos\s*#\s*(\d+)/i);
  if (!idMatch?.[1]) return null;

  const sosRequestId = Number(idMatch[1]);
  if (!Number.isFinite(sosRequestId) || sosRequestId <= 0) {
    return null;
  }

  const typeMatch = content.match(/\(\s*([A-Za-z_]+)\s*\)/);
  const summaryMatch = content.match(/nội\s*dung:\s*([^|]+)/i);
  const peopleMatch = content.match(/số\s*người:\s*([^|]+)/i);
  const waterMatch = content.match(/nước:\s*([^|]+)/i);
  const foodMatch = content.match(/thực\s*phẩm:\s*([^|]+)/i);

  const details: Array<{ label: string; value: string }> = [];
  if (peopleMatch?.[1]) {
    details.push({ label: "Số người", value: peopleMatch[1].trim() });
  }
  if (waterMatch?.[1]) {
    details.push({ label: "Nước", value: waterMatch[1].trim() });
  }
  if (foodMatch?.[1]) {
    details.push({ label: "Thực phẩm", value: foodMatch[1].trim() });
  }

  return {
    sosRequestId,
    status: "Đã chọn hỗ trợ",
    sosType: typeMatch?.[1]?.trim(),
    summary: summaryMatch?.[1]?.trim(),
    details,
    source: "sos-selected",
  };
}

function parseSosCards(content: string): SosCardData[] {
  const quickDispatchCard = parseQuickDispatchCard(content);
  if (quickDispatchCard) {
    return [quickDispatchCard];
  }

  const listCards = parseSosListCards(content);
  if (listCards.length > 0) {
    return listCards;
  }

  const selectedCard = parseSelectedSosCard(content);
  if (selectedCard) {
    return [selectedCard];
  }

  return [];
}

function getStatusBadgeClass(status?: string) {
  const normalized = (status ?? "").trim().toLowerCase();

  if (
    normalized.includes("đang chờ") ||
    normalized.includes("pending") ||
    normalized.includes("waiting")
  ) {
    return "border-amber-300 bg-amber-100 text-amber-800";
  }

  if (
    normalized.includes("đã chọn") ||
    normalized.includes("active") ||
    normalized.includes("hỗ trợ")
  ) {
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }

  return "border-slate-300 bg-slate-100 text-slate-700";
}

function getPriorityBadgeClass(priority?: string) {
  const normalized = (priority ?? "").trim().toLowerCase();

  if (normalized.includes("critical") || normalized.includes("p1")) {
    return "border-rose-300 bg-rose-100 text-rose-800";
  }

  if (normalized.includes("high") || normalized.includes("p2")) {
    return "border-orange-300 bg-orange-100 text-orange-800";
  }

  if (normalized.includes("medium") || normalized.includes("p3")) {
    return "border-yellow-300 bg-yellow-100 text-yellow-800";
  }

  if (normalized.includes("low") || normalized.includes("p4")) {
    return "border-emerald-300 bg-emerald-100 text-emerald-800";
  }

  return "border-slate-300 bg-slate-100 text-slate-700";
}

function getStatusLabel(status?: string) {
  const normalized = (status ?? "").trim().toLowerCase();

  switch (normalized) {
    case "pending":
      return "Chờ xử lý";
    case "inprogress":
      return "Đang xử lý";
    case "assigned":
      return "Đã phân công";
    case "completed":
      return "Hoàn thành";
    case "cancelled":
      return "Đã hủy";
    default:
      return status ?? "";
  }
}

function getPriorityLabel(priority?: string) {
  const normalized = (priority ?? "").trim().toLowerCase();

  switch (normalized) {
    case "critical":
      return "Rất nghiêm trọng";
    case "high":
      return "Nghiêm trọng";
    case "medium":
      return "Trung bình";
    case "low":
      return "Thấp";
    default:
      return priority ?? "";
  }
}

function getSosTypeLabel(sosType?: string) {
  const normalized = (sosType ?? "").trim().toUpperCase();

  switch (normalized) {
    case "RESCUE":
      return "Cứu hộ";
    case "RELIEF":
      return "Cứu trợ";
    case "BOTH":
      return "Cứu hộ + cứu trợ";
    default:
      return sosType ?? "";
  }
}

function SosRequestCommerceCard({
  card,
  onOpenSosRequest,
}: {
  card: SosCardData;
  onOpenSosRequest?: (sosRequestId: number) => void;
}) {
  return (
    <div className="rounded-xl border border-[#FF5722]/35 bg-linear-to-br from-[#fff7ed] via-white to-[#fff1e8] p-3 shadow-[0_6px_18px_rgba(255,87,34,0.1)]">
      <div className="min-w-0">
        <p className="text-sm font-extrabold uppercase tracking-tight text-black">
          SOS #{card.sosRequestId}
        </p>
        <p className="mt-0.5 text-sm text-black/70 line-clamp-2">
          {card.summary || "Yêu cầu hỗ trợ từ hiện trường"}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {card.status ? (
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs font-semibold",
              getStatusBadgeClass(card.status),
            )}
          >
            {getStatusLabel(card.status)}
          </span>
        ) : null}

        {card.priority ? (
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-xs font-semibold",
              getPriorityBadgeClass(card.priority),
            )}
          >
            Ưu tiên {getPriorityLabel(card.priority)}
          </span>
        ) : null}

        {card.sosType ? (
          <span className="rounded-md border border-blue-300 bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
            {getSosTypeLabel(card.sosType)}
          </span>
        ) : null}
      </div>

      {/* Ẩn các details nhỏ lẻ để giao diện gọn hơn */}

      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 rounded-none bg-[#FF5722] text-white hover:bg-[#e64a19]"
          onClick={() => onOpenSosRequest?.(card.sosRequestId)}
          disabled={!onOpenSosRequest}
        >
          <ArrowSquareOut className="h-4 w-4" />
          Mở mission cụm SOS
        </Button>
      </div>
    </div>
  );
}

export default function ChatMessageThread({
  messages,
  isLoading,
  conversationPartnerLabel,
  onOpenSosRequest,
}: ChatMessageThreadProps) {
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const [previewImage, setPreviewImage] = useState<{
    alt: string;
    src: string;
  } | null>(null);

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
    <>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-3">
          {messages.map((message) => {
            const sosCards = parseSosCards(message.content);

            if (
              message.messageType === "SystemMessage" &&
              sosCards.length === 0
            ) {
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
            const isStructuredSosMessage = sosCards.length > 0;
            const senderLabel =
              message.senderName?.trim() ||
              (message.messageType === "SystemMessage" ? "Hệ thống" : null) ||
              (!isOwnMessage && !isAiMessage
                ? conversationPartnerLabel
                : null) ||
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
                    isStructuredSosMessage
                      ? "max-w-[90%] rounded-2xl border border-black/10 bg-white/90 p-2"
                      : "max-w-[75%] rounded-2xl px-3 py-2",
                    !isStructuredSosMessage &&
                      (isOwnMessage
                        ? "bg-primary text-primary-foreground"
                        : isAiMessage
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                          : "bg-muted text-foreground"),
                  )}
                >
                  {isStructuredSosMessage ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-black/65">
                        <Package className="h-3.5 w-3.5 text-[#FF5722]" />
                        Thẻ thông tin SOS
                      </div>
                      {sosCards.map((card) => (
                        <SosRequestCommerceCard
                          key={`${card.source}-${card.sosRequestId}`}
                          card={card}
                          onOpenSosRequest={onOpenSosRequest}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm wrap-break-word [&_a]:underline [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/15 [&_pre]:p-2 [&_ul]:list-disc [&_ul]:pl-5">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: (props) => (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          ),
                          img: (props) => {
                            const src =
                              typeof props.src === "string" ? props.src : "";
                            const alt = props.alt ?? "chat-image";

                            if (!src) {
                              return null;
                            }

                            return (
                              <button
                                type="button"
                                className="mt-1 block cursor-zoom-in rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                onClick={() => {
                                  setPreviewImage({ src, alt });
                                }}
                                aria-label={`Xem ảnh lớn hơn: ${alt}`}
                              >
                                <img
                                  {...props}
                                  src={src}
                                  alt={alt}
                                  className="max-h-64 w-auto max-w-full rounded-lg border border-black/10 object-cover"
                                  loading="lazy"
                                />
                              </button>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                  <p
                    className={cn(
                      "mt-1 text-[11px]",
                      isStructuredSosMessage
                        ? "text-black/55"
                        : isOwnMessage
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

      <Dialog
        open={previewImage !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewImage(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl border-none bg-transparent p-0 shadow-none">
          {previewImage ? (
            <div className="flex max-h-[90vh] flex-col gap-3">
              <div className="sr-only">
                <DialogTitle>Xem ảnh chat</DialogTitle>
                <DialogDescription>
                  Xem ảnh đính kèm trong cuộc trò chuyện ở kích thước lớn hơn.
                </DialogDescription>
              </div>
              <img
                src={previewImage.src}
                alt={previewImage.alt}
                className="max-h-[82vh] w-full rounded-xl object-contain"
              />
              <p className="text-center text-sm text-white/80">
                {previewImage.alt}
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
