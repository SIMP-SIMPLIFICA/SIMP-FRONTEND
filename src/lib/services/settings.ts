import { api } from "@/lib/api";

export interface SystemSettings {
    MayorName: string;
    CityAddress: string;
    CoatOfArmsUrl: string;
}

export const settingsApi = {
    getPublic: async () => {
        const response = await api.get<SystemSettings>("/api/v1/settings/public");
        return response.data;
    },

    update: async (data: SystemSettings) => {
        const response = await api.put<SystemSettings>("/api/v1/settings", data);
        return response.data;
    }
};
