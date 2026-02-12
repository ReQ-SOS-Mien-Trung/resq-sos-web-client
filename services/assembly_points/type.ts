// Assembly Point Status
export type AssemblyPointStatus = "Active" | "Overloaded" | "Unavailable";

// Assembly Point Status Metadata (from /personnel/assembly-point/status-metadata)
export interface AssemblyPointStatusMetadata {
  key: AssemblyPointStatus;
  label: string;
}

// Assembly Point Entity
export interface AssemblyPointEntity {
  id: number;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  capacityTeams: number;
  status: AssemblyPointStatus;
  lastUpdatedAt: string;
}

// Paginated Response for Assembly Points
export interface GetAssemblyPointsResponse {
  items: AssemblyPointEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query params for fetching assembly points
export interface GetAssemblyPointsParams {
  pageNumber?: number;
  pageSize?: number;
}

// Create Assembly Point Request
export interface CreateAssemblyPointRequest {
  name: string;
  latitude: number;
  longitude: number;
  capacityTeams: number;
}

// Create Assembly Point Response
export interface CreateAssemblyPointResponse {
  id: number;
  code: string;
  name: string;
  capacityTeams: number;
  status: AssemblyPointStatus;
}

// Update Assembly Point Request
export interface UpdateAssemblyPointRequest {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacityTeams: number;
}

// Update Assembly Point Response
export interface UpdateAssemblyPointResponse {
  id: number;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  capacityTeams: number;
  status: AssemblyPointStatus;
  lastUpdatedAt: string;
}

// Update Assembly Point Status Request
export interface UpdateAssemblyPointStatusRequest {
  id: number;
  status: AssemblyPointStatus;
}

// Update Assembly Point Status Response
export interface UpdateAssemblyPointStatusResponse {
  id: number;
  status: AssemblyPointStatus;
  message: string;
}
