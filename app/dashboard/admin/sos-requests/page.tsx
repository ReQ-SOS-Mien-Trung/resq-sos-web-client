"use client";

import { useEffect, useMemo, useState } from "react";
import { getDashboardData } from "@/lib/mock-data/admin-dashboard";
import { DashboardLayout } from "@/components/admin/dashboard";
import {
  SOSClusterTable,
  SOSRequestStats,
} from "@/components/admin/sos-requests";
import SOSDetailsPanel from "@/components/coordinator/SOSDetailsPanel";
import RescuePlanPanel from "@/components/coordinator/RescuePlanPanel";
import { useSOSRequestsByIds } from "@/services/sos_request/hooks";
import { useSOSClusters } from "@/services/sos_cluster/hooks";
import type { SOSRequestEntity } from "@/services/sos_request/type";
import type { ClusterLifecycleStatus } from "@/services/sos_cluster/type";
import { mapSOSRequestEntityToSOS } from "@/lib/sos-request-mapper";
import { Siren } from "@phosphor-icons/react";

function resolveClusterStatus(
  status: ClusterLifecycleStatus | string,
): ClusterLifecycleStatus {
  if (
    status === "Pending" ||
    status === "Suggested" ||
    status === "InProgress" ||
    status === "Completed"
  ) {
    return status;
  }

  return "Pending";
}

