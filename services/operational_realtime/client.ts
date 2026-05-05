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
  OPERATIONAL_REALTIME_EVENTS,
  OPERATIONAL_REALTIME_METHODS,
  OperationalRealtimeConnectionState,
  ReceiveAssemblyPointListUpdatePayload,
  ReceiveDepotActivityUpdatePayload,
  ReceiveDepotClosureUpdatePayload,
  ReceiveDepotInventoryUpdatePayload,
  ReceiveLogisticsUpdatePayload,
  ReceiveInventoryLotsUpdatePayload,
  ReceiveSupplyRequestUpdatePayload,
  ReceiveUpcomingReturnsUpdatePayload,
  ReceiveAssemblyEventCheckedInRescuersUpdatePayload,
} from "./type";
import { ChartInvalidation } from "@/services/chart_invalidation/type";

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

type SupplyRequestUpdateListener = (
  payload: ReceiveSupplyRequestUpdatePayload,
) => void;

type DepotActivityUpdateListener = (
  payload: ReceiveDepotActivityUpdatePayload,
) => void;

type DepotClosureUpdateListener = (
  payload: ReceiveDepotClosureUpdatePayload,
) => void;

type UpcomingReturnsUpdateListener = (
  payload: ReceiveUpcomingReturnsUpdatePayload,
) => void;
 
type AssemblyEventCheckedInRescuersUpdateListener = (
  payload: ReceiveAssemblyEventCheckedInRescuersUpdatePayload,
) => void;

type ChartInvalidationListener = (payload: ChartInvalidation) => void;
type InventoryLotsUpdateListener = (
  payload: ReceiveInventoryLotsUpdatePayload,
) => void;

const START_RETRY_DELAY_MS = 2000;

export class OperationalRealtimeClient {
  private connection: HubConnection | null = null;
  private startPromise: Promise<void> | null = null;
  private isLifecycleBound = false;
  private isReceiveEventsBound = false;
  private pendingRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldMaintainConnection = false;
  private connectionRetainers = 0;
  private connectionState: OperationalRealtimeConnectionState = "disconnected";
  private stateListeners = new Set<ConnectionStateListener>();
  private reconnectListeners = new Set<() => void>();
  private assemblyPointListListeners = new Set<AssemblyPointListUpdateListener>();
  private depotInventoryListeners = new Set<DepotInventoryUpdateListener>();
  private logisticsListeners = new Set<LogisticsUpdateListener>();
  private supplyRequestListeners = new Set<SupplyRequestUpdateListener>();
  private depotActivityListeners = new Set<DepotActivityUpdateListener>();
  private depotClosureListeners = new Set<DepotClosureUpdateListener>();
  private upcomingReturnsListeners = new Set<UpcomingReturnsUpdateListener>();
  private assemblyEventCheckedInRescuersListeners =
    new Set<AssemblyEventCheckedInRescuersUpdateListener>();
  private chartInvalidationListeners = new Set<ChartInvalidationListener>();
  private inventoryLotsListeners = new Set<InventoryLotsUpdateListener>();
  private joinedDepots = new Map<number, number>();
  private joinedClusters = new Map<number, number>();
  private joinedSupplyRequestDepots = new Map<number, number>();
  private joinedSupplyRequests = new Map<number, number>();
  private joinedActivityDepots = new Map<number, number>();
  private joinedActivities = new Map<number, number>();
  private joinedClosureDepots = new Map<number, number>();
  private joinedClosures = new Map<number, number>();
  private joinedTransfers = new Map<number, number>();
  private joinedUpcomingReturns = new Map<number, number>();
  private joinedDepotCharts = new Map<number, number>();
  private joinedInventoryLots = new Map<
    string,
    { depotId: number; itemModelId: number; count: number }
  >();
  private joinedAssemblyEvents = new Map<number, number>();

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

