import type {
  ClusterSuggestedActivity,
  ClusterSuggestedResource,
  ClusterSupplyShortage,
} from "@/services/sos_cluster/type";

export type MissionType = "RESCUE" | "RESCUER" | "RELIEF" | "MIXED" | string;

export type MissionStatus =
  | "Planned"
  | "Pending"
  | "InProgress"
  | "Completed"
  | "Cancelled";

export type MissionActivityStatus =
  | "Planned"
  | "OnGoing"
  | "Succeed"
  | "PendingConfirmation"
  | "Failed"
  | "Cancelled";

export type ActivityStatus = MissionActivityStatus;

export type ActivityStatusInput = ActivityStatus | string;

export interface MissionTeam {
  missionTeamId: number;
  rescueTeamId: number;
  teamName: string | null;
  teamCode: string | null;
  assemblyPointName: string | null;
  teamType: string | null;
  status: string;
  teamStatus?: string | null;
  memberCount?: number | null;
  members?: MissionTeamMember[] | null;
  note?: string | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
  locationSource?: string | null;
  assignedAt: string;
  unassignedAt?: string | null;
}

export interface MissionTeamMember {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  rescuerType: string | null;
  roleInTeam: string | null;
  isLeader: boolean;
  status: string;
  checkedIn: boolean;
}

export interface MissionSupplyItem {
  itemId: number | null;
  itemName: string | null;
  quantity: number;
  unit: string;
  plannedPickupLotAllocations?: MissionSupplyLotAllocationRequest[] | null;
  pickupLotAllocations?: MissionSupplyLotAllocationRequest[] | null;
  actualDeliveredQuantity?: number | null;
}

export interface MissionActivity {
  id: number;
  step: number;
  activityCode: string;
  activityType: string;
  description: string;
  imageUrl?: string | null;
  priority: string | null;
  estimatedTime: number | null;
  sosRequestId: number | null;
  depotId: number | null;
  depotName: string | null;
  depotAddress: string | null;
  assemblyPointId?: number | null;
  assemblyPointName?: string | null;
  assemblyPointLatitude?: number | null;
  assemblyPointLongitude?: number | null;
  missionTeamId: number | null;
  target?: string | null;
  items?: unknown | null;
  suppliesToCollect: MissionSupplyItem[] | null;
  targetLatitude: number;
  targetLongitude: number;
  status: ActivityStatus;
  assignedAt: string;
  completedAt: string | null;
  completedBy?: string | null;
  lastDecisionBy?: string | null;
}

export interface MissionEntity {
  id: number;
  clusterId: number;
  missionType: MissionType | "Rescue" | "Rescuer";
  priorityScore: number;
  status: MissionStatus;
  startTime: string;
  expectedEndTime: string;
  isCompleted?: boolean | null;
  createdById?: string;
  createdAt: string;
  completedAt: string | null;
  activityCount: number;
  activities: MissionActivity[];
  teams?: MissionTeam[] | null;
  // AI suggestion fields (flat from backend)
  aiSuggestionId: number | null;
  suggestedMissionTitle: string | null;
  modelName?: string | null;
  suggestedMissionType: string | null;
  suggestedPriorityScore: number | null;
  suggestedSeverityLevel: string | null;
  aiConfidenceScore?: number | null;
  overallAssessment?: string | null;
  estimatedDuration?: string | null;
  specialNotes?: string | null;
  mixedRescueReliefWarning?: string | null;
  needsAdditionalDepot?: boolean | null;
  supplyShortages?: ClusterSupplyShortage[] | null;
  suggestedActivities?: ClusterSuggestedActivity[] | null;
  suggestedResources?: ClusterSuggestedResource[];
  aiCreatedAt?: string | null;
}

export interface GetMissionsResponse {
  missions: MissionEntity[];
}

export interface GetMissionsParams {
  clusterId: number;
}

export interface MissionSupplyLotAllocationRequest {
  lotId: number;
  quantityTaken: number;
  receivedDate: string;
  expiredDate: string;
  remainingQuantityAfterExecution: number;
}

export interface MissionSupplyReusableUnitRequest {
  reusableItemId: number;
  itemModelId: number;
  itemName: string;
  serialNumber: string;
  condition: string;
  note?: string | null;
}

export interface UpdateMissionActivityItemRequest {
  itemId: number | null;
  itemName: string | null;
  imageUrl?: string | null;
  quantity: number;
  unit: string;
  plannedPickupLotAllocations?: MissionSupplyLotAllocationRequest[];
  plannedPickupReusableUnits?: MissionSupplyReusableUnitRequest[];
  pickupLotAllocations?: MissionSupplyLotAllocationRequest[];
  pickedReusableUnits?: MissionSupplyReusableUnitRequest[];
  expectedReturnUnits?: MissionSupplyReusableUnitRequest[];
  returnedReusableUnits?: MissionSupplyReusableUnitRequest[];
  actualReturnedQuantity?: number;
  bufferRatio?: number;
  bufferQuantity?: number;
  bufferUsedQuantity?: number;
  bufferUsedReason?: string | null;
  actualDeliveredQuantity?: number;
}

