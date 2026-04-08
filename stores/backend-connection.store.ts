import { create } from "zustand";

type BackendConnectionStatus = "online" | "offline";

interface MarkOfflinePayload {
  blockedUntil: number;
  message?: string | null;
  consecutiveFailures: number;
}

interface BackendConnectionState {
  status: BackendConnectionStatus;
  blockedUntil: number | null;
  lastErrorMessage: string | null;
  consecutiveFailures: number;
  markOffline: (payload: MarkOfflinePayload) => void;
  markOnline: () => void;
}

export const useBackendConnectionStore = create<BackendConnectionState>()(
  (set) => ({
    status: "online",
    blockedUntil: null,
    lastErrorMessage: null,
    consecutiveFailures: 0,

    markOffline: ({ blockedUntil, message, consecutiveFailures }) =>
      set(() => ({
        status: "offline",
        blockedUntil,
        lastErrorMessage: message ?? null,
        consecutiveFailures,
      })),

    markOnline: () =>
      set(() => ({
        status: "online",
        blockedUntil: null,
        lastErrorMessage: null,
        consecutiveFailures: 0,
      })),
  }),
);
