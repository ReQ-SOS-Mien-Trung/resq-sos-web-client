import { create } from "zustand";

export interface BroadcastAlertData {
  id: number;
  title: string;
  type: string;
  body: string;
  sentAt: string;
}

interface BroadcastAlertState {
  /** Currently displayed alert (null = no overlay) */
  activeAlert: BroadcastAlertData | null;
  /** Queue of alerts waiting to be shown */
  queue: BroadcastAlertData[];

  showAlert: (alert: BroadcastAlertData) => void;
  dismissAlert: () => void;
}

export const useBroadcastAlertStore = create<BroadcastAlertState>()(
  (set, get) => ({
    activeAlert: null,
    queue: [],

    showAlert: (alert) => {
      const { activeAlert } = get();
      if (activeAlert) {
        // Queue it if one is already showing
        set((s) => ({ queue: [...s.queue, alert] }));
      } else {
        set({ activeAlert: alert });
      }
    },

    dismissAlert: () => {
      const { queue } = get();
      if (queue.length > 0) {
        const [next, ...rest] = queue;
        set({ activeAlert: next, queue: rest });
      } else {
        set({ activeAlert: null });
      }
    },
  }),
);
