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
import { NotificationRealtimePayload } from "./type";

type ReceiveNotificationHandler = (
  payload: NotificationRealtimePayload,
) => void;

const STOP_DEBOUNCE_MS = 1200;

export class NotificationRealtimeClient {
  private connection: HubConnection | null = null;
  private listeners = new Set<ReceiveNotificationHandler>();
  private isReceiveEventBound = false;
  private pendingStopTimer: ReturnType<typeof setTimeout> | null = null;
  private startPromise: Promise<void> | null = null;

  private clearPendingStop(): void {
    if (!this.pendingStopTimer) {
      return;
    }

    clearTimeout(this.pendingStopTimer);
    this.pendingStopTimer = null;
  }

  private scheduleStop(): void {
    this.clearPendingStop();

    this.pendingStopTimer = setTimeout(() => {
      this.pendingStopTimer = null;

      if (this.listeners.size > 0) {
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

    if (!this.isReceiveEventBound) {
      this.connection.on(
        NOTIFICATION_HUB_CONFIG.events.receive,
        (payload: NotificationRealtimePayload) => {
          this.listeners.forEach((listener) => listener(payload));
        },
      );
      this.isReceiveEventBound = true;
    }

    return this.connection;
  }

  async start(): Promise<void> {
    this.clearPendingStop();

    if (this.listeners.size === 0) {
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

    const startTask = async () => {
      if (connection.state === HubConnectionState.Disconnecting) {
        await this.waitForDisconnected(connection);
      }

      if (this.listeners.size === 0) {
        return;
      }

      if (connection.state !== HubConnectionState.Disconnected) {
        return;
      }

      await connection.start();
    };

    this.startPromise = startTask()
      .catch((error) => {
        if (this.isNegotiationAbortError(error)) {
          return;
        }

        throw error;
      })
      .finally(() => {
        this.startPromise = null;

        if (
          this.listeners.size > 0 &&
          this.connection?.state === HubConnectionState.Disconnected
        ) {
          void this.start().catch(() => null);
        }
      });

    await this.startPromise;
  }

  async stop(): Promise<void> {
    this.clearPendingStop();

    if (!this.connection) {
      return;
    }

    if (this.listeners.size > 0) {
      return;
    }

    if (this.startPromise) {
      await this.startPromise.catch(() => null);
      if (this.listeners.size > 0) {
        return;
      }
    }

    if (this.connection.state === HubConnectionState.Disconnected) {
      return;
    }

    await this.connection.stop();

    if (this.listeners.size > 0) {
      await this.start();
    }
  }

  subscribe(handler: ReceiveNotificationHandler): () => void {
    this.listeners.add(handler);
    this.clearPendingStop();

    void this.start().catch((error) => {
      console.error("Failed to connect notification hub:", error);
    });

    return () => {
      this.listeners.delete(handler);

      if (this.listeners.size === 0) {
        this.scheduleStop();
      }
    };
  }
}

export const notificationRealtimeClient = new NotificationRealtimeClient();
