import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface UserBasic {
    id: string;
    name: string; // ou username/firstName
    firstName?: string;
    lastName?: string;
    username?: string;
    email: string;
    department?: string; // Se tiver
    roles?: Array<{ role: { name: string } }>;
}

export function useUsersList() {
    return useQuery({
        queryKey: ["users", "list"],
        queryFn: async () => {
            // Ajuste a rota conforme seu user.routes.ts. Geralmente é /users
            // O backend retorna { data: [], pagination: {} }
            // Precisamos tipar como any ou definir a interface de resposta, e retornar o array interno
            const res = await api.get<{ data: UserBasic[] }>("/api/v1/users?limit=1000");
            return res.data.data || [];
        }
    });
}