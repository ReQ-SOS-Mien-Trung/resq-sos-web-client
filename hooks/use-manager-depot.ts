"use client";

import { useEffect, useMemo } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useManagerDepotStore } from "@/stores/manager-depot.store";
import { useMyManagedDepots } from "@/services/depot";
import type { ManagedDepotSummary } from "@/services/depot";

export const MANAGER_DEPOT_SELECT_ROUTE = "/dashboard/inventory/select-depot";

export function useManagerDepot() {
  const user = useAuthStore((state) => state.user);
  const selectedDepotId = useManagerDepotStore((state) => state.selectedDepotId);
  const setSelectedDepotId = useManagerDepotStore(
    (state) => state.setSelectedDepotId,
  );
  const clearSelection = useManagerDepotStore((state) => state.clearSelection);

  const isManager = user?.roleId === 4;
  const fallbackManagedDepots = useMemo(
    () => user?.managedDepots ?? [],
    [user?.managedDepots],
  );
  const { data, isLoading, isFetching } = useMyManagedDepots({
    enabled: isManager,
  });

  const managedDepots = useMemo<ManagedDepotSummary[]>(
    () => data ?? fallbackManagedDepots,
    [data, fallbackManagedDepots],
  );

  const selectedDepot = useMemo(
    () =>
      managedDepots.find((depot) => depot.depotId === selectedDepotId) ?? null,
    [managedDepots, selectedDepotId],
  );

  useEffect(() => {
    if (!isManager) {
      clearSelection();
      return;
    }

    if (
      selectedDepotId != null &&
      managedDepots.length > 0 &&
      !managedDepots.some((depot) => depot.depotId === selectedDepotId)
    ) {
      clearSelection();
    }
  }, [clearSelection, isManager, managedDepots, selectedDepotId]);

  return {
    isManager,
    isLoading,
    isFetching,
    managedDepots,
    selectedDepot,
    selectedDepotId: selectedDepot?.depotId ?? null,
    hasMultipleDepots: managedDepots.length > 1,
    hasAssignedDepot: managedDepots.length > 0,
    requiresSelection:
      isManager && managedDepots.length > 0 && selectedDepot == null,
    selectDepot: setSelectedDepotId,
    clearSelection,
  };
}
