// Mock Data for Coordinator Dashboard - ReQ-SOS Mien Trung
// Central Vietnam disaster relief coordination

import {
  SOSRequest,
  Rescuer,
  Depot,
  SOSCluster,
  AIDispatchDecision,
  Mission,
} from "@/types/coordinator";

// Central Vietnam coordinates (Hue area)
const BASE_LAT = 16.4637;
const BASE_LNG = 107.5909;

// Helper to create dates relative to page load (client-side safe)
function minutesAgo(minutes: number): Date {
  // Use a fixed reference time for SSR, will be updated on client
  const baseTime = new Date("2026-01-15T10:00:00Z");
  return new Date(baseTime.getTime() - minutes * 60000);
}

export const mockSOSRequests: SOSRequest[] = [
  {
    id: "sos-001",
    groupId: "family-001",
    location: { lat: BASE_LAT + 0.012, lng: BASE_LNG + 0.008 },
    priority: "P1",
    needs: { medical: true, food: true, boat: true },
    status: "PENDING",
    message: "Nước ngập đến mái nhà, có bà bầu 8 tháng cần cấp cứu",
    createdAt: minutesAgo(45),
    aiAnalysis: {
      riskFactors: ["Deep Water > 2m", "Medical Emergency", "Pregnant Woman"],
    },
  },
  {
    id: "sos-002",
    groupId: "family-001",
    location: { lat: BASE_LAT + 0.013, lng: BASE_LNG + 0.009 },
    priority: "P1",
    needs: { medical: false, food: true, boat: true },
    status: "PENDING",
    message: "Nhà bên cạnh, có 2 người già cần di dời",
    createdAt: minutesAgo(40),
    aiAnalysis: {
      riskFactors: ["Deep Water > 2m", "Elderly Victims"],
    },
  },
  {
    id: "sos-003",
    groupId: "family-002",
    location: { lat: BASE_LAT - 0.015, lng: BASE_LNG + 0.02 },
    priority: "P2",
    needs: { medical: false, food: true, boat: false },
    status: "PENDING",
    message: "Gia đình 5 người, nước ngập tầng 1, cần thực phẩm",
    createdAt: minutesAgo(120),
    aiAnalysis: {
      riskFactors: ["Moderate Flood Level", "Food Shortage"],
    },
  },
  {
    id: "sos-004",
    groupId: "family-003",
    location: { lat: BASE_LAT + 0.025, lng: BASE_LNG - 0.01 },
    priority: "P2",
    needs: { medical: true, food: false, boat: true },
    status: "ASSIGNED",
    message: "Có người bị thương do mảnh vỡ, cần y tế",
    createdAt: minutesAgo(90),
    aiAnalysis: {
      riskFactors: ["Injury", "Deep Water", "Medical Attention Required"],
    },
  },
  {
    id: "sos-005",
    groupId: "family-004",
    location: { lat: BASE_LAT - 0.008, lng: BASE_LNG - 0.015 },
    priority: "P3",
    needs: { medical: false, food: true, boat: false },
    status: "PENDING",
    message: "Cần hỗ trợ thực phẩm, nước rút được một phần",
    createdAt: minutesAgo(180),
    aiAnalysis: {
      riskFactors: ["Low Flood Level", "Supply Needed"],
    },
  },
  {
    id: "sos-006",
    groupId: "family-005",
    location: { lat: BASE_LAT + 0.03, lng: BASE_LNG + 0.025 },
    priority: "P1",
    needs: { medical: true, food: true, boat: true },
    status: "PENDING",
    message: "Trẻ em bị sốt cao, nước dâng nhanh",
    createdAt: minutesAgo(30),
    aiAnalysis: {
      riskFactors: ["Rising Water", "Child Medical Emergency", "Urgent"],
    },
  },
  {
    id: "sos-007",
    groupId: "family-006",
    location: { lat: BASE_LAT - 0.02, lng: BASE_LNG + 0.03 },
    priority: "P2",
    needs: { medical: false, food: true, boat: true },
    status: "PENDING",
    message: "Nhà bị cô lập, cần thuyền để di chuyển",
    createdAt: minutesAgo(150),
    aiAnalysis: {
      riskFactors: ["Isolated Location", "Boat Required"],
    },
  },
  {
    id: "sos-008",
    groupId: "family-007",
    location: { lat: BASE_LAT + 0.005, lng: BASE_LNG - 0.025 },
    priority: "P3",
    needs: { medical: false, food: true, boat: false },
    status: "RESCUED",
    message: "Đã được hỗ trợ, cảm ơn đội cứu hộ",
    createdAt: minutesAgo(240),
    aiAnalysis: {
      riskFactors: ["Stable Condition"],
    },
  },
];

