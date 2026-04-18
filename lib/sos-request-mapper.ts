import { deriveSOSNeeds } from "@/lib/sos";
import type { SOSRequest } from "@/type";
import type {
  SOSPriorityLevel,
  SOSRequestEntity,
  SOSRequestStatus,
} from "@/services/sos_request/type";

export function mapSOSPriorityLevelToPriority(
  level: SOSPriorityLevel,
): "P1" | "P2" | "P3" | "P4" {
  if (level === "Critical") return "P1";
  if (level === "High") return "P2";
  if (level === "Medium") return "P3";
  return "P4";
}

export function mapSOSRequestStatusToStatus(
  status: SOSRequestStatus,
): "PENDING" | "ASSIGNED" | "RESCUED" {
  if (status === "Pending") return "PENDING";

  if (
    status === "InProgress" ||
    status === "Assigned" ||
    status === "Incident"
  ) {
    return "ASSIGNED";
  }

  if (
    status === "Resolved" ||
    status === "Completed" ||
    status === "Cancelled"
  ) {
    return "RESCUED";
  }

  return "RESCUED";
}

export function mapSOSRequestEntityToSOS(entity: SOSRequestEntity): SOSRequest {
  const structuredData = entity.structuredData;
  const victimInfo = entity.victimInfo ?? null;
  // Prefer explicit reporter info. Keep senderInfo as backward-compatible fallback.
  const reporterInfo = entity.reporterInfo ?? entity.senderInfo ?? null;
  const networkMetadata = entity.networkMetadata;
  const supplies = structuredData?.supplies ?? [];
  const supplyDetails = structuredData?.supply_details;
  const createdAt = new Date(entity.createdAt);
  const computedWaitTimeMinutes =
    entity.waitTimeMinutes ??
    Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60000));
  const needs = deriveSOSNeeds(structuredData, entity.sosType);

  return {
    id: String(entity.id),
    groupId: entity.clusterId ? String(entity.clusterId) : String(entity.id),
    location: { lat: entity.latitude, lng: entity.longitude },
    priority: mapSOSPriorityLevelToPriority(entity.priorityLevel),
    needs,
    status: mapSOSRequestStatusToStatus(entity.status),
    message: entity.msg,
    createdAt,
    receivedAt: entity.receivedAt ? new Date(entity.receivedAt) : null,
    peopleCount: structuredData?.people_count,
    injuredPersons: structuredData?.injured_persons?.map((person) => ({
      index: person.index,
      name: person.name,
      customName: person.custom_name,
      personType: person.person_type,
      medicalIssues: person.medical_issues,
      severity: person.severity,
    })),
    waitTimeMinutes: computedWaitTimeMinutes,
    sosType: entity.sosType ?? undefined,
    situation: structuredData?.situation,
    medicalIssues: structuredData?.medical_issues,
    supplies: supplies.length > 0 ? supplies : undefined,
    canMove: structuredData?.can_move,
    hasInjured: structuredData?.has_injured,
    othersAreStable: structuredData?.others_are_stable,
    additionalDescription: structuredData?.additional_description ?? undefined,
    otherSupplyDescription:
      structuredData?.other_supply_description ?? undefined,
    structuredData,
    supplyDetails,
    specialDietPersons: supplyDetails?.special_diet_persons ?? undefined,
    clothingPersons: supplyDetails?.clothing_persons ?? undefined,
    medicalSupportNeeds: supplyDetails?.medical_needs ?? undefined,
    medicalDescription: supplyDetails?.medical_description ?? undefined,
    waterDuration: supplyDetails?.water_duration ?? undefined,
    waterRemaining: supplyDetails?.water_remaining ?? undefined,
    foodDuration: supplyDetails?.food_duration ?? undefined,
    areBlanketsEnough: supplyDetails?.are_blankets_enough,
    blanketRequestCount: supplyDetails?.blanket_request_count,
    address: structuredData?.address ?? undefined,
    victimPhone: victimInfo?.user_phone ?? undefined,
    victimName: victimInfo?.user_name ?? undefined,
    reporterPhone: reporterInfo?.user_phone ?? undefined,
    reporterName:
      reporterInfo?.user_name ?? entity.createdByCoordinatorName ?? undefined,
    createdByCoordinatorId: entity.createdByCoordinatorId ?? null,
    createdByCoordinatorName:
      entity.createdByCoordinatorName ??
      (entity as { createdByCoordinator?: { fullName?: string | null } })
        .createdByCoordinator?.fullName ??
      null,
    isSentOnBehalf:
      entity.isSentOnBehalf ?? Boolean(entity.createdByCoordinatorId),
    reporterIsOnline:
      reporterInfo?.is_online ?? entity.senderInfo?.is_online ?? undefined,
    hopCount: networkMetadata?.hop_count,
    locationAccuracy: entity.locationAccuracy,
  };
}

export function mapSOSRequestEntitiesToSOS(
  entities: SOSRequestEntity[],
): SOSRequest[] {
  return entities.map(mapSOSRequestEntityToSOS);
}
