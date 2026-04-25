import type { Priority } from "@/type";
import type {
  ClusterSeverityLevel,
  SOSClusterEntity,
} from "@/services/sos_cluster/type";

export const SOS_CLUSTER_MAX_SIZE_BY_PRIORITY: Record<Priority, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
};

export const SOS_CLUSTER_MAX_SIZE_BY_SEVERITY: Record<
  ClusterSeverityLevel,
  number
> = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
};

type ClusterCapacityInput = Pick<
  SOSClusterEntity,
  "severityLevel" | "sosRequestCount" | "sosRequestIds"
>;

export function getSOSClusterMaxSizeBySeverity(
  severityLevel: ClusterSeverityLevel,
): number {
  return SOS_CLUSTER_MAX_SIZE_BY_SEVERITY[severityLevel] ?? 3;
}

export function getSOSClusterRequestCount(
  cluster: Pick<SOSClusterEntity, "sosRequestCount" | "sosRequestIds">,
): number {
  const reportedCount = Number(cluster.sosRequestCount);
  const normalizedReportedCount =
    Number.isFinite(reportedCount) && reportedCount > 0
      ? Math.trunc(reportedCount)
      : 0;

  return Math.max(normalizedReportedCount, cluster.sosRequestIds.length);
}

export function getSOSClusterRemainingCapacity(
  cluster: ClusterCapacityInput,
): number {
  return Math.max(
    0,
    getSOSClusterMaxSizeBySeverity(cluster.severityLevel) -
      getSOSClusterRequestCount(cluster),
  );
}
