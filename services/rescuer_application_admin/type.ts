// Rescuer Application Entity (item in paginated list)
export interface RescuerApplicationEntity {
  applicationId: number;
  // Add more fields here when backend response structure is confirmed
  [key: string]: unknown;
}

// Paginated Response for Rescuer Applications
export interface GetRescuerApplicationsResponse {
  items: RescuerApplicationEntity[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Query params for fetching rescuer applications
export interface GetRescuerApplicationsParams {
  pageNumber?: number;
  pageSize?: number;
  status?: string;
}

// Review Rescuer Application Request
export interface ReviewRescuerApplicationRequest {
  applicationId: number;
  isApproved: boolean;
  adminNote: string;
}

// Review Rescuer Application Response
export interface ReviewRescuerApplicationResponse {
  // Add fields when backend response structure is confirmed
  [key: string]: unknown;
}
