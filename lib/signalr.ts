import { HubConnection, LogLevel, type ILogger } from "@microsoft/signalr";

export const SIGNALR_SERVER_TIMEOUT_MS = 120_000;
export const SIGNALR_KEEP_ALIVE_MS = 30_000;

function normalizeSignalRMessage(message: string): string {
  return message.trim().toLowerCase();
}

function isIgnorableSignalRErrorMessage(message: string): boolean {
  const normalized = normalizeSignalRMessage(message);

  const isServerCloseNoise =
    normalized.includes("connection disconnected with error") &&
    normalized.includes("server returned an error on close") &&
    normalized.includes("connection closed with an error");

  const isWebSocket1006Noise =
    normalized.includes("connection disconnected with error") &&
    normalized.includes("websocket closed with status code: 1006");

  const isServerTimeoutNoise =
    normalized.includes("connection disconnected with error") &&
    normalized.includes("server timeout elapsed without receiving a message");

  return isServerCloseNoise || isWebSocket1006Noise || isServerTimeoutNoise;
}

function isRecoverableSignalRConnectionMessage(message: string): boolean {
  const normalized = normalizeSignalRMessage(message);

  return (
    normalized.includes("failed to complete negotiation") ||
    normalized.includes("failed to start the connection") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("stopped during negotiation") ||
    normalized.includes("connection disconnected with error") ||
    normalized.includes("connection closed with an error")
  );
}

class SignalRConsoleLogger implements ILogger {
  log(logLevel: LogLevel, message: string): void {
    if (logLevel < LogLevel.Error) {
      return;
    }

    if (isIgnorableSignalRErrorMessage(message)) {
      return;
    }

    if (isRecoverableSignalRConnectionMessage(message)) {
      console.warn(message);
      return;
    }

    console.warn(message);
  }
}

export const SIGNALR_CLIENT_LOG_LEVEL: ILogger = new SignalRConsoleLogger();

export function applySignalRConnectionDefaults(
  connection: HubConnection,
): HubConnection {
  connection.serverTimeoutInMilliseconds = SIGNALR_SERVER_TIMEOUT_MS;
  connection.keepAliveIntervalInMilliseconds = SIGNALR_KEEP_ALIVE_MS;
  return connection;
}
