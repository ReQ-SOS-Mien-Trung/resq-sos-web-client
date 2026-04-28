"use client";

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
} from "@microsoft/signalr";
import { useAuthStore } from "@/stores/auth.store";
import {
  applySignalRConnectionDefaults,
  SIGNALR_CLIENT_LOG_LEVEL,
} from "@/lib/signalr";
import {
  SOS_REQUEST_REALTIME_EVENTS,
  SOS_REQUEST_REALTIME_METHODS,
  SosRequestRealtimeConnectionState,
  ReceiveSosRequestUpdatePayload,
} from "./type";

type ConnectionStateListener = (
  state: SosRequestRealtimeConnectionState,
) => void;

type SosRequestUpdateListener = (
  payload: ReceiveSosRequestUpdatePayload,
) => void;

const START_RETRY_DELAY_MS = 2000;

export class SosRequestRealtimeClient {
  private connection: HubConnection | null = null;
  private startPromise: Promise<void> | null = null;
  private isLifecycleBound = false;
  private isReceiveEventsBound = false;
  private pendingRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldMaintainConnection = false;
  private connectionRetainers = 0;
  private connectionState: SosRequestRealtimeConnectionState = "disconnected";
  private stateListeners = new Set<ConnectionStateListener>();
  private reconnectListeners = new Set<() => void>();
  private sosRequestUpdateListeners = new Set<SosRequestUpdateListener>();
  
  private joinedRequests = new Map<number, number>();
  private joinedClusters = new Map<number, number>();
  private joinedUnclustered = 0;

  private notifyConnectionState(): void {
    this.stateListeners.forEach((listener) => listener(this.connectionState));
  }

  private setConnectionState(
    nextState: SosRequestRealtimeConnectionState,
  ): void {
    if (this.connectionState === nextState) {
      return;
    }

    this.connectionState = nextState;
    this.notifyConnectionState();
  }

  private clearPendingRetry(): void {
    if (!this.pendingRetryTimer) {
      return;
    }

    clearTimeout(this.pendingRetryTimer);
    this.pendingRetryTimer = null;
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

  private scheduleRetryStart(): void {
    if (!this.shouldMaintainConnection) {
      this.clearPendingRetry();
      return;
    }

    if (this.pendingRetryTimer) {
      return;
    }

    this.setConnectionState("reconnecting");

    this.pendingRetryTimer = setTimeout(() => {
      this.pendingRetryTimer = null;

      if (!this.shouldMaintainConnection) {
        return;
      }

      void this.start().catch((error) => {
        if (this.isNegotiationAbortError(error)) {
          return;
        }

        console.error("Failed to reconnect SOS request hub:", error);
      });
    }, START_RETRY_DELAY_MS);
  }

  private async waitForDisconnected(
    connection: HubConnection,
    timeoutMs = 2500,
  ): Promise<void> {
    const startedAt = Date.now();

    while (connection.state === HubConnectionState.Disconnecting) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error("SOS request hub connection is still disconnecting.");
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  private isNotConnectedInvokeError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /not in the 'Connected' State/i.test(message);
  }

  private buildConnection(): HubConnection {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "";

    if (!baseUrl) {
      throw new Error("Missing NEXT_PUBLIC_BASE_URL for SOS request realtime.");
    }

    return applySignalRConnectionDefaults(
      new HubConnectionBuilder()
        .withUrl(`${baseUrl}/hubs/sos-requests`, {
          accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
          withCredentials: false,
          transport:
            HttpTransportType.WebSockets |
            HttpTransportType.ServerSentEvents |
            HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect()
        .configureLogging(SIGNALR_CLIENT_LOG_LEVEL)
        .build(),
    );
  }

  private getOrCreateConnection(): HubConnection {
    if (!this.connection) {
      this.connection = this.buildConnection();
    }

    if (!this.isLifecycleBound) {
      this.connection.onreconnecting(() => {
        this.setConnectionState("reconnecting");
      });

      this.connection.onreconnected(() => {
        this.setConnectionState("connected");
        void this.rejoinSubscriptions().finally(() => {
          this.reconnectListeners.forEach((listener) => {
            listener();
          });
        });
      });

      this.connection.onclose(() => {
        this.setConnectionState("disconnected");

        if (this.shouldMaintainConnection) {
          this.scheduleRetryStart();
        }
      });

      this.isLifecycleBound = true;
    }

    if (!this.isReceiveEventsBound) {
      this.connection.on(
        SOS_REQUEST_REALTIME_EVENTS.ReceiveSosRequestUpdate,
        (payload: ReceiveSosRequestUpdatePayload) => {
          this.sosRequestUpdateListeners.forEach((listener) =>
            listener(payload),
          );
        },
      );

      this.isReceiveEventsBound = true;
    }

    return this.connection;
  }

  private async rejoinSubscriptions(): Promise<void> {
    const connection = this.getOrCreateConnection();

    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await Promise.all([
      ...Array.from(this.joinedRequests.keys()).map((id) =>
        connection
          .invoke(SOS_REQUEST_REALTIME_METHODS.SubscribeSosRequest, id)
          .catch(() => null),
      ),
      ...Array.from(this.joinedClusters.keys()).map((clusterId) =>
        connection
          .invoke(SOS_REQUEST_REALTIME_METHODS.SubscribeSosCluster, clusterId)
          .catch(() => null),
      ),
      ...(this.joinedUnclustered > 0
        ? [
            connection
              .invoke(SOS_REQUEST_REALTIME_METHODS.SubscribeUnclusteredSosRequests)
              .catch(() => null),
          ]
        : []),
    ]);
  }

  private async invokeWithReconnectRetry(
    method: string,
    id?: number,
  ): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await this.start();
      const connection = this.getOrCreateConnection();

      try {
        if (id !== undefined) {
          await connection.invoke(method, id);
        } else {
          await connection.invoke(method);
        }
        return;
      } catch (error) {
        if (attempt === 0 && this.isNotConnectedInvokeError(error)) {
          continue;
        }

        throw error;
      }
    }
  }

  getConnectionState(): SosRequestRealtimeConnectionState {
    return this.connectionState;
  }

  retainConnection(): void {
    this.connectionRetainers += 1;
    this.shouldMaintainConnection = this.connectionRetainers > 0;
  }

  async releaseConnection(): Promise<void> {
    this.connectionRetainers = Math.max(0, this.connectionRetainers - 1);
    this.shouldMaintainConnection = this.connectionRetainers > 0;

    if (this.shouldMaintainConnection) {
      return;
    }

    await this.stop();
  }

  subscribeConnectionState(listener: ConnectionStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.connectionState);

    return () => {
      this.stateListeners.delete(listener);
    };
  }