export const mockRescuers: Rescuer[] = [
  {
    id: "rescuer-001",
    name: "Đội Cứu Hộ Alpha",
    type: "MOTORBOAT",
    status: "AVAILABLE",
    location: { lat: BASE_LAT - 0.005, lng: BASE_LNG + 0.003 },
    currentLoad: 0,
    capacity: 8,
    capabilities: ["SWIMMER", "MEDIC"],
  },
  {
    id: "rescuer-002",
    name: "Xe Tải Bravo",
    type: "TRUCK",
    status: "AVAILABLE",
    location: { lat: BASE_LAT + 0.002, lng: BASE_LNG - 0.005 },
    currentLoad: 2,
    capacity: 15,
    capabilities: ["HEAVY_LOAD"],
  },
  {
    id: "rescuer-003",
    name: "Thuyền Nhỏ Charlie",
    type: "SMALL_BOAT",
    status: "BUSY",
    location: { lat: BASE_LAT + 0.018, lng: BASE_LNG - 0.012 },
    currentLoad: 3,
    capacity: 4,
    capabilities: ["SWIMMER", "SHALLOW_WATER"],
  },
  {
    id: "rescuer-004",
    name: "Đội Y Tế Delta",
    type: "MOTORBOAT",
    status: "AVAILABLE",
    location: { lat: BASE_LAT - 0.01, lng: BASE_LNG + 0.015 },
    currentLoad: 1,
    capacity: 6,
    capabilities: ["MEDIC", "SWIMMER", "EMERGENCY_CARE"],
  },
  {
    id: "rescuer-005",
    name: "Xe Cứu Trợ Echo",
    type: "TRUCK",
    status: "BUSY",
    location: { lat: BASE_LAT - 0.022, lng: BASE_LNG + 0.028 },
    currentLoad: 10,
    capacity: 12,
    capabilities: ["HEAVY_LOAD", "SUPPLY_TRANSPORT"],
  },
];

export const mockDepots: Depot[] = [
  {
    id: "depot-001",
    name: "Kho Trung Tâm Huế",
    location: { lat: BASE_LAT, lng: BASE_LNG },
    inventory: { lifeJackets: 150, foodPacks: 500, medKits: 75 },
  },
  {
    id: "depot-002",
    name: "Điểm Tập Kết Phú Bài",
    location: { lat: BASE_LAT - 0.03, lng: BASE_LNG + 0.04 },
    inventory: { lifeJackets: 80, foodPacks: 300, medKits: 40 },
  },
  {
    id: "depot-003",
    name: "Kho Dự Trữ Hương Thủy",
    location: { lat: BASE_LAT + 0.02, lng: BASE_LNG - 0.035 },
    inventory: { lifeJackets: 50, foodPacks: 200, medKits: 25 },
  },
];

// Clustered SOS for map display
export const mockSOSClusters: SOSCluster[] = [
  {
    id: "cluster-001",
    center: { lat: BASE_LAT + 0.0125, lng: BASE_LNG + 0.0085 },
    sosRequests: mockSOSRequests.filter((s) => s.groupId === "family-001"),
    highestPriority: "P1",
    totalVictims: 5,
  },
  {
    id: "cluster-002",
    center: { lat: BASE_LAT - 0.015, lng: BASE_LNG + 0.02 },
    sosRequests: mockSOSRequests.filter((s) => s.groupId === "family-002"),
    highestPriority: "P2",
    totalVictims: 5,
  },
  {
    id: "cluster-003",
    center: { lat: BASE_LAT + 0.03, lng: BASE_LNG + 0.025 },
    sosRequests: mockSOSRequests.filter((s) => s.groupId === "family-005"),
    highestPriority: "P1",
    totalVictims: 3,
  },
];