export interface UpdateMissionActivityRequest {
  activityId: number;
  step: number;
  description: string;
  target: string;
  assemblyPointId?: number | null;
  targetLatitude?: number;
  targetLongitude?: number;
  items: UpdateMissionActivityItemRequest[];
}

export interface UpdateMissionRequest {
  missionType: MissionType;
  priorityScore: number;
  startTime: string;
  expectedEndTime: string;
  activities?: UpdateMissionActivityRequest[];
}

export interface UpdateMissionResponse {
  missionId: number;
  missionType: MissionType;
  priorityScore: number;
  startTime: string;
  expectedEndTime: string;
}

export interface UpdateMissionStatusRequest {
  status: MissionStatus;
}

export interface UpdateMissionStatusResponse {
  missionId: number;
  status: MissionStatus;
  isCompleted: boolean;
}

export interface CreateMissionActivityRequest {
  step: number;
  activityCode: string;
  activityType: string;
  description: string;
  priority: string;
  estimatedTime: number;
  sosRequestId: number | null;
  depotId: number | null;
  depotName: string | null;
  depotAddress: string | null;
  assemblyPointId?: number | null;
  assemblyPointName?: string | null;
  assemblyPointLatitude?: number | null;
  assemblyPointLongitude?: number | null;
  suppliesToCollect: CreateMissionSupplyRequest[];
  target: string;
  targetLatitude: number;
  targetLongitude: number;
  rescueTeamId?: number | null;
}

export interface CreateMissionSupplyRequest {
  id: number | null;
  name: string | null;
  quantity: number;
  unit: string;
}

export type CreateActivityResponse = MissionActivity;

export interface CreateMissionRequest {
  clusterId: number;
  aiSuggestionId?: number | null;
  missionType: MissionType;
  priorityScore: number;
  startTime: string;
  expectedEndTime: string;
  ignoreMixedMissionWarning?: boolean;
  overrideReason?: string | null;
  activities: CreateMissionActivityRequest[];
}

export interface CreateMissionResponse {
  missionId: number;
  clusterId: number;
  missionType: MissionType;
  status: string;
  activityCount: number;
  createdAt: string;
}

export interface UpdateActivityStatusRequest {
  status: ActivityStatusInput;
}

export interface UpdateActivityStatusResponse {
  activityId: number;
  status: ActivityStatus;
  decisionBy: string;
}

export interface UpdateActivityRequest {
  step: number;
  activityCode: string;
  activityType: string;
  description: string;
  target: string;
  items: string;
  targetLatitude: number;
  targetLongitude: number;
  rescueTeamId?: number | null;
}

export interface UpdateActivityResponse {
  activityId: number;
  missionId: number;
  step: number;
  activityType: string;
  description: string;
  status: ActivityStatus;
}

export interface ConfirmReturnConsumableItemRequest {
  itemModelId: number;
  quantity: number;
}

export interface ConfirmReturnReusableUnitRequest {
  reusableItemId: number;
  serialNumber: string;
  condition: string;
  note?: string | null;
}

export interface ConfirmReturnReusableItemRequest {
  itemModelId: number;
  quantity: number;
  units: ConfirmReturnReusableUnitRequest[];
}

export interface ConfirmReturnSuppliesRequest {
  discrepancyNote?: string | null;
  consumableItems: ConfirmReturnConsumableItemRequest[];
  reusableItems: ConfirmReturnReusableItemRequest[];
}

// ── Route types ──

export type RouteVehicle = "car" | "bike" | "taxi" | "hd";

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  maneuver: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  polyline: string;
}

export interface RouteData {
  totalDistanceMeters: number;
  totalDistanceText: string;
  totalDurationSeconds: number;
  totalDurationText: string;
  overviewPolyline: string;
  summary: string;
  steps: RouteStep[];
}

export interface ActivityRouteResponse {
  activityId: number;
  activityType: string;
  description: string;
  destinationLatitude: number;
  destinationLongitude: number;
  originLatitude: number;
  originLongitude: number;
  vehicle: RouteVehicle | string;
  status?: string | null;
  errorMessage?: string | null;
  route: RouteData | null;
}

export interface GetActivityRouteParams {
  missionId: number;
  activityId: number;
  originLat: number;
  originLng: number;
  vehicle?: RouteVehicle;
}

export interface MissionTeamRouteWaypoint {
  activityId: number;
  step: number;
  activityType: string;
  description: string;
  latitude: number;
  longitude: number;
}

export interface MissionTeamRouteLeg {
  segmentIndex?: number | null;
  fromStep?: number | null;
  toStep?: number | null;
  fromLatitude?: number | null;
  fromLongitude?: number | null;
  toLatitude?: number | null;
  toLongitude?: number | null;
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  overviewPolyline?: string | null;
  vehicleUsed?: RouteVehicle | string | null;
  status?: "OK" | "NO_ROUTE" | "FALLBACK" | string | null;
  errorMessage?: string | null;
}

export interface MissionTeamRouteResponse {
  status?: string | null;
  errorMessage?: string | null;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  overviewPolyline?: string | null;
  waypoints: MissionTeamRouteWaypoint[];
  legs: MissionTeamRouteLeg[];
}

export interface GetMissionTeamRouteParams {
  missionId: number;
  missionTeamId: number;
  originLat: number;
  originLng: number;
  vehicle?: RouteVehicle;
}
