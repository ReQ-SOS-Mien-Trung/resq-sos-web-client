import { useQuery } from "@tanstack/react-query";
import { getUserMe } from "./api";
import { UserMeResponse } from "./type";

export const USER_ME_QUERY_KEY = ["user", "me"] as const;

export interface UseUserMeOptions {
  enabled?: boolean;
  onSuccess?: (data: UserMeResponse) => void;
  onError?: (error: Error) => void;
}

export function useUserMe(options?: UseUserMeOptions) {
  return useQuery<UserMeResponse, Error>({
    queryKey: USER_ME_QUERY_KEY,
    queryFn: getUserMe,
    enabled: options?.enabled ?? true,
  });
}
