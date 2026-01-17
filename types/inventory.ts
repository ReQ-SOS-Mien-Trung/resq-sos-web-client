// Inventory Management Types - ReQ-SOS Depot Manager Dashboard
// For managing warehouse inventory in disaster relief operations

export type StockLevel = "CRITICAL" | "LOW" | "NORMAL" | "OVERSTOCKED";
export type ItemCategory =
  | "MEDICAL"
  | "FOOD"
  | "EQUIPMENT"
  | "CLOTHING"
  | "SHELTER"
  | "WATER";
export type RequestStatus =
  | "PENDING"
  | "APPROVED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";
export type RequestType = "INBOUND" | "OUTBOUND";
export type ShipmentStatus =
  | "PREPARING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RETURNED";

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  sku: string;
  quantity: number;
  unit: string;
  minStock: number;
  maxStock: number;
  stockLevel: StockLevel;
  location: string; // Warehouse location code (e.g., "A-01-02")
  expiryDate?: Date;
  lastUpdated: Date;
  imageUrl?: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
  totalQuantity: number;
  criticalItems: number;
  lowStockItems: number;
}

export interface SupplyRequest {
  id: string;
  type: RequestType;
  status: RequestStatus;
  items: RequestItem[];
  requestedBy: string;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  priority: "HIGH" | "MEDIUM" | "LOW";
  notes?: string;
  destinationDepot?: string;
  sourceDepot?: string;
  missionId?: string; // Link to rescue mission if applicable
}

export interface RequestItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

export interface Shipment {
  id: string;
  requestId: string;
  status: ShipmentStatus;
  items: RequestItem[];
  origin: string;
  destination: string;
  carrier: string;
  trackingNumber?: string;
  estimatedArrival: Date;
  actualArrival?: Date;
  createdAt: Date;
}

export interface DepotManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  depotId: string;
  depotName: string;
  role: "DEPOT_MANAGER" | "DEPOT_STAFF";
}

export interface DepotInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  manager: string;
  totalItems: number;
  totalCategories: number;
  criticalAlerts: number;
  lowStockAlerts: number;
  pendingRequests: number;
  activeShipments: number;
}

// Dashboard Statistics
export interface InventoryStats {
  totalItems: number;
  totalCategories: number;
  criticalStock: number;
  lowStock: number;
  normalStock: number;
  pendingInbound: number;
  pendingOutbound: number;
  activeShipments: number;
  itemsExpiringSoon: number;
}

// Activity Log
export interface ActivityLog {
  id: string;
  action:
    | "STOCK_IN"
    | "STOCK_OUT"
    | "ADJUSTMENT"
    | "REQUEST_CREATED"
    | "REQUEST_APPROVED"
    | "SHIPMENT_SENT"
    | "SHIPMENT_RECEIVED";
  itemId?: string;
  itemName?: string;
  quantity?: number;
  performedBy: string;
  performedAt: Date;
  details: string;
}
