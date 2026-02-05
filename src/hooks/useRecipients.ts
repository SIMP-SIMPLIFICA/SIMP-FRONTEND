import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Recipient {
    id: string;
    name: string;
    username: string;
    email: string;
    avatar?: string;
    role: string;
}

export function useRecipients(search?: string) {
    return useQuery({
        queryKey: ["recipients", search],
        queryFn: async () => {
            const query = new URLSearchParams();
            if (search) query.append("search", search);

            const queryString = query.toString();
            // Prefixing with /api/v1 as requested
            const url = `/api/v1/communication/recipients${queryString ? `?${queryString}` : ""}`;

            // api.get already uses API_URL which usually includes domain, 
            // but here we ensure the path matches the backend expectation
            const res = await api.get<Recipient[]>(url);
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
