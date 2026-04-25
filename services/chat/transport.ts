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
  CHAT_EVENTS,
  CHAT_METHODS,
  CoordinatorChatConnectionState,
} from "./type";

const STOP_DEBOUNCE_MS = 1200;

function toConnectionLabel(
  state: HubConnectionState,
): CoordinatorChatConnectionState {
  if (state === HubConnectionState.Connected) {
    return "connected";
  }

  if (state === HubConnectionState.Connecting) {
    return "connecting";
  }

  if (state === HubConnectionState.Reconnecting) {
    return "reconnecting";
  }

  return "disconnected";
}

export class ChatTransportService {
  private connection: HubConnection | null = null;
  private connectionRetainers = 0;
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

      if (this.connectionRetainers > 0) {
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
        throw new Error("Chat connection is still disconnecting.");
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  private buildConnection(): HubConnection {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "";

    if (!baseUrl) {
      throw new Error("Missing NEXT_PUBLIC_BASE_URL for chat transport.");
    }

    return applySignalRConnectionDefaults(
      new HubConnectionBuilder()
        .withUrl(`${baseUrl}/hubs/chat`, {
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

    return this.connection;
  }

  async start(): Promise<void> {
    this.clearPendingStop();

    if (this.startPromise) {
      await this.startPromise;
      return;
    }

    const connection = this.getOrCreateConnection();

    if (connection.state === HubConnectionState.Connected) {
      return;
    }

    if (connection.state === HubConnectionState.Connecting) {
      return;
    }

    if (connection.state === HubConnectionState.Reconnecting) {
      return;
    }

    const startTask = async () => {
      if (connection.state === HubConnectionState.Disconnecting) {
        await this.waitForDisconnected(connection);
      }

      if (connection.state !== HubConnectionState.Disconnected) {
        return;
      }

      await connection.start();
    };

    this.startPromise = startTask().finally(() => {
      this.startPromise = null;
    });

    await this.startPromise;
  }

  async stop(): Promise<void> {
    this.clearPendingStop();

    if (!this.connection) {
      return;
    }

    if (this.startPromise) {
      await this.startPromise.catch(() => null);
    }

    if (this.connection.state === HubConnectionState.Disconnected) {
      return;
    }

    await this.connection.stop();
  }

  retainConnection(): void {
    this.connectionRetainers += 1;
    this.clearPendingStop();
  }

  async releaseConnection(): Promise<void> {
    this.connectionRetainers = Math.max(0, this.connectionRetainers - 1);

    if (this.connectionRetainers > 0) {
      return;
    }

    this.scheduleStop();
  }

  on<T>(event: string, handler: (payload: T) => void): void {
    this.getOrCreateConnection().on(
      event,
      handler as (...args: unknown[]) => void,
    );
  }

  off<T>(event: string, handler?: (payload: T) => void): void {
    this.getOrCreateConnection().off(
      event,
      handler as ((...args: unknown[]) => void) | undefined,
    );
  }

  onReconnected(handler: (connectionId?: string) => void): void {
    this.getOrCreateConnection().onreconnected(handler);
  }

  onReconnecting(handler: (error?: Error) => void): void {
    this.getOrCreateConnection().onreconnecting(handler);
  }

  onClose(handler: (error?: Error) => void): void {
    this.getOrCreateConnection().onclose(handler);
  }

  async invoke<T>(method: string, ...args: unknown[]): Promise<T> {
    const connection = this.getOrCreateConnection();

    if (connection.state !== HubConnectionState.Connected) {
      await this.start();
    }

    if (connection.state !== HubConnectionState.Connected) {
      throw new Error(
        "Realtime chat is reconnecting. Please wait a moment and retry.",
      );
    }

    return connection.invoke<T>(method, ...args);
  }

  async joinConversation(conversationId: number): Promise<void> {
    await this.invoke(CHAT_METHODS.JoinConversation, conversationId);
  }

  async leaveConversation(conversationId: number): Promise<void> {
    await this.invoke(CHAT_METHODS.LeaveConversation, conversationId);
  }

  async coordinatorJoin(conversationId: number): Promise<void> {
    await this.invoke(CHAT_METHODS.CoordinatorJoin, conversationId);
  }

  async sendMessage(conversationId: number, content: string): Promise<void> {
    await this.invoke(CHAT_METHODS.SendMessage, conversationId, content);
  }

  getState(): HubConnectionState {
    return this.getOrCreateConnection().state;
  }

  getStateLabel(): CoordinatorChatConnectionState {
    return toConnectionLabel(this.getState());
  }

  isConnected(): boolean {
    return this.getState() === HubConnectionState.Connected;
  }
}

export const coordinatorChatTransport = new ChatTransportService();

export { CHAT_EVENTS };
