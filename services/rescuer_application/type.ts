// ─── List Item (GET /identity/admin/rescuer-applications) ───

export interface RescuerApplicationListItem {
  id: number;
  userId: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  rescuerType: string;
  province: string;
}

// Paginated Response for Rescuer Applications
export interface GetRescuerApplicationsResponse {
  items: RescuerApplicationListItem[];
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
  rescuerType?: string;
}

// ─── Detail (GET /identity/admin/rescuer-applications/{id}) ───

export interface RescuerApplicationDocument {
  id: number;
  fileUrl: string;
  fileTypeId: number;
  fileTypeCode: string;
  fileTypeName: string;
  uploadedAt: string;
}

export interface RescuerAbility {
  abilityId: number;
  code: string;
  description: string;
  level: number;
  subgroupId: number;
  subgroupCode: string;
  subgroupDescription: string;
  categoryId: number;
  categoryCode: string;
  categoryDescription: string;
}

export interface RescuerApplicationDetail {
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
  avatarUrl: string | null;
  rescuerType: string;
  address: string;
  ward: string;
  province: string;
  documents: RescuerApplicationDocument[];
  abilities: RescuerAbility[];
}

/** @deprecated Use RescuerApplicationListItem or RescuerApplicationDetail instead */
export type RescuerApplicationEntity = RescuerApplicationDetail;

// ─── Review (POST /identity/admin/rescuer-applications/review) ───

export interface ReviewRescuerApplicationRequest {
  applicationId: number;
  isApproved: boolean;
  adminNote?: string;
}

export interface ReviewRescuerApplicationResponse {
  applicationId: number;
  userId: string;
  status: string;
  reviewedAt: string;
  reviewedBy: string;
  message: string;
}
