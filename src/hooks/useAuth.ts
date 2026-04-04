import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { MeResponse, MeUser } from "@/hooks/useMe";

export type { MeUser as User };

export function useAuth() {
  const token = getAccessToken();

  const { data, isLoading, error, isError } = useQuery<MeResponse>({
    queryKey: ["auth", "me"],
    queryFn: () => apiRequest<MeResponse>("/api/v1/auth/me"),
    enabled: !!token,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  const user = data?.user as MeUser | undefined;

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isError,
    isSuperAdmin: user?.isSuperAdmin ?? false,
    organizationId: user?.organizationId ?? null,
    error,
  };
}
