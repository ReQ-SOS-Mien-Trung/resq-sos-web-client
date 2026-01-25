# ReQ-SOS Miền Trung - Coordinator Dashboard

## Overview

The Coordinator Dashboard is the central command interface for disaster relief coordination in Central Vietnam. It provides real-time visualization of SOS requests, rescuer positions, and depot locations on an interactive map, along with AI-powered dispatch recommendations.

## Features

### 1. Interactive Map (Central Feature)

- **SOS Clusters**: Pulsing colored markers based on priority
  - 🔴 P1 (Critical) - Red pulsing dots
  - 🟠 P2 (High) - Orange pulsing dots
  - 🟡 P3 (Medium) - Yellow pulsing dots
- **Rescuers**: Type-specific icons with status colors
  - 🚚 Truck
  - 🚤 Motorboat
  - 🛶 Small Boat
  - Green border = Available, Gray border = Busy
- **Depots**: Warehouse icons showing inventory on hover
- **Route Overlay**: Dashed blue line showing proposed mission route

### 2. SOS Sidebar (Left Panel)

Three tabs for different views:

- **Incoming SOS**: Clustered and individual SOS requests
- **Active Missions**: Currently executing rescue missions
- **Rescuer Status**: All rescue teams and their availability

### 3. AI Dispatch Interface

When processing an SOS cluster:

- **Situation Analysis**: AI-generated assessment of conditions
- **Reasoning**: Explanation of why specific resources were selected
- **Proposed Plan**: Step-by-step mission with time estimates
- **Manual Override**: Ability to select alternative rescuers

## File Structure

```
app/
  dashboard/
    coordinator/
      page.tsx          # Main dashboard page
    layout.tsx          # Dashboard layout

components/
  coordinator/
    index.ts            # Exports
    CoordinatorMap.tsx  # Interactive Leaflet map
    SOSSidebar.tsx      # Left sidebar with tabs
    AIDispatchPanel.tsx # AI decision panel
    ClusterDetailsSheet.tsx # Cluster drill-down sheet

types/
  coordinator.ts        # TypeScript interfaces

lib/
  mock-data.ts          # Mock data for development
```

## TypeScript Interfaces

```typescript
type Priority = "P1" | "P2" | "P3";
type RescuerType = "TRUCK" | "MOTORBOAT" | "SMALL_BOAT";

interface SOSRequest {
  id: string;
  groupId: string; // Family ID for logical grouping
  location: { lat: number; lng: number };
  priority: Priority;
  needs: { medical: boolean; food: boolean; boat: boolean };
  status: "PENDING" | "ASSIGNED" | "RESCUED";
  message: string;
  aiAnalysis?: { riskFactors: string[] };
}

interface Rescuer {
  id: string;
  name: string;
  type: RescuerType;
  status: "AVAILABLE" | "BUSY";
  location: { lat: number; lng: number };
  currentLoad: number;
  capacity: number;
  capabilities: string[];
}

interface Depot {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  inventory: { lifeJackets: number; foodPacks: number; medKits: number };
}
```

## Key Concepts

### Cluster vs. Group

- **Cluster**: Spatial grouping using DBSCAN for map clarity
- **Group**: Logical grouping by Family ID for rescue operations

The UI shows clusters on the map but allows drilling down to individual family groups.

### AI Dispatch Logic

The system uses Gemini AI to:

1. Analyze situation factors (water level, victim conditions)
2. Match rescuer capabilities to requirements
3. Optimize routes considering depot stops
4. Provide confidence scores for decisions

## Usage

1. **View SOS Requests**: Click on map markers or sidebar items
2. **Process Cluster**: Click a cluster marker → View details → "Xử lý với AI Dispatch"
3. **Approve Mission**: Review AI recommendation → "Phê duyệt nhiệm vụ"
4. **Manual Override**: Click "Ghi đè thủ công" to select alternative rescuer

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Access dashboard
http://localhost:3000/dashboard/coordinator
```

## Dependencies

- **react-leaflet**: Interactive map
- **leaflet**: Map tiles and markers
- **lucide-react**: Icon library
- **shadcn/ui**: UI components (Card, Badge, Tabs, Sheet, Dialog)

## Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Drag & drop rescuer assignment
- [ ] Historical mission analytics
- [ ] Multi-language support
- [ ] Offline mode with service workers
