import api from "@/config/axios";
import {
  GetRescuerApplicationsResponse,
  GetRescuerApplicationsParams,
  RescuerApplicationDetail,
  ReviewRescuerApplicationRequest,
  ReviewRescuerApplicationResponse,
} from "./type";

/**
 * Get all rescuer applications with pagination and optional status filter
 * GET /identity/admin/rescuer-applications
 */
export async function getRescuerApplications(
  params?: GetRescuerApplicationsParams,
): Promise<GetRescuerApplicationsResponse> {
  const { data } = await api.get("/identity/admin/rescuer-applications", {
    params: {
      pageNumber: params?.pageNumber ?? 1,
      pageSize: params?.pageSize ?? 10,
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.rescuerType ? { rescuerType: params.rescuerType } : {}),
    },
  });
  return data;
}

/**
 * Get rescuer application detail by ID
 * GET /identity/admin/rescuer-applications/{id}
 */
export async function getRescuerApplicationDetail(
  id: number,
): Promise<RescuerApplicationDetail> {
  const { data } = await api.get(
    `/identity/admin/rescuer-applications/${id}`,
  );
  return data;
}

/**
 * Review (approve/reject) a rescuer application
 * POST /identity/admin/rescuer-applications/review
 */
export async function reviewRescuerApplication(
  request: ReviewRescuerApplicationRequest,
): Promise<ReviewRescuerApplicationResponse> {
  const { data } = await api.post(
    "/identity/admin/rescuer-applications/review",
    request,
  );
  return data;
}
