import { HubConnection, LogLevel } from "@microsoft/signalr";

export const SIGNALR_SERVER_TIMEOUT_MS = 120_000;
export const SIGNALR_KEEP_ALIVE_MS = 30_000;
export const SIGNALR_CLIENT_LOG_LEVEL = LogLevel.Error;

export function applySignalRConnectionDefaults(
  connection: HubConnection,
): HubConnection {
  connection.serverTimeoutInMilliseconds = SIGNALR_SERVER_TIMEOUT_MS;
  connection.keepAliveIntervalInMilliseconds = SIGNALR_KEEP_ALIVE_MS;
  return connection;
}
