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
  CHAT_EVENTS,
  CHAT_METHODS,
  CoordinatorChatConnectionState,
} from "./type";

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

  private buildConnection(): HubConnection {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "";

    if (!baseUrl) {
      throw new Error("Missing NEXT_PUBLIC_BASE_URL for chat transport.");
    }

    return new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/chat`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
        withCredentials: false,
        transport:
          HttpTransportType.WebSockets |
          HttpTransportType.ServerSentEvents |
          HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();
  }

  private getOrCreateConnection(): HubConnection {
    if (!this.connection) {
      this.connection = this.buildConnection();
    }

    return this.connection;
  }

  async start(): Promise<void> {
    const connection = this.getOrCreateConnection();

    if (connection.state === HubConnectionState.Connected) {
      return;
    }

    if (connection.state === HubConnectionState.Connecting) {
      return;
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
