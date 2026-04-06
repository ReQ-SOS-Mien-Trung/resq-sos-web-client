"use client";

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { useAuthStore } from "@/stores/auth.store";
import { NOTIFICATION_HUB_CONFIG } from "./config";
import {
  BroadcastAlertRealtimePayload,
  NotificationRealtimePayload,
} from "./type";
import {
  getBackendCircuitBlockedUntil,
  isBackendCircuitOpen,
  isBackendConnectivityError,
  markBackendConnectionSuccess,
  openBackendCircuit,
} from "@/lib/backend-circuit";

type ReceiveNotificationHandler = (
  payload: NotificationRealtimePayload,
) => void;

type ReceiveBroadcastAlertHandler = (
  payload: BroadcastAlertRealtimePayload,
) => void;

const STOP_DEBOUNCE_MS = 1200;
const START_RETRY_MIN_DELAY_MS = 1500;

export class NotificationRealtimeClient {
  private connection: HubConnection | null = null;
  private listeners = new Set<ReceiveNotificationHandler>();
  private broadcastListeners = new Set<ReceiveBroadcastAlertHandler>();
  private isReceiveEventBound = false;
  private isLifecycleEventBound = false;
  private pendingStopTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private startPromise: Promise<void> | null = null;

  private clearPendingStop(): void {
    if (!this.pendingStopTimer) {
      return;
    }

    clearTimeout(this.pendingStopTimer);
    this.pendingStopTimer = null;
  }

  private clearPendingRetry(): void {
    if (!this.pendingRetryTimer) {
      return;
    }

    clearTimeout(this.pendingRetryTimer);
    this.pendingRetryTimer = null;
  }

  private hasActiveSubscribers(): boolean {
    return this.listeners.size > 0 || this.broadcastListeners.size > 0;
  }

  private scheduleRetryStart(): void {
    if (!this.hasActiveSubscribers()) {
      this.clearPendingRetry();
      return;
    }

    if (this.pendingRetryTimer) {
      return;
    }

    const blockedUntil = getBackendCircuitBlockedUntil();
    const delay = blockedUntil
      ? Math.max(START_RETRY_MIN_DELAY_MS, blockedUntil - Date.now())
      : START_RETRY_MIN_DELAY_MS;

    this.pendingRetryTimer = setTimeout(() => {
      this.pendingRetryTimer = null;

      if (!this.hasActiveSubscribers()) {
        return;
      }

      void this.start().catch((error) => {
        if (
          this.isNegotiationAbortError(error) ||
          isBackendConnectivityError(error)
        ) {
          return;
        }

        console.error("Failed to reconnect notification hub:", error);
      });
    }, delay);
  }

  private scheduleStop(): void {
    this.clearPendingStop();
    this.clearPendingRetry();

    this.pendingStopTimer = setTimeout(() => {
      this.pendingStopTimer = null;

      if (this.hasActiveSubscribers()) {
        return;
      }

      void this.stop().catch(() => null);
    }, STOP_DEBOUNCE_MS);
  }

  private isNegotiationAbortError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message : String(error ?? "");
    const normalized = message.toLowerCase();

