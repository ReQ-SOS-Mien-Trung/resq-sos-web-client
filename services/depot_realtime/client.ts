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
  DEPOT_REALTIME_EVENTS,
  DEPOT_REALTIME_METHODS,
  DepotRealtimeEventEnvelope,
  DepotRealtimeVersionGapContext,
} from "./type";

type DepotKey = string;

type DepotSubscriptionHandlers = {
  onApplyFull: (
    fullDto: unknown,
    envelope: DepotRealtimeEventEnvelope,
  ) => void | Promise<void>;
  onApplyDelta: (
    delta: unknown,
    envelope: DepotRealtimeEventEnvelope,
  ) => void | Promise<void>;
  onVersionGap: (ctx: DepotRealtimeVersionGapContext) => void | Promise<void>;
  onDuplicate?: (envelope: DepotRealtimeEventEnvelope) => void;
};

type JoinedDepotGroup = {
  missionId: number | null;
  depotId: number;
  refCount: number;
};

const SEEN_EVENT_TTL_MS = 10 * 60 * 1000;

export class DepotRealtimeClient {
  private connection: HubConnection | null = null;
  private joinedGroups = new Map<DepotKey, JoinedDepotGroup>();
  private lastVersionByDepot = new Map<DepotKey, number>();
  private seenEventIds = new Map<string, number>();
  private reconnectListeners = new Set<() => void>();

  private async waitForDisconnected(
    connection: HubConnection,
    timeoutMs = 2500,
  ): Promise<void> {
    const startedAt = Date.now();

    while (connection.state === HubConnectionState.Disconnecting) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error("Depot realtime connection is still disconnecting.");
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  private buildConnection(): HubConnection {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "";

    if (!baseUrl) {
      throw new Error("Missing NEXT_PUBLIC_BASE_URL for depot realtime.");
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/notifications`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
        withCredentials: false,
        transport:
          HttpTransportType.WebSockets |
          HttpTransportType.ServerSentEvents |
          HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build();

    connection.onreconnected(() => {
      void this.rejoinGroups();
    });

    return connection;
  }

  private getOrCreateConnection(): HubConnection {
    if (!this.connection) {
      this.connection = this.buildConnection();
    }

    return this.connection;
  }

  private cleanupSeenEventIds(): void {
    const cutoff = Date.now() - SEEN_EVENT_TTL_MS;

    for (const [eventId, timestamp] of this.seenEventIds.entries()) {
      if (timestamp < cutoff) {
        this.seenEventIds.delete(eventId);
      }
    }
  }

  private async rejoinGroups(): Promise<void> {
    const connection = this.getOrCreateConnection();

    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    const groups = Array.from(this.joinedGroups.values());
    await Promise.all(
      groups.map(({ missionId, depotId }) =>
        connection
          .invoke(DEPOT_REALTIME_METHODS.JoinDepotGroup, missionId, depotId)
          .catch(() => null),
      ),
    );

    this.reconnectListeners.forEach((listener) => {
      listener();
    });
  }

  private streamKey(missionId: number | null, depotId: number): DepotKey {
    return `${missionId ?? "global"}:${depotId}`;
  }

  async start(): Promise<void> {
    const connection = this.getOrCreateConnection();

    if (
      connection.state === HubConnectionState.Connected ||
      connection.state === HubConnectionState.Connecting ||
      connection.state === HubConnectionState.Reconnecting
    ) {
      return;
    }

    if (connection.state === HubConnectionState.Disconnecting) {
      await this.waitForDisconnected(connection);
      const currentState = connection.state;
      if (currentState !== HubConnectionState.Disconnected) {
        return;
      }
    }

    await connection.start();
  }

  async stop(): Promise<void> {
    if (!this.connection) {
      return;
    }

    if (this.connection.state === HubConnectionState.Disconnected) {
      return;
    }

    await this.connection.stop();
  }

  async joinDepotGroup(
    missionId: number | null,
    depotId: number,
  ): Promise<void> {
    const streamKey = this.streamKey(missionId, depotId);
    const existing = this.joinedGroups.get(streamKey);

    if (existing) {
      existing.refCount += 1;
      return;
    }

    await this.start();
    const connection = this.getOrCreateConnection();
    await connection.invoke(
      DEPOT_REALTIME_METHODS.JoinDepotGroup,
      missionId,
      depotId,
    );
    this.joinedGroups.set(streamKey, { missionId, depotId, refCount: 1 });
  }

  async leaveDepotGroup(
    missionId: number | null,
    depotId: number,
  ): Promise<void> {
    const streamKey = this.streamKey(missionId, depotId);
    const existing = this.joinedGroups.get(streamKey);

    if (!existing) {
      return;
    }

    if (existing.refCount > 1) {
      existing.refCount -= 1;
      return;
    }

    this.joinedGroups.delete(streamKey);
    this.lastVersionByDepot.delete(streamKey);

    const connection = this.getOrCreateConnection();
    if (connection.state !== HubConnectionState.Connected) {
      return;
    }

    await connection
      .invoke(DEPOT_REALTIME_METHODS.LeaveDepotGroup, missionId, depotId)
      .catch(() => null);
  }

  onReconnected(handler: () => void): () => void {
    this.reconnectListeners.add(handler);

    return () => {
      this.reconnectListeners.delete(handler);
    };
  }

  onDepotUpdated(
    missionId: number | null,
    depotId: number,
    handlers: DepotSubscriptionHandlers,
  ): () => void {
    const streamKey = this.streamKey(missionId, depotId);
    const connection = this.getOrCreateConnection();

    const callback = (envelope: DepotRealtimeEventEnvelope) => {
      if (envelope.depotId !== depotId) return;

      const normalizedMissionId = missionId ?? null;
      const normalizedEnvelopeMissionId = envelope.missionId ?? null;

      // missionId = null is treated as the global depot stream (wildcard mission).
      if (
        normalizedMissionId !== null &&
        normalizedEnvelopeMissionId !== normalizedMissionId
      ) {
        return;
      }

      this.cleanupSeenEventIds();

      if (this.seenEventIds.has(envelope.eventId)) {
        handlers.onDuplicate?.(envelope);
        return;
      }
      this.seenEventIds.set(envelope.eventId, Date.now());

      const current = this.lastVersionByDepot.get(streamKey) ?? 0;
      if (envelope.version <= current) {
        handlers.onDuplicate?.(envelope);
        return;
      }

      const expected = current + 1;
      if (current > 0 && envelope.version > expected) {
        void handlers.onVersionGap({
          expected,
          actual: envelope.version,
          envelope,
        });
        return;
      }

      if (envelope.payloadKind === "Full") {
        void handlers.onApplyFull(envelope.payload, envelope);
      } else {
        void handlers.onApplyDelta(envelope.payload, envelope);
      }

      this.lastVersionByDepot.set(streamKey, envelope.version);
    };

    connection.on(DEPOT_REALTIME_EVENTS.DepotUpdated, callback);

    return () => {
      connection.off(DEPOT_REALTIME_EVENTS.DepotUpdated, callback);
    };
  }

  setKnownVersion(
    missionId: number | null,
    depotId: number,
    version: number,
  ): void {
    this.lastVersionByDepot.set(this.streamKey(missionId, depotId), version);
  }
}

export const depotRealtimeClient = new DepotRealtimeClient();
