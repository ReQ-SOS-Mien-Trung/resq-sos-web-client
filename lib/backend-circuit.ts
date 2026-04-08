import axios from "axios";
import { useBackendConnectionStore } from "@/stores/backend-connection.store";

export const BACKEND_CIRCUIT_OPEN_ERROR_CODE = "ERR_BACKEND_CIRCUIT_OPEN";

const CONNECTIVITY_ERROR_CODES = new Set([
  "ERR_NETWORK",
  "ECONNABORTED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "ECONNREFUSED",
  BACKEND_CIRCUIT_OPEN_ERROR_CODE,
]);
const NON_CONNECTIVITY_ERROR_CODES = new Set(["ERR_CANCELED"]);
const CONNECTIVITY_HTTP_STATUS_CODES = new Set([502, 503, 504]);
const CONNECTIVITY_MESSAGE_PATTERNS = [
  "failed to fetch",
  "network error",
  "networkerror",
  "failed to complete negotiation",
  "timeout",
  "timed out",
  "connection disconnected with error",
  "websocket failed",
  "unable to connect",
] as const;
const NON_CONNECTIVITY_MESSAGE_PATTERNS = [
  "stopped during negotiation",
  "aborterror",
] as const;

const BASE_BACKOFF_MS = 10_000;
const MAX_BACKOFF_MS = 90_000;

let backendConsecutiveFailures = 0;
let backendCircuitOpenUntil = 0;

function getConnectivityBackoffMs(consecutiveFailures: number): number {
  const exponent = Math.max(0, consecutiveFailures - 1);
  const delay = BASE_BACKOFF_MS * 2 ** exponent;
  return Math.min(MAX_BACKOFF_MS, delay);
}

function getErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return String(error ?? "");
}

function isMessageMatch(message: string, patterns: readonly string[]): boolean {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;

  return patterns.some((pattern) => normalized.includes(pattern));
}

function extractBackendConnectivityMessage(error: unknown): string | null {
  const fallbackMessage = getErrorMessage(error).trim();

  if (!axios.isAxiosError(error)) {
    return fallbackMessage || null;
  }

  const responseData =
    error.response?.data && typeof error.response.data === "object"
      ? (error.response.data as { message?: string; title?: string })
      : undefined;

  const resolvedMessage =
    responseData?.message || responseData?.title || fallbackMessage;

  return resolvedMessage && resolvedMessage !== "[object Object]"
    ? resolvedMessage
    : null;
}

function isConnectivityCode(code: string | null): boolean {
  if (!code) return false;

  if (NON_CONNECTIVITY_ERROR_CODES.has(code)) {
    return false;
  }

  return CONNECTIVITY_ERROR_CODES.has(code);
}

export function isBackendConnectivityError(error: unknown): boolean {
  const errorCode = getErrorCode(error);
  const errorMessage = getErrorMessage(error);

  if (isConnectivityCode(errorCode)) {
    return true;
  }

  if (isMessageMatch(errorMessage, NON_CONNECTIVITY_MESSAGE_PATTERNS)) {
    return false;
  }

  if (axios.isAxiosError(error)) {
    if (error.response) {
      return CONNECTIVITY_HTTP_STATUS_CODES.has(error.response.status);
    }

    if (error.code && NON_CONNECTIVITY_ERROR_CODES.has(error.code)) {
      return false;
    }

    if (error.code && CONNECTIVITY_ERROR_CODES.has(error.code)) {
      return true;
    }

    return isMessageMatch(errorMessage, CONNECTIVITY_MESSAGE_PATTERNS);
  }

  return isMessageMatch(errorMessage, CONNECTIVITY_MESSAGE_PATTERNS);
}

export function isBackendCircuitOpen(now = Date.now()): boolean {
  return backendCircuitOpenUntil > now;
}

export function getBackendCircuitBlockedUntil(now = Date.now()): number | null {
  return backendCircuitOpenUntil > now ? backendCircuitOpenUntil : null;
}

export function openBackendCircuit(error: unknown): void {
  if (!isBackendConnectivityError(error)) return;

  const now = Date.now();
  if (backendCircuitOpenUntil <= now) {
    backendConsecutiveFailures += 1;
    backendCircuitOpenUntil =
      now + getConnectivityBackoffMs(backendConsecutiveFailures);
  }

  useBackendConnectionStore.getState().markOffline({
    blockedUntil: backendCircuitOpenUntil,
    message: extractBackendConnectivityMessage(error),
    consecutiveFailures: backendConsecutiveFailures,
  });
}

export function markBackendConnectionSuccess(): void {
  const currentState = useBackendConnectionStore.getState();
  const hasOpenCircuit =
    backendConsecutiveFailures > 0 || backendCircuitOpenUntil > 0;

  if (!hasOpenCircuit && currentState.status === "online") {
    return;
  }

  backendConsecutiveFailures = 0;
  backendCircuitOpenUntil = 0;
  currentState.markOnline();
}

export function releaseBackendCircuitForRetry(): void {
  backendConsecutiveFailures = 0;
  backendCircuitOpenUntil = 0;
  useBackendConnectionStore.getState().markOnline();
}
