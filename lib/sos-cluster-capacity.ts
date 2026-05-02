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

export const SOS_PRIORITY_TO_CLUSTER_SEVERITY: Record<
  Priority,
  ClusterSeverityLevel
> = {
  P1: "Critical",
  P2: "High",
  P3: "Medium",
  P4: "Low",
};

export const CLUSTER_SEVERITY_TO_SOS_PRIORITY: Record<
  ClusterSeverityLevel,
  Priority
> = {
  Critical: "P1",
  High: "P2",
  Medium: "P3",
  Low: "P4",
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

export function getSOSPriorityForClusterSeverity(
  severityLevel: ClusterSeverityLevel,
): Priority {
  return CLUSTER_SEVERITY_TO_SOS_PRIORITY[severityLevel] ?? "P3";
}

export function getClusterSeverityForSOSPriority(
  priority: Priority,
): ClusterSeverityLevel {
  return SOS_PRIORITY_TO_CLUSTER_SEVERITY[priority] ?? "Medium";
}

export function isSOSPriorityCompatibleWithClusterSeverity(
  priority: Priority,
  severityLevel: ClusterSeverityLevel,
): boolean {
  return getClusterSeverityForSOSPriority(priority) === severityLevel;
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
