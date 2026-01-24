import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export type MeResponse = {
  user: {
    id: string;
    email: string;
    username?: string;
    roles?: Array<{ role?: { permissions?: string[]; name?: string; displayName?: string } }>;
  };
};

export function useMe(enabled = true) {
  const token = getAccessToken();

  return useQuery({
    queryKey: ["me", token], // 👈 ESSENCIAL: muda quando o token muda
    queryFn: () => apiRequest<MeResponse>("/api/v1/auth/me"),
    enabled: enabled && !!token,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
