import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

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
  const token = getAccessToken();

  return useQuery({
    queryKey: ["auth", "me"], // mesma key do useAuth — compartilham o cache
    queryFn: () => apiRequest<MeResponse>("/api/v1/auth/me"),
    enabled: enabled && !!token,
    staleTime: 1000 * 60 * 2,
    retry: false,
  });
}