  subscribeReconnected(listener: () => void): () => void {
    this.reconnectListeners.add(listener);

    return () => {
      this.reconnectListeners.delete(listener);
    };
  }

  async start(): Promise<void> {
    this.clearPendingRetry();

    if (this.startPromise) {
      await this.startPromise;
      return;
    }

    const connection = this.getOrCreateConnection();

    if (
      connection.state === HubConnectionState.Connected ||
      connection.state === HubConnectionState.Reconnecting
    ) {
      this.setConnectionState(
        connection.state === HubConnectionState.Connected
          ? "connected"
          : "reconnecting",
      );
      return;
    }

    if (connection.state === HubConnectionState.Connecting) {
      this.setConnectionState("connecting");
      return;
    }

    const startTask = async () => {
      if (connection.state === HubConnectionState.Disconnecting) {
        await this.waitForDisconnected(connection);
      }

      if (connection.state === HubConnectionState.Disconnected) {
        this.setConnectionState(
          this.connectionState === "reconnecting"
            ? "reconnecting"
            : "connecting",
        );
        await connection.start();
      }

      if (connection.state === HubConnectionState.Connected) {
        this.setConnectionState("connected");
      }
    };

    this.startPromise = startTask()
      .catch((error) => {
        this.setConnectionState("disconnected");

        if (this.isNegotiationAbortError(error)) {
          return;
        }

        if (this.shouldMaintainConnection) {
          this.scheduleRetryStart();
        }

        throw error;
      })
      .finally(() => {
        this.startPromise = null;
      });

    await this.startPromise;
  }

  async stop(): Promise<void> {
    this.clearPendingRetry();

    if (!this.connection) {
      this.setConnectionState("disconnected");
      return;
    }

    if (this.startPromise) {
      await this.startPromise.catch(() => null);

      if (this.shouldMaintainConnection) {
        return;
      }
    }

    if (this.connection.state === HubConnectionState.Disconnected) {
      this.setConnectionState("disconnected");
      return;
    }

    await this.connection.stop();
    this.setConnectionState("disconnected");
  }

  async subscribeSosRequest(id: number): Promise<void> {
    const existingCount = this.joinedRequests.get(id) ?? 0;
    if (existingCount > 0) {
      this.joinedRequests.set(id, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      SOS_REQUEST_REALTIME_METHODS.SubscribeSosRequest,
      id,
    );
    this.joinedRequests.set(id, 1);
  }

  async unsubscribeSosRequest(id: number): Promise<void> {
    const existingCount = this.joinedRequests.get(id);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedRequests.set(id, existingCount - 1);
      return;
    }

    this.joinedRequests.delete(id);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(SOS_REQUEST_REALTIME_METHODS.UnsubscribeSosRequest, id)
      .catch(() => null);
  }

  async subscribeSosCluster(clusterId: number): Promise<void> {
    const existingCount = this.joinedClusters.get(clusterId) ?? 0;
    if (existingCount > 0) {
      this.joinedClusters.set(clusterId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      SOS_REQUEST_REALTIME_METHODS.SubscribeSosCluster,
      clusterId,
    );
    this.joinedClusters.set(clusterId, 1);
  }

  async unsubscribeSosCluster(clusterId: number): Promise<void> {
    const existingCount = this.joinedClusters.get(clusterId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedClusters.set(clusterId, existingCount - 1);
      return;
    }

    this.joinedClusters.delete(clusterId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(SOS_REQUEST_REALTIME_METHODS.UnsubscribeSosCluster, clusterId)
      .catch(() => null);
  }

  async subscribeUnclusteredSosRequests(): Promise<void> {
    if (this.joinedUnclustered > 0) {
      this.joinedUnclustered += 1;
      return;
    }

    await this.invokeWithReconnectRetry(
      SOS_REQUEST_REALTIME_METHODS.SubscribeUnclusteredSosRequests,
    );
    this.joinedUnclustered = 1;
  }

  async unsubscribeUnclusteredSosRequests(): Promise<void> {
    if (this.joinedUnclustered <= 0) {
      return;
    }

    if (this.joinedUnclustered > 1) {
      this.joinedUnclustered -= 1;
      return;
    }

    this.joinedUnclustered = 0;

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(SOS_REQUEST_REALTIME_METHODS.UnsubscribeUnclusteredSosRequests)
      .catch(() => null);
  }

  onSosRequestUpdate(listener: SosRequestUpdateListener): () => void {
    this.sosRequestUpdateListeners.add(listener);

    return () => {
      this.sosRequestUpdateListeners.delete(listener);
    };
  }
}

export const sosRequestRealtimeClient = new SosRequestRealtimeClient();
