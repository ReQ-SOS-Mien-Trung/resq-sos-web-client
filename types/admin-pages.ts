// User Management Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "coordinator" | "rescuer" | "citizen";
  status: "active" | "pending" | "banned" | "inactive";
  region: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface UserStats {
  total: number;
  active: number;
  pending: number;
  banned: number;
}

export interface UserFilters {
  role?: User["role"];
  status?: User["status"];
  region?: string;
  search?: string;
}

// Weather Posts Types
export interface WeatherPost {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  publishDate: string;
  scheduledDate?: string;
  status: "published" | "draft" | "scheduled";
  author: string;
  views: number;
  category: "weather" | "flood" | "alert" | "general";
}

// Weather & Flood Types
export interface WeatherData {
  region: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  windSpeed: number;
  condition: "sunny" | "cloudy" | "rainy" | "stormy";
  timestamp: string;
}

export interface FloodAlert {
  id: string;
  region: string;
  level: "low" | "medium" | "high" | "critical";
  status: "active" | "resolved" | "monitoring";
  description: string;
  coordinates: { lat: number; lng: number };
  createdAt: string;
  updatedAt: string;
  affectedAreas: string[];
}

// Reports Types
export interface RescueReport {
  id: string;
  title: string;
  type: "rescue" | "evacuation" | "supply" | "medical" | "other";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  location: string;
  region: string;
  date: string;
  reporter: string;
  description: string;
  casualties?: number;
  rescued?: number;
  fileUrl?: string;
}

export interface ReportStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

// Rescuer Registration Types
export interface RescuerRegistration {
  id: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  experience: string;
  skills: string[];
  documents: {
    id: string;
    type: "id" | "certificate" | "license" | "other";
    url: string;
    name: string;
  }[];
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  notes?: string;
}

// AI Prompt Types
export interface AIPrompt {
  id: string;
  name: string;
  category: "dispatch" | "classification" | "recommendation" | "other";
  prompt: string;
  variables: string[];
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  testResults?: {
    input: string;
    output: string;
    timestamp: string;
  }[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  category: AIPrompt["category"];
  template: string;
  description: string;
}

// Chat Config Types
export interface ChatRoom {
  id: string;
  name: string;
  type: "public" | "private" | "support";
  status: "active" | "inactive" | "archived";
  participants: number;
  lastMessage?: string;
  lastMessageAt?: string;
  settings: {
    autoReply: boolean;
    maxParticipants?: number;
    allowFileUpload: boolean;
    moderation: boolean;
  };
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: "greeting" | "response" | "escalation" | "closing";
  variables?: string[];
}

export interface AutoReplyRule {
  id: string;
  trigger: string;
  response: string;
  priority: number;
  enabled: boolean;
}

// Rescuer Verification Types
export interface RescuerVerification {
  id: string;
  rescuerId: string;
  rescuerName: string;
  email: string;
  phone: string;
  region: string;
  status: "pending" | "verified" | "rejected";
  documents: {
    id: string;
    type: "id" | "certificate" | "license" | "background-check" | "other";
    url: string;
    name: string;
    verified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
  }[];
  profile: {
    experience: string;
    skills: string[];
    certifications: string[];
    previousWork?: string;
  };
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  comments?: string;
  history: {
    action: "submitted" | "reviewed" | "approved" | "rejected" | "updated";
    timestamp: string;
    by?: string;
    note?: string;
  }[];
}
