// Mock Data for Coordinator Dashboard - ReQ-SOS Mien Trung
// Central Vietnam disaster relief coordination

import {
  SOSRequest,
  Rescuer,
  Depot,
  SOSCluster,
  AIDispatchDecision,
  Mission,
  InventoryItem,
  InventoryCategory,
  SupplyRequest,
  Shipment,
  DepotInfo,
  ActivityLog,
} from "@/type";

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

// ==========================================
// INVENTORY MOCK DATA - Depot Manager Dashboard
// ==========================================

function daysAgo(days: number): Date {
  const baseTime = new Date("2026-01-15T10:00:00Z");
  return new Date(baseTime.getTime() - days * 24 * 60 * 60000);
}

function hoursAgo(hours: number): Date {
  const baseTime = new Date("2026-01-15T10:00:00Z");
  return new Date(baseTime.getTime() - hours * 60 * 60000);
}

export const mockInventoryItems: InventoryItem[] = [
  // Medical Items
  {
    id: "item-001",
    name: "Bộ Sơ Cứu Y Tế",
    category: "MEDICAL",
    sku: "MED-001",
    quantity: 15,
    unit: "bộ",
    minStock: 50,
    maxStock: 200,
    stockLevel: "CRITICAL",
    location: "A-01-01",
    lastUpdated: hoursAgo(2),
  },
  {
    id: "item-002",
    name: "Băng Gạc Vô Trùng",
    category: "MEDICAL",
    sku: "MED-002",
    quantity: 180,
    unit: "cuộn",
    minStock: 100,
    maxStock: 500,
    stockLevel: "NORMAL",
    location: "A-01-02",
    lastUpdated: hoursAgo(5),
  },
  {
    id: "item-003",
    name: "Thuốc Kháng Sinh",
    category: "MEDICAL",
    sku: "MED-003",
    quantity: 45,
    unit: "hộp",
    minStock: 80,
    maxStock: 300,
    stockLevel: "LOW",
    location: "A-01-03",
    expiryDate: daysAgo(-30), // Expires in 30 days
    lastUpdated: hoursAgo(12),
  },
  {
    id: "item-004",
    name: "Thuốc Hạ Sốt",
    category: "MEDICAL",
    sku: "MED-004",
    quantity: 200,
    unit: "hộp",
    minStock: 100,
    maxStock: 400,
    stockLevel: "NORMAL",
    location: "A-01-04",
    expiryDate: daysAgo(-90),
    lastUpdated: daysAgo(1),
  },
  // Food Items
  {
    id: "item-005",
    name: "Mì Gói Khẩn Cấp",
    category: "FOOD",
    sku: "FOOD-001",
    quantity: 500,
    unit: "thùng",
    minStock: 300,
    maxStock: 1000,
    stockLevel: "NORMAL",
    location: "B-02-01",
    expiryDate: daysAgo(-180),
    lastUpdated: hoursAgo(8),
  },
  {
    id: "item-006",
    name: "Gạo Đóng Gói 5kg",
    category: "FOOD",
    sku: "FOOD-002",
    quantity: 120,
    unit: "bao",
    minStock: 200,
    maxStock: 600,
    stockLevel: "LOW",
    location: "B-02-02",
    lastUpdated: daysAgo(2),
  },
  {
    id: "item-007",
    name: "Đồ Hộp Các Loại",
    category: "FOOD",
    sku: "FOOD-003",
    quantity: 350,
    unit: "lon",
    minStock: 200,
    maxStock: 800,
    stockLevel: "NORMAL",
    location: "B-02-03",
    expiryDate: daysAgo(-365),
    lastUpdated: hoursAgo(6),
  },
  {
    id: "item-008",
    name: "Sữa Hộp",
    category: "FOOD",
    sku: "FOOD-004",
    quantity: 80,
    unit: "thùng",
    minStock: 100,
    maxStock: 300,
    stockLevel: "LOW",
    location: "B-02-04",
    expiryDate: daysAgo(-60),
    lastUpdated: daysAgo(1),
  },
  // Water
  {
    id: "item-009",
    name: "Nước Đóng Chai 500ml",
    category: "WATER",
    sku: "WATER-001",
    quantity: 2000,
    unit: "chai",
    minStock: 1000,
    maxStock: 5000,
    stockLevel: "NORMAL",
    location: "C-01-01",
    lastUpdated: hoursAgo(4),
  },
  {
    id: "item-010",
    name: "Bình Nước Lọc 20L",
    category: "WATER",
    sku: "WATER-002",
    quantity: 50,
    unit: "bình",
    minStock: 100,
    maxStock: 300,
    stockLevel: "LOW",
    location: "C-01-02",
    lastUpdated: daysAgo(3),
  },
  // Equipment
  {
    id: "item-011",
    name: "Áo Phao Cứu Sinh",
    category: "EQUIPMENT",
    sku: "EQP-001",
    quantity: 8,
    unit: "cái",
    minStock: 100,
    maxStock: 300,
    stockLevel: "CRITICAL",
    location: "D-01-01",
    lastUpdated: hoursAgo(1),
  },
  {
    id: "item-012",
    name: "Đèn Pin LED",
    category: "EQUIPMENT",
    sku: "EQP-002",
    quantity: 150,
    unit: "cái",
    minStock: 50,
    maxStock: 200,
    stockLevel: "NORMAL",
    location: "D-01-02",
    lastUpdated: daysAgo(5),
  },
  {
    id: "item-013",
    name: "Pin AA",
    category: "EQUIPMENT",
    sku: "EQP-003",
    quantity: 500,
    unit: "viên",
    minStock: 200,
    maxStock: 1000,
    stockLevel: "NORMAL",
    location: "D-01-03",
    lastUpdated: daysAgo(2),
  },
  {
    id: "item-014",
    name: "Dây Thừng 50m",
    category: "EQUIPMENT",
    sku: "EQP-004",
    quantity: 25,
    unit: "cuộn",
    minStock: 30,
    maxStock: 100,
    stockLevel: "LOW",
    location: "D-01-04",
    lastUpdated: daysAgo(4),
  },
  // Shelter
  {
    id: "item-015",
    name: "Lều Cứu Trợ 4 Người",
    category: "SHELTER",
    sku: "SHL-001",
    quantity: 35,
    unit: "bộ",
    minStock: 50,
    maxStock: 150,
    stockLevel: "LOW",
    location: "E-01-01",
    lastUpdated: daysAgo(7),
  },
  {
    id: "item-016",
    name: "Bạt Che Mưa",
    category: "SHELTER",
    sku: "SHL-002",
    quantity: 100,
    unit: "tấm",
    minStock: 80,
    maxStock: 250,
    stockLevel: "NORMAL",
    location: "E-01-02",
    lastUpdated: daysAgo(3),
  },
  {
    id: "item-017",
    name: "Chăn Cứu Trợ",
    category: "SHELTER",
    sku: "SHL-003",
    quantity: 200,
    unit: "cái",
    minStock: 150,
    maxStock: 400,
    stockLevel: "NORMAL",
    location: "E-01-03",
    lastUpdated: daysAgo(1),
  },
  // Clothing
  {
    id: "item-018",
    name: "Áo Mưa",
    category: "CLOTHING",
    sku: "CLO-001",
    quantity: 300,
    unit: "cái",
    minStock: 200,
    maxStock: 600,
    stockLevel: "NORMAL",
    location: "F-01-01",
    lastUpdated: hoursAgo(10),
  },
  {
    id: "item-019",
    name: "Ủng Cao Su",
    category: "CLOTHING",
    sku: "CLO-002",
    quantity: 50,
    unit: "đôi",
    minStock: 100,
    maxStock: 300,
    stockLevel: "LOW",
    location: "F-01-02",
    lastUpdated: daysAgo(6),
  },
  {
    id: "item-020",
    name: "Quần Áo Khô",
    category: "CLOTHING",
    sku: "CLO-003",
    quantity: 150,
    unit: "bộ",
    minStock: 100,
    maxStock: 400,
    stockLevel: "NORMAL",
    location: "F-01-03",
    lastUpdated: daysAgo(2),
  },
];

