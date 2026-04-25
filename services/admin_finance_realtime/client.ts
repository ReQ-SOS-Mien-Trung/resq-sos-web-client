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
import { useAuthStore } from "@/stores/auth.store";
import {
  ADMIN_FINANCE_REALTIME_EVENTS,
  ADMIN_FINANCE_REALTIME_METHODS,
  FundingRequestRealtimeUpdate,
} from "./type";

type FundingRequestUpdateHandler = (
  payload: FundingRequestRealtimeUpdate,
) => void;

const STOP_DEBOUNCE_MS = 1200;

class AdminFinanceRealtimeClient {
  private connection: HubConnection | null = null;
  private connectionRetainers = 0;
  private detailSubscriptions = new Map<number, number>();
  private fundingRequestListSubscribers = 0;
  private isReceiveEventBound = false;
  private pendingStopTimer: ReturnType<typeof setTimeout> | null = null;
  private startPromise: Promise<void> | null = null;
  private updateListeners = new Set<FundingRequestUpdateHandler>();

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
        this.fundingRequestListSubscribers > 0 ||
        this.detailSubscriptions.size > 0
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
        throw new Error("Admin finance realtime connection is still disconnecting.");
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
        throw new Error(
          "Admin finance realtime connection did not connect in time.",
        );
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
      throw new Error("Missing NEXT_PUBLIC_BASE_URL for admin finance realtime.");
    }

    const connection = applySignalRConnectionDefaults(
      new HubConnectionBuilder()
        .withUrl(`${baseUrl}/hubs/admin-finance`, {
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

    connection.onreconnected(() => {
      void this.rejoinSubscriptions();
    });

    return connection;
  }

  private getOrCreateConnection(): HubConnection {
    if (!this.connection) {
      this.connection = this.buildConnection();
    }

    if (!this.isReceiveEventBound) {
      this.connection.on(
        ADMIN_FINANCE_REALTIME_EVENTS.ReceiveFundingRequestUpdate,
        (payload: FundingRequestRealtimeUpdate) => {
          this.updateListeners.forEach((listener) => listener(payload));
        },
      );
      this.isReceiveEventBound = true;
    }

    return this.connection;
  }

  private async invokeWhenConnected(
    methodName: string,
    ...args: unknown[]
  ): Promise<void> {
    const connection = this.getOrCreateConnection();

    if (connection.state !== HubConnectionState.Connected) {
      await this.start();
    }

    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection.invoke(methodName, ...args);
  }

  private async rejoinSubscriptions(): Promise<void> {
    const connection = this.getOrCreateConnection();

    if (connection.state !== HubConnectionState.Connected) return;

    const tasks: Promise<unknown>[] = [];

    if (this.fundingRequestListSubscribers > 0) {
      tasks.push(
        connection.invoke(
          ADMIN_FINANCE_REALTIME_METHODS.SubscribeFundingRequests,
        ),
      );
    }

    this.detailSubscriptions.forEach((subscriberCount, requestId) => {
      if (subscriberCount > 0) {
        tasks.push(
          connection.invoke(
            ADMIN_FINANCE_REALTIME_METHODS.SubscribeFundingRequest,
            requestId,
          ),
        );
      }
    });

    await Promise.all(tasks.map((task) => task.catch(() => null)));
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

  onFundingRequestUpdate(
    handler: FundingRequestUpdateHandler,
  ): () => void {
    this.updateListeners.add(handler);
    return () => {
      this.updateListeners.delete(handler);
      this.scheduleStop();
    };
  }

  async subscribeFundingRequests(): Promise<void> {
    this.fundingRequestListSubscribers += 1;

    if (this.fundingRequestListSubscribers > 1) return;

    await this.invokeWhenConnected(
      ADMIN_FINANCE_REALTIME_METHODS.SubscribeFundingRequests,
    );
  }

  async unsubscribeFundingRequests(): Promise<void> {
    this.fundingRequestListSubscribers = Math.max(
      0,
      this.fundingRequestListSubscribers - 1,
    );

    if (this.fundingRequestListSubscribers > 0) return;

    await this.invokeWhenConnected(
      ADMIN_FINANCE_REALTIME_METHODS.UnsubscribeFundingRequests,
    ).catch(() => null);
    this.scheduleStop();
  }

  async subscribeFundingRequest(requestId: number): Promise<void> {
    const current = this.detailSubscriptions.get(requestId) ?? 0;
    this.detailSubscriptions.set(requestId, current + 1);

    if (current > 0) return;

    await this.invokeWhenConnected(
      ADMIN_FINANCE_REALTIME_METHODS.SubscribeFundingRequest,
      requestId,
    );
  }

  async unsubscribeFundingRequest(requestId: number): Promise<void> {
    const current = this.detailSubscriptions.get(requestId) ?? 0;
    const next = Math.max(0, current - 1);

    if (next > 0) {
      this.detailSubscriptions.set(requestId, next);
      return;
    }

    this.detailSubscriptions.delete(requestId);
    await this.invokeWhenConnected(
      ADMIN_FINANCE_REALTIME_METHODS.UnsubscribeFundingRequest,
      requestId,
    ).catch(() => null);
    this.scheduleStop();
  }
}

export const adminFinanceRealtimeClient = new AdminFinanceRealtimeClient();
