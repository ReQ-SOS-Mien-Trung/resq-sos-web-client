// Coordinator Dashboard Types - ReQ-SOS Mien Trung
// Based on the Hybrid Logic: Backend (PostGIS + Gemini AI)

export type Priority = "P1" | "P2" | "P3";
export type RescuerType = "TRUCK" | "MOTORBOAT" | "SMALL_BOAT";
export type SOSStatus = "PENDING" | "ASSIGNED" | "RESCUED";
export type RescuerStatus = "AVAILABLE" | "BUSY";

export interface Location {
  lat: number;
  lng: number;
}

export interface SOSRequest {
  id: string;
  groupId: string; // Family ID - for logical grouping
  location: Location;
  priority: Priority;
  needs: {
    medical: boolean;
    food: boolean;
    boat: boolean;
  };
  status: SOSStatus;
  message: string; // e.g., "Water at roof level, pregnant wife"
  createdAt: Date;
  aiAnalysis?: {
    riskFactors: string[]; // ["Deep Water", "Medical Emergency"]
  };
}

export interface Rescuer {
  id: string;
  name: string;
  type: RescuerType;
  status: RescuerStatus;
  location: Location;
  currentLoad: number;
  capacity: number;
  capabilities: string[]; // ["MEDIC", "SWIMMER"]
}

export interface Depot {
  id: string;
  name: string;
  location: Location;
  inventory: {
    lifeJackets: number;
    foodPacks: number;
    medKits: number;
  };
}

// Cluster for map display (DBSCAN spatial clustering)
export interface SOSCluster {
  id: string;
  center: Location;
  sosRequests: SOSRequest[];
  highestPriority: Priority;
  totalVictims: number;
}

// AI Dispatch Decision
export interface AIDispatchDecision {
  clusterId: string;
  situation: string;
  reasoning: string;
  proposedPlan: MissionStep[];
  recommendedRescuer: Rescuer;
  alternativeRescuers: Rescuer[];
  confidence: number; // 0-100
}

export interface MissionStep {
  stepNumber: number;
  action:
    | "PICKUP_SUPPLIES"
    | "GO_TO_VICTIM"
    | "TRANSPORT_TO_SAFETY"
    | "RETURN_TO_BASE";
  location: Location;
  locationName: string;
  details: string;
  estimatedTime: number; // minutes
}

export interface Mission {
  id: string;
  rescuerId: string;
  clusterId: string;
  sosRequestIds: string[];
  status: "PENDING_APPROVAL" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  steps: MissionStep[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Map state
export interface MapViewState {
  center: Location;
  zoom: number;
}