export const mockInventoryCategories: InventoryCategory[] = [
  {
    id: "cat-001",
    name: "Y Tế",
    icon: "Stethoscope",
    itemCount: 4,
    totalQuantity: 440,
    criticalItems: 1,
    lowStockItems: 1,
  },
  {
    id: "cat-002",
    name: "Thực Phẩm",
    icon: "UtensilsCrossed",
    itemCount: 4,
    totalQuantity: 1050,
    criticalItems: 0,
    lowStockItems: 2,
  },
  {
    id: "cat-003",
    name: "Nước Uống",
    icon: "Droplets",
    itemCount: 2,
    totalQuantity: 2050,
    criticalItems: 0,
    lowStockItems: 1,
  },
  {
    id: "cat-004",
    name: "Thiết Bị",
    icon: "Wrench",
    itemCount: 4,
    totalQuantity: 683,
    criticalItems: 1,
    lowStockItems: 1,
  },
  {
    id: "cat-005",
    name: "Lều Trại",
    icon: "Tent",
    itemCount: 3,
    totalQuantity: 335,
    criticalItems: 0,
    lowStockItems: 1,
  },
  {
    id: "cat-006",
    name: "Quần Áo",
    icon: "Shirt",
    itemCount: 3,
    totalQuantity: 500,
    criticalItems: 0,
    lowStockItems: 1,
  },
];

