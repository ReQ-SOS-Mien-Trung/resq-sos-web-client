import api from "@/config/axios";
import {
  ServiceZoneEntity,
  UpdateServiceZoneRequest,
  CreateServiceZoneRequest,
} from "./type";

/**
 * Get ALL service zones (active + inactive)
 * GET /system/service-zone
 */
export async function getAllServiceZones(): Promise<ServiceZoneEntity[]> {
  const { data } = await api.get("/system/service-zone");
  return data;
}

/**
 * Get all currently active service zones
 * GET /system/service-zone/active
 */
export async function getActiveServiceZone(): Promise<ServiceZoneEntity[]> {
  const { data } = await api.get("/system/service-zone/active");
  return data;
}

/**
 * Get a service zone by ID
 * GET /system/service-zone/{id}
 */
export async function getServiceZoneById(
  id: number,
): Promise<ServiceZoneEntity> {
  const { data } = await api.get(`/system/service-zone/${id}`);
  return data;
}

/**
 * Create a new service zone
 * POST /system/service-zone
 */
export async function createServiceZone(
  body: CreateServiceZoneRequest,
): Promise<ServiceZoneEntity> {
  const { data } = await api.post("/system/service-zone", body);
  return data;
}

/**
 * Update a service zone
 * PUT /system/service-zone/{id}
 */
export async function updateServiceZone(
  id: number,
  body: UpdateServiceZoneRequest,
): Promise<ServiceZoneEntity> {
  const { data } = await api.put(`/system/service-zone/${id}`, body);
  return data;
}
