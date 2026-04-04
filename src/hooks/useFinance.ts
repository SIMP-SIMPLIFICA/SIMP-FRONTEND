import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "../lib/api/finance";

import type { FinanceEntry } from "../pages/financeiro/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFinanceEntries(_workspaceId?: string | undefined, filters?: any) {
    return useQuery({
        queryKey: ["financeEntries", filters],
        queryFn: () => financeService.getEntries(filters),
    });
}

export function useFinanceCategories(_workspaceId?: string | undefined) {
    return useQuery({
        queryKey: ["financeCategories"],
        queryFn: () => financeService.getCategories(),
    });
}

export function useCreateFinanceEntry(_workspaceId?: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<FinanceEntry> & { categoryId?: string }) =>
            financeService.createEntry(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["financeEntries"] });
        },
    });
}

export function useUpdateFinanceEntry(_workspaceId?: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<FinanceEntry> & { categoryId?: string } }) =>
            financeService.updateEntry(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financeEntries"] }); },
    });
}

export function useDeleteFinanceEntry(_workspaceId?: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => financeService.deleteEntry(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financeEntries"] }); },
    });
}

export function useCreateFinanceCategory(_workspaceId?: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; description?: string }) => financeService.createCategory(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financeCategories"] }); },
    });
}

export function useUpdateFinanceCategory(_workspaceId?: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
            financeService.updateCategory(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financeCategories"] }); },
    });
}

export function useDeleteFinanceCategory(_workspaceId?: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => financeService.deleteCategory(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financeCategories"] }); },
    });
}

export function useFinanceBankAccounts(_workspaceId?: string | undefined) {
    return useQuery({
        queryKey: ["financeBankAccounts"],
        queryFn: () => financeService.getBankAccounts(),
    });
}

export function useCreateBankAccount(_workspaceId?: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; agency?: string; accountNumber?: string; initialBalanceCents?: number }) =>
            financeService.createBankAccount(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financeBankAccounts"] }); },
    });
}

export function useUpdateBankAccount(_workspaceId?: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { name?: string; agency?: string; accountNumber?: string; initialBalanceCents?: number } }) =>
            financeService.updateBankAccount(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financeBankAccounts"] }); },
    });
}

export function useDeleteBankAccount(_workspaceId?: string | undefined) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => financeService.deleteBankAccount(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["financeBankAccounts"] }); },
    });
}

// Hooks para Anexos (Cloudflare R2)
export function useFinanceAttachments(entryId: string | undefined) {
    return useQuery({
        queryKey: ["financeAttachments", entryId],
        queryFn: () => {
            if (!entryId) throw new Error("Entry ID is required");
            return financeService.getAttachments(entryId);
        },
        enabled: !!entryId,
    });
}

export function useUploadAttachment(entryId: string | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => {
            if (!entryId) throw new Error("Entry ID is required");
            return financeService.uploadAttachment(entryId, file);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["financeAttachments", entryId] });
            // Invalida a lista de lançamentos para atualizar o ícone/status de anexo na tabela
            queryClient.invalidateQueries({ queryKey: ["financeEntries"] });
        },
    });
}

export function useDeleteAttachment(entryId: string | undefined) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (attachmentId: string) => {
            if (!entryId) throw new Error("Entry ID is required");
            return financeService.deleteAttachment(entryId, attachmentId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["financeAttachments", entryId] });
            queryClient.invalidateQueries({ queryKey: ["financeEntries"] });
        },
    });
}
