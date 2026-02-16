import { api } from "@/lib/api";

export interface PublicValidationResult {
    valid: boolean;
    message?: string;
    protocol?: string;
    type?: string;
    date?: string;
    signer?: string;
    signatures?: {
        name: string;
        role: string | null;
        date: string;
        hash?: string;
    }[];
}

export const publicApi = {
    validate: async (hash: string) => {
        // Nota: A rota no backend é /public/validate/:hash
        // O axios instance 'api' pode ter baseURL /api/v1. 
        // Se tiver, precisamos subir um nível ou usar URL absoluta.
        // Assumindo que 'api' tem baseURL '/', ou '/api/v1', vamos tentar '/public/validate...'
        // Se 'api' for '/api/v1', então '/public' vira '/api/v1/public'.
        // Minha rota backend foi registrada em '/public' na raiz (fora do /api/v1 wrapper).
        // Então devo usar url absoluta ou relativa à raiz.

        const response = await api.get<PublicValidationResult>(`/public/validate/${hash}`);
        return response.data;
    }
};