export const mockSupplyRequests: SupplyRequest[] = [
  {
    id: "req-001",
    type: "OUTBOUND",
    status: "PENDING",
    items: [
      {
        itemId: "item-001",
        itemName: "Bộ Sơ Cứu Y Tế",
        quantity: 20,
        unit: "bộ",
      },
      {
        itemId: "item-011",
        itemName: "Áo Phao Cứu Sinh",
        quantity: 30,
        unit: "cái",
      },
    ],
    requestedBy: "Trung Tâm Điều Phối",
    requestedAt: hoursAgo(2),
    priority: "HIGH",
    notes: "Cần gấp cho vùng lũ Hương Thủy",
    destinationDepot: "Điểm Tập Kết Phú Bài",
    missionId: "mission-001",
  },
  {
    id: "req-002",
    type: "OUTBOUND",
    status: "APPROVED",
    items: [
      {
        itemId: "item-005",
        itemName: "Mì Gói Khẩn Cấp",
        quantity: 100,
        unit: "thùng",
      },
      {
        itemId: "item-009",
        itemName: "Nước Đóng Chai 500ml",
        quantity: 500,
        unit: "chai",
      },
    ],
    requestedBy: "Đội Cứu Hộ Alpha",
    requestedAt: hoursAgo(5),
    approvedBy: "Nguyễn Văn A",
    approvedAt: hoursAgo(4),
    priority: "MEDIUM",
    destinationDepot: "Điểm An Toàn A",
  },
  {
    id: "req-003",
    type: "INBOUND",
    status: "IN_TRANSIT",
    items: [
      {
        itemId: "item-001",
        itemName: "Bộ Sơ Cứu Y Tế",
        quantity: 100,
        unit: "bộ",
      },
      {
        itemId: "item-011",
        itemName: "Áo Phao Cứu Sinh",
        quantity: 150,
        unit: "cái",
      },
    ],
    requestedBy: "Hội Chữ Thập Đỏ",
    requestedAt: daysAgo(1),
    approvedBy: "Nguyễn Văn A",
    approvedAt: hoursAgo(20),
    priority: "HIGH",
    sourceDepot: "Kho Trung Ương Hà Nội",
    notes: "Hàng cứu trợ từ TW",
  },
  {
    id: "req-004",
    type: "OUTBOUND",
    status: "DELIVERED",
    items: [
      {
        itemId: "item-015",
        itemName: "Lều Cứu Trợ 4 Người",
        quantity: 20,
        unit: "bộ",
      },
      {
        itemId: "item-017",
        itemName: "Chăn Cứu Trợ",
        quantity: 50,
        unit: "cái",
      },
    ],
    requestedBy: "UBND Hương Thủy",
    requestedAt: daysAgo(2),
    approvedBy: "Nguyễn Văn A",
    approvedAt: daysAgo(2),
    priority: "MEDIUM",
    destinationDepot: "Trường Tiểu Học Phú Bài",
  },
  {
    id: "req-005",
    type: "INBOUND",
    status: "PENDING",
    items: [
      {
        itemId: "item-006",
        itemName: "Gạo Đóng Gói 5kg",
        quantity: 200,
        unit: "bao",
      },
      { itemId: "item-008", itemName: "Sữa Hộp", quantity: 100, unit: "thùng" },
    ],
    requestedBy: "Mạnh Thường Quân",
    requestedAt: hoursAgo(8),
    priority: "LOW",
    sourceDepot: "Đà Nẵng",
    notes: "Hàng quyên góp từ nhà hảo tâm",
  },
];

export const mockShipments: Shipment[] = [
  {
    id: "ship-001",
    requestId: "req-002",
    status: "PREPARING",
    items: [
      {
        itemId: "item-005",
        itemName: "Mì Gói Khẩn Cấp",
        quantity: 100,
        unit: "thùng",
      },
      {
        itemId: "item-009",
        itemName: "Nước Đóng Chai 500ml",
        quantity: 500,
        unit: "chai",
      },
    ],
    origin: "Kho Trung Tâm Huế",
    destination: "Điểm An Toàn A",
    carrier: "Xe Cứu Trợ Echo",
    estimatedArrival: hoursAgo(-3), // 3 hours from now
    createdAt: hoursAgo(4),
  },
  {
    id: "ship-002",
    requestId: "req-003",
    status: "IN_TRANSIT",
    items: [
      {
        itemId: "item-001",
        itemName: "Bộ Sơ Cứu Y Tế",
        quantity: 100,
        unit: "bộ",
      },
      {
        itemId: "item-011",
        itemName: "Áo Phao Cứu Sinh",
        quantity: 150,
        unit: "cái",
      },
    ],
    origin: "Kho Trung Ương Hà Nội",
    destination: "Kho Trung Tâm Huế",
    carrier: "Xe Tải Chữ Thập Đỏ",
    trackingNumber: "CTD-2026-001234",
    estimatedArrival: hoursAgo(-8), // 8 hours from now
    createdAt: daysAgo(1),
  },
  {
    id: "ship-003",
    requestId: "req-004",
    status: "DELIVERED",
    items: [
      {
        itemId: "item-015",
        itemName: "Lều Cứu Trợ 4 Người",
        quantity: 20,
        unit: "bộ",
      },
      {
        itemId: "item-017",
        itemName: "Chăn Cứu Trợ",
        quantity: 50,
        unit: "cái",
      },
    ],
    origin: "Kho Trung Tâm Huế",
    destination: "Trường Tiểu Học Phú Bài",
    carrier: "Xe Tải Bravo",
    estimatedArrival: daysAgo(1),
    actualArrival: daysAgo(1),
    createdAt: daysAgo(2),
  },
];