    return (
      normalized.includes("stopped during negotiation") ||
      normalized.includes("aborterror")
    );
  }

  private async waitForDisconnected(
    connection: HubConnection,
    timeoutMs = 2500,
  ): Promise<void> {
    const startedAt = Date.now();

    while (connection.state === HubConnectionState.Disconnecting) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error("Notification connection is still disconnecting.");
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  private buildConnection(): HubConnection {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "";

    if (!baseUrl) {
      throw new Error("Missing NEXT_PUBLIC_BASE_URL for notifications.");
    }

    return new HubConnectionBuilder()
      .withUrl(`${baseUrl}${NOTIFICATION_HUB_CONFIG.path}`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
        withCredentials: false,
        transport:
          HttpTransportType.WebSockets |
          HttpTransportType.ServerSentEvents |
          HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([...NOTIFICATION_HUB_CONFIG.reconnectDelaysMs])
      .configureLogging(LogLevel.Warning)
      .build();
  }

  private getOrCreateConnection(): HubConnection {
    if (!this.connection) {
      this.connection = this.buildConnection();
    }

    if (!this.isLifecycleEventBound) {
      this.connection.onreconnected(() => {
        markBackendConnectionSuccess();
      });

      this.connection.onclose((error) => {
        if (error && isBackendConnectivityError(error)) {
          openBackendCircuit(error);
        }

        if (this.hasActiveSubscribers()) {
          this.scheduleRetryStart();
        }
      });

      this.isLifecycleEventBound = true;
    }

    if (!this.isReceiveEventBound) {
      this.connection.on(
        NOTIFICATION_HUB_CONFIG.events.receive,
        (payload: NotificationRealtimePayload) => {
          this.listeners.forEach((listener) => listener(payload));
        },
      );
      this.connection.on(
        NOTIFICATION_HUB_CONFIG.events.receiveBroadcast,
        (payload: BroadcastAlertRealtimePayload) => {
          this.broadcastListeners.forEach((listener) => listener(payload));
        },
      );
      this.isReceiveEventBound = true;
    }

    return this.connection;
  }

  async start(): Promise<void> {
    this.clearPendingStop();
    this.clearPendingRetry();

    if (!this.hasActiveSubscribers()) {
      return;
    }

    if (this.startPromise) {
      await this.startPromise;
      return;
    }

    const connection = this.getOrCreateConnection();

    if (
      connection.state === HubConnectionState.Connected ||
      connection.state === HubConnectionState.Reconnecting
    ) {
      return;
    }

    if (connection.state === HubConnectionState.Connecting) {
      return;
    }

    if (isBackendCircuitOpen()) {
      this.scheduleRetryStart();
      return;
    }

    const startTask = async () => {
      if (connection.state === HubConnectionState.Disconnecting) {
        await this.waitForDisconnected(connection);
      }

      if (this.listeners.size === 0 && this.broadcastListeners.size === 0) {
        return;
      }

      if (connection.state !== HubConnectionState.Disconnected) {
        return;
      }

      await connection.start();
      markBackendConnectionSuccess();
    };

    this.startPromise = startTask()
      .catch((error) => {
        if (this.isNegotiationAbortError(error)) {
          return;
        }

        if (isBackendConnectivityError(error)) {
          openBackendCircuit(error);
          this.scheduleRetryStart();
          return;
        }

        throw error;
      })
      .finally(() => {
        this.startPromise = null;

        if (
          this.hasActiveSubscribers() &&
          this.connection?.state === HubConnectionState.Disconnected
        ) {
          this.scheduleRetryStart();
        }
      });

    await this.startPromise;
  }

  async stop(): Promise<void> {
    this.clearPendingStop();
    this.clearPendingRetry();

    if (!this.connection) {
      return;
    }

    if (this.hasActiveSubscribers()) {
      return;
    }

    if (this.startPromise) {
      await this.startPromise.catch(() => null);
      if (this.hasActiveSubscribers()) {
        return;
      }
    }

    if (this.connection.state === HubConnectionState.Disconnected) {
      return;
    }

    await this.connection.stop();

    if (this.hasActiveSubscribers()) {
      await this.start();
    }
  }

  subscribe(handler: ReceiveNotificationHandler): () => void {
    this.listeners.add(handler);
    this.clearPendingStop();
    this.clearPendingRetry();

    void this.start().catch((error) => {
      if (
        this.isNegotiationAbortError(error) ||
        isBackendConnectivityError(error)
      ) {
        return;
      }

      console.error("Failed to connect notification hub:", error);
    });

    return () => {
      this.listeners.delete(handler);

      if (!this.hasActiveSubscribers()) {
        this.scheduleStop();
      }
    };
  }

  subscribeBroadcast(handler: ReceiveBroadcastAlertHandler): () => void {
    this.broadcastListeners.add(handler);
    this.clearPendingStop();
    this.clearPendingRetry();

    void this.start().catch((error) => {
      if (
        this.isNegotiationAbortError(error) ||
        isBackendConnectivityError(error)
      ) {
        return;
      }

      console.error("Failed to connect notification hub:", error);
    });

    return () => {
      this.broadcastListeners.delete(handler);

      if (!this.hasActiveSubscribers()) {
        this.scheduleStop();
      }
    };
  }
}

export const notificationRealtimeClient = new NotificationRealtimeClient();