const SOSRequestsPage = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    getDashboardData().then(setDashboardData).catch(console.error);
  }, []);

  const [expandedClusterIds, setExpandedClusterIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedPlanClusterId, setSelectedPlanClusterId] = useState<
    number | null
  >(null);
  const [rescuePlanOpen, setRescuePlanOpen] = useState(false);
  const [selectedSOS, setSelectedSOS] = useState<SOSRequestEntity | null>(null);

  const {
    data: clustersData,
    isLoading: isClustersLoading,
    isRefetching: isClustersRefetching,
  } = useSOSClusters();

  const clusters = useMemo(() => clustersData?.clusters ?? [], [clustersData]);

  const requestedClusterIds = useMemo(() => {
    const next = new Set<number>(expandedClusterIds);

    if (rescuePlanOpen && selectedPlanClusterId != null) {
      next.add(selectedPlanClusterId);
    }

    if (selectedSOS?.clusterId != null) {
      next.add(selectedSOS.clusterId);
    }

    return next;
  }, [expandedClusterIds, rescuePlanOpen, selectedPlanClusterId, selectedSOS]);

  const requestedSOSIds = useMemo(() => {
    const ids = new Set<number>();

    for (const cluster of clusters) {
      if (!requestedClusterIds.has(cluster.id)) {
        continue;
      }

      for (const sosId of cluster.sosRequestIds) {
        ids.add(sosId);
      }
    }

    return Array.from(ids);
  }, [clusters, requestedClusterIds]);

  const {
    byId: loadedSOSById,
    items: loadedSOSItems,
    failedIds: failedSOSIds,
    isLoading: isLoadedSOSLoading,
    isFetching: isLoadedSOSFetching,
  } = useSOSRequestsByIds(requestedSOSIds, {
    enabled: requestedSOSIds.length > 0,
  });

  const failedSOSIdSet = useMemo(() => new Set(failedSOSIds), [failedSOSIds]);

  const clusterSOSMap = useMemo(() => {
    const map = new Map<number, SOSRequestEntity[]>();

    for (const cluster of clusters) {
      const sosItems = cluster.sosRequestIds
        .map((sosId) => loadedSOSById.get(sosId))
        .filter((item): item is SOSRequestEntity => item != null);

      map.set(cluster.id, sosItems);
    }

    return map;
  }, [clusters, loadedSOSById]);

  const clusterSOSLoadingMap = useMemo(() => {
    const map = new Map<number, boolean>();

    for (const cluster of clusters) {
      const isRequested = requestedClusterIds.has(cluster.id);
      map.set(
        cluster.id,
        isRequested && (isLoadedSOSLoading || isLoadedSOSFetching),
      );
    }

    return map;
  }, [clusters, isLoadedSOSFetching, isLoadedSOSLoading, requestedClusterIds]);

  const clusterSOSFailedIdsMap = useMemo(() => {
    const map = new Map<number, number[]>();

    for (const cluster of clusters) {
      if (!requestedClusterIds.has(cluster.id)) {
        map.set(cluster.id, []);
        continue;
      }

      map.set(
        cluster.id,
        cluster.sosRequestIds.filter((sosId) => failedSOSIdSet.has(sosId)),
      );
    }

    return map;
  }, [clusters, failedSOSIdSet, requestedClusterIds]);

  const stats = useMemo(() => {
    const pending = clusters.filter(
      (cluster) => resolveClusterStatus(cluster.status) === "Pending",
    ).length;
    const inProgress = clusters.filter(
      (cluster) => resolveClusterStatus(cluster.status) === "InProgress",
    ).length;
    const suggested = clusters.filter(
      (cluster) => resolveClusterStatus(cluster.status) === "Suggested",
    ).length;
    const completed = clusters.filter(
      (cluster) => resolveClusterStatus(cluster.status) === "Completed",
    ).length;

    return {
      total: clusters.length,
      pending,
      inProgress,
      completed,
      cancelled: suggested,
    };
  }, [clusters]);

  const selectedSOSModel = useMemo(
    () => (selectedSOS ? mapSOSRequestEntityToSOS(selectedSOS) : null),
    [selectedSOS],
  );

  const selectedSOSClusterItems = useMemo(() => {
    const clusterId = selectedSOS?.clusterId;
    if (clusterId == null) {
      return [];
    }

    return clusterSOSMap.get(clusterId) ?? [];
  }, [selectedSOS, clusterSOSMap]);

  const nearbySOSRequests = useMemo(() => {
    if (!selectedSOSModel) {
      return [];
    }

    return selectedSOSClusterItems
      .filter((item) => item.id !== Number(selectedSOSModel.id))
      .map(mapSOSRequestEntityToSOS);
  }, [selectedSOSClusterItems, selectedSOSModel]);

  const allLoadedSOSRequests = useMemo(
    () => loadedSOSItems.map(mapSOSRequestEntityToSOS),
    [loadedSOSItems],
  );

  const selectedPlanCluster = useMemo(
    () =>
      selectedPlanClusterId == null
        ? null
        : (clusters.find((cluster) => cluster.id === selectedPlanClusterId) ??
          null),
    [clusters, selectedPlanClusterId],
  );

  const rescuePlanClusterSOSRequests = useMemo(() => {
    if (!selectedPlanCluster) {
      return [];
    }

    return selectedPlanCluster.sosRequestIds
      .map((sosId) => loadedSOSById.get(sosId))
      .filter((item): item is SOSRequestEntity => item != null)
      .map(mapSOSRequestEntityToSOS);
  }, [selectedPlanCluster, loadedSOSById]);

  const handleToggleCluster = (clusterId: number) => {
    setExpandedClusterIds((previous) => {
      const next = new Set(previous);

      if (next.has(clusterId)) {
        next.delete(clusterId);
      } else {
        next.add(clusterId);
      }

      return next;
    });
  };

  const handleViewCompletedClusterPlan = (clusterId: number) => {
    setSelectedSOS(null);
    setSelectedPlanClusterId(clusterId);
    setRescuePlanOpen(true);
  };

  return (
    <DashboardLayout
      favorites={dashboardData?.favorites ?? []}
      projects={dashboardData?.projects ?? []}
      cloudStorage={
        dashboardData?.cloudStorage ?? {
          used: 0,
          total: 0,
          percentage: 0,
          unit: "GB",
        }
      }
    >
      <div className="relative space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Siren size={24} className="text-foreground" weight="fill" />
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Quản lý yêu cầu
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tighter text-foreground leading-tight">
              Quản lý cụm SOS và yêu cầu chi tiết
            </h1>
            <p className="text-[16px] tracking-tighter text-muted-foreground mt-1.5">
              Theo dõi cụm SOS theo vòng đời, mở rộng để xem từng yêu cầu và xem
              lại kế hoạch cụm đã hoàn thành.
            </p>
          </div>
        </div>

        <SOSRequestStats stats={stats} />

        <SOSClusterTable
          clusters={clusters}
          isLoading={isClustersLoading}
          isRefetching={isClustersRefetching}
          expandedClusterIds={expandedClusterIds}
          onToggleCluster={handleToggleCluster}
          clusterSOSMap={clusterSOSMap}
          clusterSOSLoadingMap={clusterSOSLoadingMap}
          clusterSOSFailedIdsMap={clusterSOSFailedIdsMap}
          onSOSSelect={setSelectedSOS}
          onViewCompletedClusterPlan={handleViewCompletedClusterPlan}
        />

        <SOSDetailsPanel
          open={!!selectedSOSModel}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSOS(null);
            }
          }}
          sosRequest={selectedSOSModel}
          onProcessSOS={() => {
            // Admin view is read-only for SOS processing actions.
          }}
          isProcessing={false}
          nearbySOSRequests={nearbySOSRequests}
          allSOSRequests={allLoadedSOSRequests}
          hideProcessAction
        />

        <RescuePlanPanel
          open={rescuePlanOpen}
          onOpenChange={setRescuePlanOpen}
          clusterSOSRequests={rescuePlanClusterSOSRequests}
          clusterId={selectedPlanClusterId}
          rescueSuggestion={null}
          onApprove={() => {
            setRescuePlanOpen(false);
          }}
          onReAnalyze={() => {
            // Admin view is read-only for completed mission plans.
          }}
          isReAnalyzing={false}
          defaultTab="missions"
          readOnly
        />
      </div>
    </DashboardLayout>
  );
};

export default SOSRequestsPage;
