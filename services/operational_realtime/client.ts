"use client";

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { useAuthStore } from "@/stores/auth.store";
import {
  OPERATIONAL_REALTIME_EVENTS,
  OPERATIONAL_REALTIME_METHODS,
  OperationalRealtimeConnectionState,
  ReceiveAssemblyPointListUpdatePayload,
  ReceiveDepotInventoryUpdatePayload,
  ReceiveLogisticsUpdatePayload,
} from "./type";

type ConnectionStateListener = (
  state: OperationalRealtimeConnectionState,
) => void;

type AssemblyPointListUpdateListener = (
  payload: ReceiveAssemblyPointListUpdatePayload,
) => void;

type DepotInventoryUpdateListener = (
  payload: ReceiveDepotInventoryUpdatePayload,
) => void;

type LogisticsUpdateListener = (
  payload: ReceiveLogisticsUpdatePayload,
) => void;

export class OperationalRealtimeClient {
  private connection: HubConnection | null = null;
  private startPromise: Promise<void> | null = null;
  private isLifecycleBound = false;
  private isReceiveEventsBound = false;
  private connectionState: OperationalRealtimeConnectionState = "disconnected";
  private stateListeners = new Set<ConnectionStateListener>();
  private assemblyPointListListeners = new Set<AssemblyPointListUpdateListener>();
  private depotInventoryListeners = new Set<DepotInventoryUpdateListener>();
  private logisticsListeners = new Set<LogisticsUpdateListener>();
  private joinedDepots = new Map<number, number>();
  private joinedClusters = new Map<number, number>();

  private notifyConnectionState(): void {
    this.stateListeners.forEach((listener) => listener(this.connectionState));
  }

  private setConnectionState(
    nextState: OperationalRealtimeConnectionState,
  ): void {
    if (this.connectionState === nextState) {
      return;
    }

    this.connectionState = nextState;
    this.notifyConnectionState();
  }

  private async waitForDisconnected(
    connection: HubConnection,
    timeoutMs = 2500,
  ): Promise<void> {
    const startedAt = Date.now();

    while (connection.state === HubConnectionState.Disconnecting) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error("Operational hub connection is still disconnecting.");
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
      throw new Error("Missing NEXT_PUBLIC_BASE_URL for operational realtime.");
    }

    return new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/operational`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
        withCredentials: false,
        transport:
          HttpTransportType.WebSockets |
          HttpTransportType.ServerSentEvents |
          HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();
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
        void this.rejoinSubscriptions();
      });

      this.connection.onclose(() => {
        this.setConnectionState("disconnected");
      });

      this.isLifecycleBound = true;
    }

    if (!this.isReceiveEventsBound) {
      this.connection.on(
        OPERATIONAL_REALTIME_EVENTS.ReceiveAssemblyPointListUpdate,
        (payload: ReceiveAssemblyPointListUpdatePayload) => {
          this.assemblyPointListListeners.forEach((listener) =>
            listener(payload),
          );
        },
      );

      this.connection.on(
        OPERATIONAL_REALTIME_EVENTS.ReceiveDepotInventoryUpdate,
        (payload: ReceiveDepotInventoryUpdatePayload) => {
          this.depotInventoryListeners.forEach((listener) => listener(payload));
        },
      );

      this.connection.on(
        OPERATIONAL_REALTIME_EVENTS.ReceiveLogisticsUpdate,
        (payload: ReceiveLogisticsUpdatePayload) => {
          this.logisticsListeners.forEach((listener) => listener(payload));
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
      ...Array.from(this.joinedDepots.keys()).map((depotId) =>
        connection
          .invoke(OPERATIONAL_REALTIME_METHODS.SubscribeDepot, depotId)
          .catch(() => null),
      ),
      ...Array.from(this.joinedClusters.keys()).map((clusterId) =>
        connection
          .invoke(OPERATIONAL_REALTIME_METHODS.SubscribeCluster, clusterId)
          .catch(() => null),
      ),
    ]);
  }

  private async invokeWithReconnectRetry(
    method: string,
    id: number,
  ): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await this.start();
      const connection = this.getOrCreateConnection();

      try {
        await connection.invoke(method, id);
        return;
      } catch (error) {
        if (attempt === 0 && this.isNotConnectedInvokeError(error)) {
          continue;
        }

        throw error;
      }
    }
  }

  getConnectionState(): OperationalRealtimeConnectionState {
    return this.connectionState;
  }

  subscribeConnectionState(listener: ConnectionStateListener): () => void {
    this.stateListeners.add(listener);

    return () => {
      this.stateListeners.delete(listener);
    };
  }

  async start(): Promise<void> {
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
      this.setConnectionState("reconnecting");
      return;
    }

    const startTask = async () => {
      if (connection.state === HubConnectionState.Disconnecting) {
        await this.waitForDisconnected(connection);
      }

      if (connection.state === HubConnectionState.Disconnected) {
        await connection.start();
      }

      if (connection.state === HubConnectionState.Connected) {
        this.setConnectionState("connected");
      }
    };

    this.startPromise = startTask()
      .catch((error) => {
        this.setConnectionState("disconnected");
        throw error;
      })
      .finally(() => {
        this.startPromise = null;
      });

    await this.startPromise;
  }

  async stop(): Promise<void> {
    if (!this.connection) {
      this.setConnectionState("disconnected");
      return;
    }

    if (this.connection.state === HubConnectionState.Disconnected) {
      this.setConnectionState("disconnected");
      return;
    }

    await this.connection.stop();
    this.setConnectionState("disconnected");
  }

  async subscribeDepot(depotId: number): Promise<void> {
    const existingCount = this.joinedDepots.get(depotId) ?? 0;
    if (existingCount > 0) {
      this.joinedDepots.set(depotId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeDepot,
      depotId,
    );
    this.joinedDepots.set(depotId, 1);
  }

  async unsubscribeDepot(depotId: number): Promise<void> {
    const existingCount = this.joinedDepots.get(depotId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedDepots.set(depotId, existingCount - 1);
      return;
    }

    this.joinedDepots.delete(depotId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(OPERATIONAL_REALTIME_METHODS.UnsubscribeDepot, depotId)
      .catch(() => null);
  }

  async subscribeCluster(clusterId: number): Promise<void> {
    const existingCount = this.joinedClusters.get(clusterId) ?? 0;
    if (existingCount > 0) {
      this.joinedClusters.set(clusterId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeCluster,
      clusterId,
    );
    this.joinedClusters.set(clusterId, 1);
  }

  async unsubscribeCluster(clusterId: number): Promise<void> {
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
      .invoke(OPERATIONAL_REALTIME_METHODS.UnsubscribeCluster, clusterId)
      .catch(() => null);
  }

  onAssemblyPointListUpdate(
    listener: AssemblyPointListUpdateListener,
  ): () => void {
    this.assemblyPointListListeners.add(listener);

    return () => {
      this.assemblyPointListListeners.delete(listener);
    };
  }

  onDepotInventoryUpdate(listener: DepotInventoryUpdateListener): () => void {
    this.depotInventoryListeners.add(listener);

    return () => {
      this.depotInventoryListeners.delete(listener);
    };
  }

  onLogisticsUpdate(listener: LogisticsUpdateListener): () => void {
    this.logisticsListeners.add(listener);

    return () => {
      this.logisticsListeners.delete(listener);
    };
  }
}

export const operationalRealtimeClient = new OperationalRealtimeClient();
