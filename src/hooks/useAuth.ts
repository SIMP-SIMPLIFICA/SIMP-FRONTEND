import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Definição do tipo de Usuário
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  avatar?: string;
  role?: string; 
}

// Interface auxiliar para a resposta do backend que vem como { user: { ... } }
interface AuthMeResponse {
  user: User;
}

export function useAuth() {
  const { data: user, isLoading, error, isError } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      // CORREÇÃO: Adicionado /api/v1 ao caminho
      // CORREÇÃO: Tipagem ajustada para AuthMeResponse
      const response = await api.get<AuthMeResponse>("/api/v1/auth/me");
      return response.data.user; // Retorna apenas o objeto do usuário
    },
    retry: 1, 
    staleTime: 1000 * 60 * 5, 
  });

  return { 
    user, 
    isLoading, 
    isAuthenticated: !!user && !isError,
    error 
  };
}