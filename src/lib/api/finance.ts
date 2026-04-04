import { api } from "../api";
import type { FinanceEntry } from "../../pages/financeiro/types";

// Tipagem para a Categoria que vem do Backend
export interface FinanceCategory {
    id: string;
    organizationId: string;
    name: string;
    description?: string | null;
}

export interface BankAccount {
    id: string;
    organizationId: string;
    name: string;
    agency?: string | null;
    accountNumber?: string | null;
    initialBalanceCents: number;
    createdAt: string;
    updatedAt: string;
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
    getEntries: async (params?: { startDate?: string; endDate?: string; type?: string; categoryId?: string }) => {
        const query = new URLSearchParams();
        if (params?.startDate) query.append('startDate', params.startDate);
        if (params?.endDate) query.append('endDate', params.endDate);
        if (params?.type && params.type !== 'ALL') query.append('type', params.type);
        if (params?.categoryId && params.categoryId !== 'ALL') query.append('categoryId', params.categoryId);

        const queryString = query.toString() ? `?${query.toString()}` : '';
        const response = await api.get<FinanceEntry[]>(`/finance/entries${queryString}`);
        return response.data;
    },

    createEntry: async (data: Partial<FinanceEntry> & { categoryId?: string }) => {
        const response = await api.post<FinanceEntry>(`/finance/entries`, data);
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

    // Categorias (org-scoped)
    getCategories: async () => {
        const response = await api.get<FinanceCategory[]>(`/finance/categories`);
        return response.data;
    },

    createCategory: async (data: { name: string; description?: string }) => {
        const response = await api.post<FinanceCategory>(`/finance/categories`, data);
        return response.data;
    },

    updateCategory: async (id: string, data: { name?: string; description?: string }) => {
        const response = await api.put<FinanceCategory>(`/finance/categories/${id}`, data);
        return response.data;
    },

    deleteCategory: async (id: string) => {
        await api.delete(`/finance/categories/${id}`);
    },

    // Contas Bancárias (org-scoped)
    getBankAccounts: async () => {
        const response = await api.get<BankAccount[]>(`/finance/accounts`);
        return response.data;
    },

    createBankAccount: async (data: { name: string; agency?: string; accountNumber?: string; initialBalanceCents?: number }) => {
        const response = await api.post<BankAccount>(`/finance/accounts`, data);
        return response.data;
    },

    updateBankAccount: async (id: string, data: { name?: string; agency?: string; accountNumber?: string; initialBalanceCents?: number }) => {
        const response = await api.put<BankAccount>(`/finance/accounts/${id}`, data);
        return response.data;
    },

    deleteBankAccount: async (id: string) => {
        await api.delete(`/finance/accounts/${id}`);
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
