import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import {
  getAllServiceZones,
  getActiveServiceZone,
  getServiceZoneById,
  createServiceZone,
  updateServiceZone,
} from "./api";
import {
  ServiceZoneEntity,
  CreateServiceZoneRequest,
  UpdateServiceZoneRequest,
} from "./type";

export const SERVICE_ZONE_KEYS = {
  all: ["service-zone"] as const,
  list: () => [...SERVICE_ZONE_KEYS.all, "list"] as const,
  active: () => [...SERVICE_ZONE_KEYS.all, "active"] as const,
  byId: (id: number) => [...SERVICE_ZONE_KEYS.all, id] as const,
};

/** Fetch ALL service zones (active + inactive) */
export function useAllServiceZones(
  options?: Omit<
    UseQueryOptions<ServiceZoneEntity[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<ServiceZoneEntity[], Error>({
    queryKey: SERVICE_ZONE_KEYS.list(),
    queryFn: getAllServiceZones,
    ...options,
  });
}

/** Fetch all active service zones */
export function useActiveServiceZone(
  options?: Omit<
    UseQueryOptions<ServiceZoneEntity[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<ServiceZoneEntity[], Error>({
    queryKey: SERVICE_ZONE_KEYS.active(),
    queryFn: getActiveServiceZone,
    ...options,
  });
}

/** Fetch a service zone by ID */
export function useServiceZoneById(
  id: number,
  options?: Omit<
    UseQueryOptions<ServiceZoneEntity, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<ServiceZoneEntity, Error>({
    queryKey: SERVICE_ZONE_KEYS.byId(id),
    queryFn: () => getServiceZoneById(id),
    enabled: id > 0,
    ...options,
  });
}

/** Create a new service zone (POST) */
export function useCreateServiceZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateServiceZoneRequest) => createServiceZone(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_ZONE_KEYS.all });
    },
  });
}

/** Update a service zone (PUT) */
export function useUpdateServiceZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: UpdateServiceZoneRequest;
    }) => updateServiceZone(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: SERVICE_ZONE_KEYS.all });
      queryClient.invalidateQueries({
        queryKey: SERVICE_ZONE_KEYS.byId(variables.id),
      });
    },
  });
}
