import { api } from "../api";
import type { FinanceEntry } from "../../pages/financeiro/types";

// Tipagem para a Categoria que vem do Backend
export interface FinanceCategory {
    id: string;
    workspaceId: string;
    name: string;
    description?: string | null;
}

export interface FinanceAttachment {
    id: string;
    entryId: string;
    fileName: string;
    fileKey: string;
    fileSize: number;
    contentType: string;
    url?: string; // Pre-signed URL vinda do backend
    createdAt: string;
}

export const financeService = {
    // Lançamentos
    getEntries: async (workspaceId: string, params?: { startDate?: string; endDate?: string; type?: string; categoryId?: string }) => {
        const query = new URLSearchParams();
        if (params?.startDate) query.append('startDate', params.startDate);
        if (params?.endDate) query.append('endDate', params.endDate);
        if (params?.type && params.type !== 'ALL') query.append('type', params.type);
        if (params?.categoryId && params.categoryId !== 'ALL') query.append('categoryId', params.categoryId);

        const queryString = query.toString() ? `?${query.toString()}` : '';
        const response = await api.get<FinanceEntry[]>(`/finance/workspaces/${workspaceId}/entries${queryString}`);
        return response.data;
    },

    createEntry: async (workspaceId: string, data: Partial<FinanceEntry> & { categoryId?: string }) => {
        const response = await api.post<FinanceEntry>(`/finance/workspaces/${workspaceId}/entries`, {
            ...data,
            workspaceId
        });
        return response.data;
    },

    updateEntry: async (id: string, data: Partial<FinanceEntry> & { categoryId?: string }) => {
        const response = await api.put<FinanceEntry>(`/finance/entries/${id}`, data);
        return response.data;
    },

    deleteEntry: async (id: string) => {
        const response = await api.delete<void>(`/finance/entries/${id}`);
        return response.data;
    },

    // Categorias
    getCategories: async (workspaceId: string) => {
        const response = await api.get<FinanceCategory[]>(`/finance/workspaces/${workspaceId}/categories`);
        return response.data;
    },

    createCategory: async (workspaceId: string, data: { name: string; description?: string }) => {
        const response = await api.post<FinanceCategory>(`/finance/workspaces/${workspaceId}/categories`, {
            ...data,
            workspaceId
        });
        return response.data;
    },

    // Anexos (R2)
    getAttachments: async (entryId: string) => {
        const response = await api.get<FinanceAttachment[]>(`/finance/entries/${entryId}/attachments`);
        return response.data;
    },

    uploadAttachment: async (entryId: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<FinanceAttachment>(`/finance/entries/${entryId}/attachments`, formData);
        return response.data;
    },

    deleteAttachment: async (entryId: string, attachmentId: string) => {
        const response = await api.delete<void>(`/finance/entries/${entryId}/attachments/${attachmentId}`);
        return response.data;
    }
};
