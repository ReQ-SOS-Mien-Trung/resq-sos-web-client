"use client";

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
} from "@microsoft/signalr";
import {
  applySignalRConnectionDefaults,
  SIGNALR_CLIENT_LOG_LEVEL,
} from "@/lib/signalr";
import { ChartInvalidation } from "@/services/chart_invalidation/type";
import { useAuthStore } from "@/stores/auth.store";
import { DASHBOARD_REALTIME_EVENTS } from "./type";

type ChartInvalidationHandler = (payload: ChartInvalidation) => void;

const STOP_DEBOUNCE_MS = 1200;

class DashboardRealtimeClient {
  private connection: HubConnection | null = null;
  private connectionRetainers = 0;
  private isReceiveEventBound = false;
  private pendingStopTimer: ReturnType<typeof setTimeout> | null = null;
  private startPromise: Promise<void> | null = null;
  private chartInvalidationListeners = new Set<ChartInvalidationHandler>();

  private clearPendingStop(): void {
    if (!this.pendingStopTimer) return;
    clearTimeout(this.pendingStopTimer);
    this.pendingStopTimer = null;
  }

  private scheduleStop(): void {
    this.clearPendingStop();

    this.pendingStopTimer = setTimeout(() => {
      this.pendingStopTimer = null;

      if (
        this.connectionRetainers > 0 ||
        this.chartInvalidationListeners.size > 0
      ) {
        return;
      }

      void this.stop().catch(() => null);
    }, STOP_DEBOUNCE_MS);
  }

  private async waitForDisconnected(
    connection: HubConnection,
    timeoutMs = 2500,
  ): Promise<void> {
    const startedAt = Date.now();

    while (connection.state === HubConnectionState.Disconnecting) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error("Dashboard realtime connection is still disconnecting.");
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  private async waitForConnected(
    connection: HubConnection,
    timeoutMs = 8000,
  ): Promise<void> {
    const startedAt = Date.now();

    while (
      connection.state === HubConnectionState.Connecting ||
      connection.state === HubConnectionState.Reconnecting
    ) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error("Dashboard realtime connection did not connect in time.");
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }
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

  private buildConnection(): HubConnection {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "";

    if (!baseUrl) {
      throw new Error("Missing NEXT_PUBLIC_BASE_URL for dashboard realtime.");
    }

    const connection = applySignalRConnectionDefaults(
      new HubConnectionBuilder()
        .withUrl(`${baseUrl}/hubs/dashboard`, {
          accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
          withCredentials: false,
          transport:
            HttpTransportType.WebSockets |
            HttpTransportType.ServerSentEvents |
            HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
        .configureLogging(SIGNALR_CLIENT_LOG_LEVEL)
        .build(),
    );

    return connection;
  }

  private getOrCreateConnection(): HubConnection {
    if (!this.connection) {
      this.connection = this.buildConnection();
    }

    if (!this.isReceiveEventBound) {
      this.connection.on(
        DASHBOARD_REALTIME_EVENTS.ReceiveChartInvalidation,
        (payload: ChartInvalidation) => {
          this.chartInvalidationListeners.forEach((listener) =>
            listener(payload),
          );
        },
      );
      this.isReceiveEventBound = true;
    }

    return this.connection;
  }

  async start(): Promise<void> {
    this.clearPendingStop();

    if (this.startPromise) {
      await this.startPromise;
      return;
    }

    const connection = this.getOrCreateConnection();

    if (connection.state === HubConnectionState.Connected) return;

    if (
      connection.state === HubConnectionState.Connecting ||
      connection.state === HubConnectionState.Reconnecting
    ) {
      await this.waitForConnected(connection);
      return;
    }

    const startTask = async () => {
      if (connection.state === HubConnectionState.Disconnecting) {
        await this.waitForDisconnected(connection);
      }

      if (connection.state !== HubConnectionState.Disconnected) return;

      await connection.start();
    };

    this.startPromise = startTask()
      .catch((error) => {
        if (this.isNegotiationAbortError(error)) return;
        throw error;
      })
      .finally(() => {
        this.startPromise = null;
      });

    await this.startPromise;
  }

  async stop(): Promise<void> {
    this.clearPendingStop();

    if (!this.connection) return;

    if (this.startPromise) {
      await this.startPromise.catch(() => null);
    }

    if (this.connection.state === HubConnectionState.Disconnected) return;

    await this.connection.stop();
  }

  retainConnection(): void {
    this.connectionRetainers += 1;
    this.clearPendingStop();
  }

  async releaseConnection(): Promise<void> {
    this.connectionRetainers = Math.max(0, this.connectionRetainers - 1);

    if (this.connectionRetainers > 0) return;

    this.scheduleStop();
  }

  onChartInvalidation(handler: ChartInvalidationHandler): () => void {
    this.chartInvalidationListeners.add(handler);
    return () => {
      this.chartInvalidationListeners.delete(handler);
      this.scheduleStop();
    };
  }
}

export const dashboardRealtimeClient = new DashboardRealtimeClient();
