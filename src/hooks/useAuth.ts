import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { MeResponse, MeUser } from "@/hooks/useMe";

export type { MeUser as User };

export function useAuth() {
  const { data, isLoading, error, isError } = useQuery<MeResponse>({
    queryKey: ["auth", "me"],
    queryFn: () => apiRequest<MeResponse>("/api/v1/auth/me"),
    // Always enabled: when _accessToken is null (page reload / fresh tab) the
    // 401 interceptor in api.ts bootstraps the session via the httpOnly cookie
    // and retries this request transparently.
    enabled: true,
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
    enabledModules: user?.enabledModules ?? [],
    error,
  };
}
