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
  ADMIN_OPERATIONS_REALTIME_EVENTS,
  ADMIN_OPERATIONS_REALTIME_METHODS,
} from "./type";

type RescueTeamUpdateHandler = () => void;
type RescuerScoresUpdateHandler = () => void;

const STOP_DEBOUNCE_MS = 1200;

class AdminOperationsRealtimeClient {
  private connection: HubConnection | null = null;
  private connectionRetainers = 0;
  private isReceiveEventBound = false;
  private pendingStopTimer: ReturnType<typeof setTimeout> | null = null;
  private startPromise: Promise<void> | null = null;

  private rescueTeamListSubscribers = 0;
  private rescueTeamDetailSubscriptions = new Map<number, number>();
  private rescuerScoresSubscriptions = new Map<string, number>();

  private rescueTeamUpdateListeners = new Set<RescueTeamUpdateHandler>();
  private rescuerScoresUpdateListeners = new Set<RescuerScoresUpdateHandler>();

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
        this.rescueTeamListSubscribers > 0 ||
        this.rescueTeamDetailSubscriptions.size > 0 ||
        this.rescuerScoresSubscriptions.size > 0
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
        throw new Error(
          "Admin operations realtime connection is still disconnecting.",
        );
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
          "Admin operations realtime connection did not connect in time.",
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
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "";

    if (!baseUrl) {
      throw new Error(
        "Missing NEXT_PUBLIC_BASE_URL for admin operations realtime.",
      );
    }

    const connection = applySignalRConnectionDefaults(
      new HubConnectionBuilder()
        .withUrl(`${baseUrl}/hubs/admin-operations`, {
          accessTokenFactory: () =>
            useAuthStore.getState().accessToken ?? "",
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
        ADMIN_OPERATIONS_REALTIME_EVENTS.ReceiveRescueTeamUpdate,
        () => {
          this.rescueTeamUpdateListeners.forEach((listener) => listener());
        },
      );

      this.connection.on(
        ADMIN_OPERATIONS_REALTIME_EVENTS.ReceiveRescuerScoresUpdate,
        () => {
          this.rescuerScoresUpdateListeners.forEach((listener) => listener());
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

    if (this.rescueTeamListSubscribers > 0) {
      tasks.push(
        connection.invoke(
          ADMIN_OPERATIONS_REALTIME_METHODS.SubscribeRescueTeams,
        ),
      );
    }

    this.rescueTeamDetailSubscriptions.forEach((count, teamId) => {
      if (count > 0) {
        tasks.push(
          connection.invoke(
            ADMIN_OPERATIONS_REALTIME_METHODS.SubscribeRescueTeam,
            teamId,
          ),
        );
      }
    });

    this.rescuerScoresSubscriptions.forEach((count, rescuerId) => {
      if (count > 0) {
        tasks.push(
          connection.invoke(
            ADMIN_OPERATIONS_REALTIME_METHODS.SubscribeRescuerScores,
            rescuerId,
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

  // ─── Rescue Team List ─────────────────────────────────────────────

  onRescueTeamUpdate(handler: RescueTeamUpdateHandler): () => void {
    this.rescueTeamUpdateListeners.add(handler);
    return () => {
      this.rescueTeamUpdateListeners.delete(handler);
    };
  }

  async subscribeRescueTeams(): Promise<void> {
    this.rescueTeamListSubscribers += 1;

    if (this.rescueTeamListSubscribers > 1) return;

    await this.invokeWhenConnected(
      ADMIN_OPERATIONS_REALTIME_METHODS.SubscribeRescueTeams,
    );
  }

  async unsubscribeRescueTeams(): Promise<void> {
    this.rescueTeamListSubscribers = Math.max(
      0,
      this.rescueTeamListSubscribers - 1,
    );

    if (this.rescueTeamListSubscribers > 0) return;

    await this.invokeWhenConnected(
      ADMIN_OPERATIONS_REALTIME_METHODS.UnsubscribeRescueTeams,
    ).catch(() => null);
    this.scheduleStop();
  }

  // ─── Rescue Team Detail ───────────────────────────────────────────

  async subscribeRescueTeam(teamId: number): Promise<void> {
    const current = this.rescueTeamDetailSubscriptions.get(teamId) ?? 0;
    this.rescueTeamDetailSubscriptions.set(teamId, current + 1);

    if (current > 0) return;

    await this.invokeWhenConnected(
      ADMIN_OPERATIONS_REALTIME_METHODS.SubscribeRescueTeam,
      teamId,
    );
  }

  async unsubscribeRescueTeam(teamId: number): Promise<void> {
    const current = this.rescueTeamDetailSubscriptions.get(teamId) ?? 0;
    const next = Math.max(0, current - 1);

    if (next > 0) {
      this.rescueTeamDetailSubscriptions.set(teamId, next);
      return;
    }

    this.rescueTeamDetailSubscriptions.delete(teamId);
    await this.invokeWhenConnected(
      ADMIN_OPERATIONS_REALTIME_METHODS.UnsubscribeRescueTeam,
      teamId,
    ).catch(() => null);
    this.scheduleStop();
  }

  // ─── Rescuer Scores ───────────────────────────────────────────────

  onRescuerScoresUpdate(handler: RescuerScoresUpdateHandler): () => void {
    this.rescuerScoresUpdateListeners.add(handler);
    return () => {
      this.rescuerScoresUpdateListeners.delete(handler);
    };
  }

  async subscribeRescuerScores(rescuerId: string): Promise<void> {
    const current = this.rescuerScoresSubscriptions.get(rescuerId) ?? 0;
    this.rescuerScoresSubscriptions.set(rescuerId, current + 1);

    if (current > 0) return;

    await this.invokeWhenConnected(
      ADMIN_OPERATIONS_REALTIME_METHODS.SubscribeRescuerScores,
      rescuerId,
    );
  }

  async unsubscribeRescuerScores(rescuerId: string): Promise<void> {
    const current = this.rescuerScoresSubscriptions.get(rescuerId) ?? 0;
    const next = Math.max(0, current - 1);

    if (next > 0) {
      this.rescuerScoresSubscriptions.set(rescuerId, next);
      return;
    }

    this.rescuerScoresSubscriptions.delete(rescuerId);
    await this.invokeWhenConnected(
      ADMIN_OPERATIONS_REALTIME_METHODS.UnsubscribeRescuerScores,
      rescuerId,
    ).catch(() => null);
    this.scheduleStop();
  }
}

export const adminOperationsRealtimeClient =
  new AdminOperationsRealtimeClient();
