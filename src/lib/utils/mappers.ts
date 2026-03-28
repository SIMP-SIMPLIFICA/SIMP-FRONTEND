export const taskStatusMap: Record<string, string> = {
    TODO: "A Fazer",
    IN_PROGRESS: "Em Progresso",
    IN_REVIEW: "Em Revisão",
    DONE: "Concluído",
};

export const taskPriorityMap: Record<string, string> = {
    LOW: "Baixa",
    MEDIUM: "Média",
    HIGH: "Alta",
    URGENT: "Urgente",
};

export const roleMap: Record<string, string> = {
    OWNER: "Proprietário",
    ADMIN: "Administrador",
    MEMBER: "Membro",
    VIEWER: "Visualizador",
};

export const auditActionMap: Record<string, string> = {
    ANEXOU_DOCUMENTO: "Anexou um documento",
    REMOVEU_DOCUMENTO: "Removeu um documento",
    CRIOU_PROCESSO: "Autuou o processo",
    STATUS_ALTERADO: "Alterou o status",
    ALTEROU_STATUS: "Alterou o status",
    VISUALIZOU: "Visualizou o processo",
};

export function formatAuditAction(action: string, metadata?: Record<string, unknown>): string {
    if (auditActionMap[action]) {
        const fileName = metadata?.fileName || metadata?.file?.name || metadata?.documentName;
        if (action === "ANEXOU_DOCUMENTO") {
            return fileName ? `Anexou o documento ${fileName}` : "Anexou um documento";
        }
        if (action === "REMOVEU_DOCUMENTO") {
            return fileName ? `Excluiu o documento ${fileName}` : "Excluiu um documento";
        }
        return auditActionMap[action];
    }

    return action
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase());
}
