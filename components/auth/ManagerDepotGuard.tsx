"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PageLoading } from "@/components/admin";
import {
  MANAGER_DEPOT_SELECT_ROUTE,
  useManagerDepot,
} from "@/hooks/use-manager-depot";

const DEPOT_MANAGER_NOT_ASSIGNED_PATH = "/depot-manager-not-assigned";

export function ManagerDepotGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isManager,
    isLoading,
    managedDepots,
    selectedDepot,
    requiresSelection,
  } = useManagerDepot();

  const isSelectPage = pathname === MANAGER_DEPOT_SELECT_ROUTE;
  const isNotAssignedPage = pathname === DEPOT_MANAGER_NOT_ASSIGNED_PATH;

  useEffect(() => {
    if (!isManager || isLoading) {
      return;
    }

    if (managedDepots.length === 0) {
      if (!isNotAssignedPage) {
        router.replace(DEPOT_MANAGER_NOT_ASSIGNED_PATH);
        return;
      }
      return;
    }

    if (requiresSelection && !isSelectPage) {
      router.replace(MANAGER_DEPOT_SELECT_ROUTE);
      return;
    }

    if (selectedDepot && isNotAssignedPage) {
      router.replace("/dashboard/inventory");
    }
  }, [
    isLoading,
    isManager,
    isNotAssignedPage,
    isSelectPage,
    managedDepots.length,
    requiresSelection,
    router,
    selectedDepot,
  ]);

  if (!isManager) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <PageLoading />;
  }

  if (
    (managedDepots.length === 0 && !isNotAssignedPage) ||
    (requiresSelection && !isSelectPage) ||
    (selectedDepot && isNotAssignedPage)
  ) {
    return <PageLoading />;
  }

  return <>{children}</>;
}