// AI Dispatch Decision Example
export const mockAIDecision: AIDispatchDecision = {
  clusterId: "cluster-001",
  situation:
    "Mực nước > 2m, có phụ nữ mang thai và người già trong khu vực ngập sâu.",
  reasoning:
    "Xe tải không thể tiếp cận do nước sâu. Đã chọn Đội Cứu Hộ Alpha (Thuyền máy) vì có khả năng y tế và đủ sức chứa cho 5 nạn nhân.",
  proposedPlan: [
    {
      stepNumber: 1,
      action: "PICKUP_SUPPLIES",
      location: { lat: BASE_LAT, lng: BASE_LNG },
      locationName: "Kho Trung Tâm Huế",
      details: "Lấy 5 áo phao, 2 bộ kit y tế",
      estimatedTime: 10,
    },
    {
      stepNumber: 2,
      action: "GO_TO_VICTIM",
      location: { lat: BASE_LAT + 0.0125, lng: BASE_LNG + 0.0085 },
      locationName: "Cụm SOS #001",
      details: "Di chuyển đến vị trí nạn nhân",
      estimatedTime: 15,
    },
    {
      stepNumber: 3,
      action: "TRANSPORT_TO_SAFETY",
      location: { lat: BASE_LAT - 0.005, lng: BASE_LNG + 0.01 },
      locationName: "Điểm An Toàn A",
      details: "Đưa 5 nạn nhân đến nơi an toàn, ưu tiên phụ nữ mang thai",
      estimatedTime: 20,
    },
    {
      stepNumber: 4,
      action: "RETURN_TO_BASE",
      location: { lat: BASE_LAT, lng: BASE_LNG },
      locationName: "Kho Trung Tâm Huế",
      details: "Quay về điểm xuất phát",
      estimatedTime: 15,
    },
  ],
  recommendedRescuer: mockRescuers[0],
  alternativeRescuers: [mockRescuers[3]],
  confidence: 92,
};

export const mockActiveMissions: Mission[] = [
  {
    id: "mission-001",
    rescuerId: "rescuer-003",
    clusterId: "cluster-003",
    sosRequestIds: ["sos-004"],
    status: "IN_PROGRESS",
    steps: [
      {
        stepNumber: 1,
        action: "GO_TO_VICTIM",
        location: { lat: BASE_LAT + 0.025, lng: BASE_LNG - 0.01 },
        locationName: "Vị trí SOS #004",
        details: "Di chuyển đến vị trí có người bị thương",
        estimatedTime: 12,
      },
      {
        stepNumber: 2,
        action: "TRANSPORT_TO_SAFETY",
        location: { lat: BASE_LAT, lng: BASE_LNG },
        locationName: "Bệnh viện Dã Chiến",
        details: "Đưa nạn nhân đến điểm y tế",
        estimatedTime: 18,
      },
    ],
    createdAt: minutesAgo(60),
    startedAt: minutesAgo(45),
  },
];

// Helper function to get time elapsed string
export function getTimeElapsed(date: Date): string {
  if (typeof window === "undefined") return "";
  const now = Date.now();
  const minutes = Math.floor((now - date.getTime()) / 60000);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

// Helper function to get priority color
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "P1":
      return "bg-red-500";
    case "P2":
      return "bg-orange-500";
    case "P3":
      return "bg-yellow-500";
    default:
      return "bg-gray-500";
  }
}

export function getPriorityBorderColor(priority: string): string {
  switch (priority) {
    case "P1":
      return "border-red-500";
    case "P2":
      return "border-orange-500";
    case "P3":
      return "border-yellow-500";
    default:
      return "border-gray-500";
  }
}

export function getRescuerTypeIcon(type: string): string {
  switch (type) {
    case "TRUCK":
      return "🚚";
    case "MOTORBOAT":
      return "🚤";
    case "SMALL_BOAT":
      return "🛶";
    default:
      return "🚗";
  }
}