export const mockDepotInfo: DepotInfo = {
  id: "depot-001",
  name: "Kho Trung Tâm Huế",
  address: "123 Lê Lợi, TP. Huế, Thừa Thiên Huế",
  phone: "0234 123 456",
  manager: "Nguyễn Văn A",
  totalItems: 20,
  totalCategories: 6,
  criticalAlerts: 2,
  lowStockAlerts: 7,
  pendingRequests: 2,
  activeShipments: 2,
};

export const mockActivityLogs: ActivityLog[] = [
  {
    id: "log-001",
    action: "STOCK_OUT",
    itemId: "item-011",
    itemName: "Áo Phao Cứu Sinh",
    quantity: 50,
    performedBy: "Nguyễn Văn A",
    performedAt: hoursAgo(1),
    details: "Xuất cho Đội Cứu Hộ Alpha - Mission #001",
  },
  {
    id: "log-002",
    action: "REQUEST_APPROVED",
    performedBy: "Nguyễn Văn A",
    performedAt: hoursAgo(4),
    details: "Phê duyệt yêu cầu REQ-002 - Xuất hàng đến Điểm An Toàn A",
  },
  {
    id: "log-003",
    action: "SHIPMENT_SENT",
    performedBy: "Trần Văn B",
    performedAt: hoursAgo(4),
    details: "Gửi hàng SHIP-001 - Xe Cứu Trợ Echo",
  },
  {
    id: "log-004",
    action: "STOCK_OUT",
    itemId: "item-001",
    itemName: "Bộ Sơ Cứu Y Tế",
    quantity: 35,
    performedBy: "Nguyễn Văn A",
    performedAt: hoursAgo(6),
    details: "Xuất cho nhiệm vụ cứu trợ khẩn cấp",
  },
  {
    id: "log-005",
    action: "ADJUSTMENT",
    itemId: "item-012",
    itemName: "Đèn Pin LED",
    quantity: -5,
    performedBy: "Lê Thị C",
    performedAt: hoursAgo(10),
    details: "Điều chỉnh kiểm kê - 5 đèn hỏng",
  },
  {
    id: "log-006",
    action: "SHIPMENT_RECEIVED",
    performedBy: "Nguyễn Văn A",
    performedAt: daysAgo(1),
    details: "Nhận hàng SHIP-003 - Lều và chăn từ TW",
  },
];

// Helper functions for inventory
export function getStockLevelColor(level: string): string {
  switch (level) {
    case "CRITICAL":
      return "bg-red-500";
    case "LOW":
      return "bg-orange-500";
    case "NORMAL":
      return "bg-green-500";
    case "OVERSTOCKED":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
}

export function getStockLevelBadgeVariant(
  level: string,
): "destructive" | "warning" | "success" | "info" | "default" {
  switch (level) {
    case "CRITICAL":
      return "destructive";
    case "LOW":
      return "warning";
    case "NORMAL":
      return "success";
    case "OVERSTOCKED":
      return "info";
    default:
      return "default";
  }
}

export function getRequestStatusColor(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-yellow-500";
    case "APPROVED":
      return "bg-blue-500";
    case "IN_TRANSIT":
      return "bg-purple-500";
    case "DELIVERED":
      return "bg-green-500";
    case "CANCELLED":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

export function getCategoryIcon(category: string): string {
  switch (category) {
    case "MEDICAL":
      return "Stethoscope";
    case "FOOD":
      return "UtensilsCrossed";
    case "WATER":
      return "Droplets";
    case "EQUIPMENT":
      return "Wrench";
    case "SHELTER":
      return "Tent";
    case "CLOTHING":
      return "Shirt";
    default:
      return "Package";
  }
}
