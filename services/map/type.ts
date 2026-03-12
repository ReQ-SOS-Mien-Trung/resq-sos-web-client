/** A single coordinate point */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/** Service zone entity returned from the API */
export interface ServiceZoneEntity {
  id: number;
  name: string;
  coordinates: Coordinate[];
  isActive: boolean;
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
