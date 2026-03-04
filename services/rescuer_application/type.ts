// Document attached to a rescuer application
export interface RescuerApplicationDocument {
  id: number;
  fileUrl: string;
  fileTypeId: number;
  fileTypeCode: string;
  fileTypeName: string;
  uploadedAt: string;
}

// Rescuer Application Entity (item in paginated list)
export interface RescuerApplicationEntity {
  id: number;
  userId: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  adminNote: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rescuerType: string;
  address: string;
  ward: string;
  province: string;
  documents: RescuerApplicationDocument[];
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
  applicationId: number;
  userId: string;
  status: string;
  reviewedAt: string;
  reviewedBy: string;
  message: string;
}
