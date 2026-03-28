import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { MeResponse } from "@/hooks/useMe";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  avatar?: string;
  role?: string;
}

export function useAuth() {
  const token = getAccessToken();

  // Mesma queryFn que useMe → mesmo shape { user: {...} } → cache consistente
  const { data, isLoading, error, isError } = useQuery<MeResponse>({
    queryKey: ["auth", "me"],
    queryFn: () => apiRequest<MeResponse>("/api/v1/auth/me"),
    enabled: !!token,
    retry: false,
    staleTime: 1000 * 60 * 2,
  });

  return {
    user: data?.user as User | undefined,
    isLoading,
    isAuthenticated: !!data?.user && !isError,
    error,
  };
}