        console.error("Failed to reconnect operational hub:", error);
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
        throw new Error("Operational hub connection is still disconnecting.");
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  private isNotConnectedInvokeError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /not in the 'Connected' State/i.test(message);
  }

  private isBenignStopError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    return (
      normalized.includes("underlying connection being closed") ||
      normalized.includes("connection being closed") ||
      normalized.includes("connection was stopped") ||
      normalized.includes("connection is not active") ||
      normalized.includes("not in the 'connected' state")
    );
  }

  private buildConnection(): HubConnection {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "";

    if (!baseUrl) {
      throw new Error("Missing NEXT_PUBLIC_BASE_URL for operational realtime.");
    }

    return applySignalRConnectionDefaults(
      new HubConnectionBuilder()
        .withUrl(`${baseUrl}/hubs/logistics`, {
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

      this.connection.on(
        OPERATIONAL_REALTIME_EVENTS.ReceiveSupplyRequestUpdate,
        (payload: ReceiveSupplyRequestUpdatePayload) => {
          this.supplyRequestListeners.forEach((listener) => listener(payload));
        },
      );

      this.connection.on(
        OPERATIONAL_REALTIME_EVENTS.ReceiveDepotActivityUpdate,
        (payload: ReceiveDepotActivityUpdatePayload) => {
          this.depotActivityListeners.forEach((listener) => listener(payload));
        },
      );

      this.connection.on(
        OPERATIONAL_REALTIME_EVENTS.ReceiveDepotClosureUpdate,
        (payload: ReceiveDepotClosureUpdatePayload) => {
          this.depotClosureListeners.forEach((listener) => listener(payload));
        },
      );

      this.connection.on(
        OPERATIONAL_REALTIME_EVENTS.ReceiveUpcomingReturnsUpdate,
        (payload: ReceiveUpcomingReturnsUpdatePayload) => {
          this.upcomingReturnsListeners.forEach((listener) => listener(payload));
        },
      );

      this.connection.on(
        OPERATIONAL_REALTIME_EVENTS.ReceiveAssemblyEventCheckedInRescuersUpdate,
        (payload: ReceiveAssemblyEventCheckedInRescuersUpdatePayload) => {
          this.assemblyEventCheckedInRescuersListeners.forEach((listener) =>
            listener(payload),
          );
        },
      );

      this.connection.on(
        OPERATIONAL_REALTIME_EVENTS.ReceiveChartInvalidation,
        (payload: ChartInvalidation) => {
          this.chartInvalidationListeners.forEach((listener) =>
            listener(payload),
          );
        },
      );

      this.connection.on(
        OPERATIONAL_REALTIME_EVENTS.ReceiveInventoryLotsUpdate,
        (payload: ReceiveInventoryLotsUpdatePayload) => {
          this.inventoryLotsListeners.forEach((listener) => listener(payload));
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
      ...Array.from(this.joinedSupplyRequestDepots.keys()).map((depotId) =>
        connection
          .invoke(OPERATIONAL_REALTIME_METHODS.SubscribeSupplyRequests, depotId)
          .catch(() => null),
      ),
      ...Array.from(this.joinedSupplyRequests.keys()).map((requestId) =>
        connection
          .invoke(OPERATIONAL_REALTIME_METHODS.SubscribeSupplyRequest, requestId)
          .catch(() => null),
      ),
      ...Array.from(this.joinedActivityDepots.keys()).map((depotId) =>
        connection
          .invoke(OPERATIONAL_REALTIME_METHODS.SubscribeDepotActivities, depotId)
          .catch(() => null),
      ),
      ...Array.from(this.joinedActivities.keys()).map((activityId) =>
        connection
          .invoke(OPERATIONAL_REALTIME_METHODS.SubscribeActivity, activityId)
          .catch(() => null),
      ),
      ...Array.from(this.joinedClosureDepots.keys()).map((depotId) =>
        connection
          .invoke(OPERATIONAL_REALTIME_METHODS.SubscribeDepotClosures, depotId)
          .catch(() => null),
      ),
      ...Array.from(this.joinedClosures.keys()).map((closureId) =>
        connection
          .invoke(OPERATIONAL_REALTIME_METHODS.SubscribeClosure, closureId)
          .catch(() => null),
      ),
      ...Array.from(this.joinedTransfers.keys()).map((transferId) =>
        connection
          .invoke(OPERATIONAL_REALTIME_METHODS.SubscribeTransfer, transferId)
          .catch(() => null),
      ),
      ...Array.from(this.joinedUpcomingReturns.keys()).map((depotId) =>
        connection
          .invoke(OPERATIONAL_REALTIME_METHODS.SubscribeUpcomingReturns, depotId)
          .catch(() => null),
      ),
      ...Array.from(this.joinedDepotCharts.keys()).map((depotId) =>
        connection
          .invoke(OPERATIONAL_REALTIME_METHODS.SubscribeDepotCharts, depotId)
          .catch(() => null),
      ),
      ...Array.from(this.joinedInventoryLots.values()).map((entry) =>
        connection
          .invoke(
            OPERATIONAL_REALTIME_METHODS.SubscribeInventoryLots,
            entry.depotId,
            entry.itemModelId,
          )
          .catch(() => null),
      ),
      ...Array.from(this.joinedAssemblyEvents.keys()).map((eventId) =>
        connection
          .invoke(
            OPERATIONAL_REALTIME_METHODS.SubscribeAssemblyEventCheckedInRescuers,
            eventId,
          )
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

  private async invokeWithReconnectRetryArgs(
    method: string,
    ...args: number[]
  ): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await this.start();
      const connection = this.getOrCreateConnection();

      try {
        await connection.invoke(method, ...args);
        return;
      } catch (error) {
        if (attempt === 0 && this.isNotConnectedInvokeError(error)) {
          continue;
        }

        throw error;
      }
    }
  }

  private getInventoryLotsSubscriptionKey(
    depotId: number,
    itemModelId: number,
  ): string {
    return `${depotId}:${itemModelId}`;
  }

  getConnectionState(): OperationalRealtimeConnectionState {
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

    const connection = this.connection;

    if (connection.state === HubConnectionState.Disconnected) {
      this.setConnectionState("disconnected");
      return;
    }

    try {
      await connection.stop();
    } catch (error) {
      if (
        !this.isBenignStopError(error) &&
        connection.state !== HubConnectionState.Disconnected
      ) {
        throw error;
      }
    } finally {
      this.setConnectionState("disconnected");
    }
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

  async subscribeSupplyRequests(depotId: number): Promise<void> {
    const existingCount = this.joinedSupplyRequestDepots.get(depotId) ?? 0;
    if (existingCount > 0) {
      this.joinedSupplyRequestDepots.set(depotId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeSupplyRequests,
      depotId,
    );
    this.joinedSupplyRequestDepots.set(depotId, 1);
  }

  async unsubscribeSupplyRequests(depotId: number): Promise<void> {
    const existingCount = this.joinedSupplyRequestDepots.get(depotId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedSupplyRequestDepots.set(depotId, existingCount - 1);
      return;
    }

    this.joinedSupplyRequestDepots.delete(depotId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(OPERATIONAL_REALTIME_METHODS.UnsubscribeSupplyRequests, depotId)
      .catch(() => null);
  }

  async subscribeSupplyRequest(requestId: number): Promise<void> {
    const existingCount = this.joinedSupplyRequests.get(requestId) ?? 0;
    if (existingCount > 0) {
      this.joinedSupplyRequests.set(requestId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeSupplyRequest,
      requestId,
    );
    this.joinedSupplyRequests.set(requestId, 1);
  }

  async unsubscribeSupplyRequest(requestId: number): Promise<void> {
    const existingCount = this.joinedSupplyRequests.get(requestId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedSupplyRequests.set(requestId, existingCount - 1);
      return;
    }

    this.joinedSupplyRequests.delete(requestId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(OPERATIONAL_REALTIME_METHODS.UnsubscribeSupplyRequest, requestId)
      .catch(() => null);
  }

  onSupplyRequestUpdate(listener: SupplyRequestUpdateListener): () => void {
    this.supplyRequestListeners.add(listener);

    return () => {
      this.supplyRequestListeners.delete(listener);
    };
  }

  async subscribeDepotActivities(depotId: number): Promise<void> {
    const existingCount = this.joinedActivityDepots.get(depotId) ?? 0;
    if (existingCount > 0) {
      this.joinedActivityDepots.set(depotId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeDepotActivities,
      depotId,
    );
    this.joinedActivityDepots.set(depotId, 1);
  }

  async unsubscribeDepotActivities(depotId: number): Promise<void> {
    const existingCount = this.joinedActivityDepots.get(depotId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedActivityDepots.set(depotId, existingCount - 1);
      return;
    }

    this.joinedActivityDepots.delete(depotId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(OPERATIONAL_REALTIME_METHODS.UnsubscribeDepotActivities, depotId)
      .catch(() => null);
  }

  async subscribeActivity(activityId: number): Promise<void> {
    const existingCount = this.joinedActivities.get(activityId) ?? 0;
    if (existingCount > 0) {
      this.joinedActivities.set(activityId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeActivity,
      activityId,
    );
    this.joinedActivities.set(activityId, 1);
  }

  async unsubscribeActivity(activityId: number): Promise<void> {
    const existingCount = this.joinedActivities.get(activityId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedActivities.set(activityId, existingCount - 1);
      return;
    }

    this.joinedActivities.delete(activityId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(OPERATIONAL_REALTIME_METHODS.UnsubscribeActivity, activityId)
      .catch(() => null);
  }

  onDepotActivityUpdate(listener: DepotActivityUpdateListener): () => void {
    this.depotActivityListeners.add(listener);

    return () => {
      this.depotActivityListeners.delete(listener);
    };
  }

  async subscribeDepotClosures(depotId: number): Promise<void> {
    const existingCount = this.joinedClosureDepots.get(depotId) ?? 0;
    if (existingCount > 0) {
      this.joinedClosureDepots.set(depotId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeDepotClosures,
      depotId,
    );
    this.joinedClosureDepots.set(depotId, 1);
  }

  async unsubscribeDepotClosures(depotId: number): Promise<void> {
    const existingCount = this.joinedClosureDepots.get(depotId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedClosureDepots.set(depotId, existingCount - 1);
      return;
    }

    this.joinedClosureDepots.delete(depotId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(OPERATIONAL_REALTIME_METHODS.UnsubscribeDepotClosures, depotId)
      .catch(() => null);
  }

  async subscribeClosure(closureId: number): Promise<void> {
    const existingCount = this.joinedClosures.get(closureId) ?? 0;
    if (existingCount > 0) {
      this.joinedClosures.set(closureId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeClosure,
      closureId,
    );
    this.joinedClosures.set(closureId, 1);
  }

  async unsubscribeClosure(closureId: number): Promise<void> {
    const existingCount = this.joinedClosures.get(closureId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedClosures.set(closureId, existingCount - 1);
      return;
    }

    this.joinedClosures.delete(closureId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(OPERATIONAL_REALTIME_METHODS.UnsubscribeClosure, closureId)
      .catch(() => null);
  }

  async subscribeTransfer(transferId: number): Promise<void> {
    const existingCount = this.joinedTransfers.get(transferId) ?? 0;
    if (existingCount > 0) {
      this.joinedTransfers.set(transferId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeTransfer,
      transferId,
    );
    this.joinedTransfers.set(transferId, 1);
  }

  async unsubscribeTransfer(transferId: number): Promise<void> {
    const existingCount = this.joinedTransfers.get(transferId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedTransfers.set(transferId, existingCount - 1);
      return;
    }

    this.joinedTransfers.delete(transferId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(OPERATIONAL_REALTIME_METHODS.UnsubscribeTransfer, transferId)
      .catch(() => null);
  }

  onDepotClosureUpdate(listener: DepotClosureUpdateListener): () => void {
    this.depotClosureListeners.add(listener);

    return () => {
      this.depotClosureListeners.delete(listener);
    };
  }

  async subscribeUpcomingReturns(depotId: number): Promise<void> {
    const existingCount = this.joinedUpcomingReturns.get(depotId) ?? 0;
    if (existingCount > 0) {
      this.joinedUpcomingReturns.set(depotId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeUpcomingReturns,
      depotId,
    );
    this.joinedUpcomingReturns.set(depotId, 1);
  }

  async unsubscribeUpcomingReturns(depotId: number): Promise<void> {
    const existingCount = this.joinedUpcomingReturns.get(depotId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedUpcomingReturns.set(depotId, existingCount - 1);
      return;
    }

    this.joinedUpcomingReturns.delete(depotId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(OPERATIONAL_REALTIME_METHODS.UnsubscribeUpcomingReturns, depotId)
      .catch(() => null);
  }

  onUpcomingReturnsUpdate(listener: UpcomingReturnsUpdateListener): () => void {
    this.upcomingReturnsListeners.add(listener);

    return () => {
      this.upcomingReturnsListeners.delete(listener);
    };
  }

  async subscribeDepotCharts(depotId: number): Promise<void> {
    const existingCount = this.joinedDepotCharts.get(depotId) ?? 0;
    if (existingCount > 0) {
      this.joinedDepotCharts.set(depotId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeDepotCharts,
      depotId,
    );
    this.joinedDepotCharts.set(depotId, 1);
  }

  async unsubscribeDepotCharts(depotId: number): Promise<void> {
    const existingCount = this.joinedDepotCharts.get(depotId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedDepotCharts.set(depotId, existingCount - 1);
      return;
    }

    this.joinedDepotCharts.delete(depotId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(OPERATIONAL_REALTIME_METHODS.UnsubscribeDepotCharts, depotId)
      .catch(() => null);
  }

  async subscribeInventoryLots(
    depotId: number,
    itemModelId: number,
  ): Promise<void> {
    const key = this.getInventoryLotsSubscriptionKey(depotId, itemModelId);
    const current = this.joinedInventoryLots.get(key);

    if (current) {
      this.joinedInventoryLots.set(key, {
        ...current,
        count: current.count + 1,
      });
      return;
    }

    await this.invokeWithReconnectRetryArgs(
      OPERATIONAL_REALTIME_METHODS.SubscribeInventoryLots,
      depotId,
      itemModelId,
    );
    this.joinedInventoryLots.set(key, { depotId, itemModelId, count: 1 });
  }

  async unsubscribeInventoryLots(
    depotId: number,
    itemModelId: number,
  ): Promise<void> {
    const key = this.getInventoryLotsSubscriptionKey(depotId, itemModelId);
    const current = this.joinedInventoryLots.get(key);

    if (!current) {
      return;
    }

    if (current.count > 1) {
      this.joinedInventoryLots.set(key, {
        ...current,
        count: current.count - 1,
      });
      return;
    }

    this.joinedInventoryLots.delete(key);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(
        OPERATIONAL_REALTIME_METHODS.UnsubscribeInventoryLots,
        depotId,
        itemModelId,
      )
      .catch(() => null);
  }

  async subscribeAssemblyEventCheckedInRescuers(
    eventId: number,
  ): Promise<void> {
    const existingCount = this.joinedAssemblyEvents.get(eventId) ?? 0;
    if (existingCount > 0) {
      this.joinedAssemblyEvents.set(eventId, existingCount + 1);
      return;
    }

    await this.invokeWithReconnectRetry(
      OPERATIONAL_REALTIME_METHODS.SubscribeAssemblyEventCheckedInRescuers,
      eventId,
    );
    this.joinedAssemblyEvents.set(eventId, 1);
  }

  async unsubscribeAssemblyEventCheckedInRescuers(
    eventId: number,
  ): Promise<void> {
    const existingCount = this.joinedAssemblyEvents.get(eventId);
    if (!existingCount) {
      return;
    }

    if (existingCount > 1) {
      this.joinedAssemblyEvents.set(eventId, existingCount - 1);
      return;
    }

    this.joinedAssemblyEvents.delete(eventId);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(
        OPERATIONAL_REALTIME_METHODS.UnsubscribeAssemblyEventCheckedInRescuers,
        eventId,
      )
      .catch(() => null);
  }

  onAssemblyEventCheckedInRescuersUpdate(
    listener: AssemblyEventCheckedInRescuersUpdateListener,
  ): () => void {
    this.assemblyEventCheckedInRescuersListeners.add(listener);

    return () => {
      this.assemblyEventCheckedInRescuersListeners.delete(listener);
    };
  }

  onChartInvalidation(listener: ChartInvalidationListener): () => void {
    this.chartInvalidationListeners.add(listener);

    return () => {
      this.chartInvalidationListeners.delete(listener);
    };
  }

  onInventoryLotsUpdate(listener: InventoryLotsUpdateListener): () => void {
    this.inventoryLotsListeners.add(listener);

    return () => {
      this.inventoryLotsListeners.delete(listener);
    };
  }
}

export const operationalRealtimeClient = new OperationalRealtimeClient();
