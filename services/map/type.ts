/** A single coordinate point */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface ServiceZoneCounts {
  pendingSosRequestCount: number;
  incidentSosRequestCount: number;
  teamIncidentCount: number;
  assemblyPointCount: number;
  depotCount: number;
}

/** Service zone entity returned from the API */
export interface ServiceZoneEntity {
  id: number;
  name: string;
  coordinates: Coordinate[];
  isActive: boolean;
  counts: ServiceZoneCounts;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Request body for PUT /system/service-zone/{id} */
export interface UpdateServiceZoneRequest {
  name: string;
  coordinates: Coordinate[];
  isActive: boolean;
}

/** Request body for POST /system/service-zone */
export type CreateServiceZoneRequest = UpdateServiceZoneRequest;
