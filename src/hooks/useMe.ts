import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export type MeUser = {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName?: string;
  avatar?: string;
  organizationId: string | null;
  isSuperAdmin: boolean;
  clearanceLevel?: number;
  departments?: {
    id: string;
    name: string;
    code: string;
    managerId: string | null;
  }[];
  organization?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    cnpj: string | null;
    isActive: boolean;
    createdAt: string;
  } | null;
  roles?: Array<{
    role?: {
      permissions?: string[];
      name?: string;
      displayName?: string;
    };
  }>;
  enabledModules?: string[];
};

export type MeResponse = {
  user: MeUser;
};

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["auth", "me"], // mesma key do useAuth — compartilham o cache
    queryFn: () => apiRequest<MeResponse>("/api/v1/auth/me"),
    // No token guard here: when _accessToken is null (page reload), the 401
    // interceptor in api.ts will silently refresh via the httpOnly cookie and
    // retry /auth/me — this is the bootstrap path for persistent sessions.
    enabled,
    staleTime: 1000 * 60 * 2,
    retry: false,
  });
}
