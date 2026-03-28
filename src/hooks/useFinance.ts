import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "../lib/api/finance";
import type { FinanceEntry } from "../pages/financeiro/types";
import { useWorkspaces } from "./useWorkspaces";

export function useFinanceEntries(workspaceId: string | undefined, filters?: Record<string, unknown>) {
    const { data: workspaces } = useWorkspaces();
    const resolvedWorkspaceId = workspaceId || workspaces?.[0]?.id;

    return useQuery({
        queryKey: ["financeEntries", resolvedWorkspaceId, filters],
        queryFn: () => {
            if (!resolvedWorkspaceId) throw new Error("Workspace ID is required");
            return financeService.getEntries(resolvedWorkspaceId, filters);
        },
        enabled: !!resolvedWorkspaceId,
    });
}

export function useFinanceCategories(workspaceId: string | undefined) {
    const { data: workspaces } = useWorkspaces();
    const resolvedWorkspaceId = workspaceId || workspaces?.[0]?.id;

    return useQuery({
        queryKey: ["financeCategories", resolvedWorkspaceId],
        queryFn: () => {
            if (!resolvedWorkspaceId) throw new Error("Workspace ID is required");
            return financeService.getCategories(resolvedWorkspaceId);
        },
        enabled: !!resolvedWorkspaceId,
    });
}

export function useCreateFinanceEntry(workspaceId: string | undefined) {
    const queryClient = useQueryClient();
    const { data: workspaces } = useWorkspaces();

    return useMutation({
        mutationFn: (data: Partial<FinanceEntry> & { categoryId?: string }) => {
            const resolvedWorkspaceId = workspaceId || workspaces?.[0]?.id;
            if (!resolvedWorkspaceId) throw new Error("Workspace ID is required");
            return financeService.createEntry(resolvedWorkspaceId, data);
        },
        onSuccess: () => {
            const resolvedWorkspaceId = workspaceId || workspaces?.[0]?.id;
            queryClient.invalidateQueries({ queryKey: ["financeEntries", resolvedWorkspaceId] });
        },
    });
}

export function useUpdateFinanceEntry(workspaceId: string | undefined) {
    const queryClient = useQueryClient();
    const { data: workspaces } = useWorkspaces();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<FinanceEntry> & { categoryId?: string } }) => {
            return financeService.updateEntry(id, data);
        },
        onSuccess: () => {
            const resolvedWorkspaceId = workspaceId || workspaces?.[0]?.id;
            queryClient.invalidateQueries({ queryKey: ["financeEntries", resolvedWorkspaceId] });
        },
    });
}

export function useDeleteFinanceEntry(workspaceId: string | undefined) {
    const queryClient = useQueryClient();
    const { data: workspaces } = useWorkspaces();

    return useMutation({
        mutationFn: (id: string) => {
            return financeService.deleteEntry(id);
        },
        onSuccess: () => {
            const resolvedWorkspaceId = workspaceId || workspaces?.[0]?.id;
            queryClient.invalidateQueries({ queryKey: ["financeEntries", resolvedWorkspaceId] });
        },
    });
}

export function useCreateFinanceCategory(workspaceId: string | undefined) {
    const queryClient = useQueryClient();
    const { data: workspaces } = useWorkspaces();

    return useMutation({
        mutationFn: (data: { name: string; description?: string }) => {
            const resolvedWorkspaceId = workspaceId || workspaces?.[0]?.id;
            if (!resolvedWorkspaceId) throw new Error("Workspace ID is required");
            return financeService.createCategory(resolvedWorkspaceId, data);
        },
        onSuccess: () => {
            const resolvedWorkspaceId = workspaceId || workspaces?.[0]?.id;
            queryClient.invalidateQueries({ queryKey: ["financeCategories", resolvedWorkspaceId] });
        },
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
