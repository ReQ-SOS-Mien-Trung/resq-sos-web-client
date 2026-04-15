import { getNotificationTypeLabel } from "./config";
import { UserNotificationItem } from "./type";

const QUICK_DISPATCH_MARKER = "[SOS_QUICK_DISPATCH]";
const QUICK_DISPATCH_SUMMARY_REGEX = /"summary"\s*:\s*"([^"]+)"/i;
const MARKDOWN_IMAGE_ONLY_REGEX = /^!\[[^\]]*\]\([^\)]+\)$/;

function normalizeType(type: unknown): string {
  return String(type ?? "general")
    .trim()
    .toLowerCase();
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function compactText(value: string, maxLength: number): string {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function extractQuickDispatchSummary(body: string): string | null {
  const markerIndex = body.indexOf(QUICK_DISPATCH_MARKER);
  if (markerIndex < 0) {
    return null;
  }

  const markerPayload = body.slice(markerIndex + QUICK_DISPATCH_MARKER.length);
  const payload = markerPayload.trim();
  if (!payload) {
    return "Điều phối nhanh SOS khẩn cấp.";
  }

  const jsonStart = payload.indexOf("{");
  if (jsonStart >= 0) {
    const jsonPayload = payload.slice(jsonStart).trim();

    try {
      const parsed = JSON.parse(jsonPayload) as Record<string, unknown>;
      const summary =
        typeof parsed.summary === "string" ? parsed.summary.trim() : "";
      if (summary) {
        const parts = summary
          .replace(/^\[CỨU HỘ\]\s*\|\s*/i, "")
          .replace(/^\[CUU HO\]\s*\|\s*/i, "")
          .split("|")
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join(" | ");

        return compactText(`Điều phối SOS: ${parts || summary}`, 110);
      }
    } catch {
      // Ignore malformed JSON and fallback to regex extraction.
    }

    const summaryMatch = jsonPayload.match(QUICK_DISPATCH_SUMMARY_REGEX)?.[1];
    if (summaryMatch) {
      return compactText(`Điều phối SOS: ${summaryMatch}`, 110);
    }
  }

  return "Điều phối nhanh SOS khẩn cấp.";
}

function formatChatPreview(body: string): string {
  const cleanBody = normalizeWhitespace(body);
  if (!cleanBody) {
    return "Bạn có tin nhắn mới.";
  }

  const quickDispatchSummary = extractQuickDispatchSummary(cleanBody);
  if (quickDispatchSummary) {
    return quickDispatchSummary;
  }

  if (MARKDOWN_IMAGE_ONLY_REGEX.test(cleanBody)) {
    return "Đã gửi một hình ảnh.";
  }

  return compactText(cleanBody, 110);
}

function formatAssemblyCheckoutPreview(body: string): string {
  const cleanBody = normalizeWhitespace(body);
  if (!cleanBody) {
    return "Có thành viên vừa rời điểm tập kết.";
  }

  const normalizedSentence = cleanBody
    .replace(/\bcheck-?out\b/gi, "rời")
    .replace(/sự kiện tập trung/gi, "điểm tập kết");

  return compactText(normalizedSentence, 110);
}

function formatAssemblyCheckInPreview(body: string): string {
  const cleanBody = normalizeWhitespace(body);
  if (!cleanBody) {
    return "Có thành viên đã đến điểm tập kết.";
  }

  const normalizedSentence = cleanBody
    .replace(/\bcheck-?in\b/gi, "đến")
    .replace(/sự kiện tập trung/gi, "điểm tập kết");

  return compactText(normalizedSentence, 110);
}

function formatNotificationBody(type: string, rawBody: string): string {
  const normalizedType = normalizeType(type);

  if (normalizedType === "chat_message") {
    return formatChatPreview(rawBody);
  }

  if (normalizedType === "assembly_checkout") {
    return formatAssemblyCheckoutPreview(rawBody);
  }

  if (normalizedType === "assembly_checkin") {
    return formatAssemblyCheckInPreview(rawBody);
  }

  return compactText(rawBody, 110);
}

function pickFirstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}

export function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeNotificationItem(
  raw: unknown,
): UserNotificationItem | null {
  const record = (raw ?? {}) as Partial<UserNotificationItem> & {
    id?: number;
    notificationId?: number;
    message?: string;
    content?: string;
    readAt?: string | null;
  };

  const userNotificationId = toFiniteNumber(
    record.userNotificationId ?? record.id ?? record.notificationId,
    0,
  );

  if (!userNotificationId) {
    return null;
  }

  const type = normalizeType(record.type);
  const typeLabel = getNotificationTypeLabel(type);
  const rawTitle = pickFirstString(record.title);
  const rawBody = pickFirstString(record.body, record.content, record.message);

  return {
    userNotificationId,
    title: compactText(typeLabel || rawTitle || "Thông báo", 64),
    type,
    body: formatNotificationBody(type, rawBody),
    isRead:
      typeof record.isRead === "boolean"
        ? record.isRead
        : Boolean(record.readAt),
    createdAt: String(record.createdAt ?? new Date().toISOString()),
    data: record.data && typeof record.data === "object" ? record.data : null,
  };
}
