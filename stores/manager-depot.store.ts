import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface ManagerDepotState {
  selectedDepotId: number | null;
  setSelectedDepotId: (depotId: number) => void;
  clearSelection: () => void;
}

export const useManagerDepotStore = create<ManagerDepotState>()(
  devtools(
    persist(
      (set) => ({
        selectedDepotId: null,
        setSelectedDepotId: (depotId) =>
          set({ selectedDepotId: depotId }, false, "managerDepot/select"),
        clearSelection: () =>
          set({ selectedDepotId: null }, false, "managerDepot/clear"),
      }),
      {
        name: "manager-depot-storage",
      },
    ),
    { name: "ManagerDepotStore" },
  ),
);
