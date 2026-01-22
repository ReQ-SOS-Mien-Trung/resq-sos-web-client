interface Ticker {
  market: {
    name: string;
  };
  base: string;
  target: string;
  converted_last: {
    usd: number;
  };
  timestamp: string;
  trade_url: string;
}

type Period =
  | "daily"
  | "weekly"
  | "monthly"
  | "3months"
  | "6months"
  | "yearly"
  | "max";

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
  groupId: string;
  location: Location;
  priority: Priority;
  needs: {
    medical: boolean;
    food: boolean;
    boat: boolean;
  };
  status: SOSStatus;
  message: string;
  createdAt: Date;
  aiAnalysis?: {
    riskFactors: string[];
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
  capabilities: string[];
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

export type SOSItem = {
  image: string;
  title: string;
  slug: string;
  location: string;
  date: string;
  time: string;
};

export interface CalendarWidgetProps {
  data: CalendarData;
}