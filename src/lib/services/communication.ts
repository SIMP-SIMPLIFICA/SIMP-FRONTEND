import { api } from "@/lib/api";

// --- INTERFACES ---

export interface Attachment {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
}

export interface Recipient {
    id?: string;
    userId: string;
    role: "TO" | "CC" | "BCC";
    readAt?: string | null;
    signedAt?: string | null;
    canSign?: boolean;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
        username?: string;
    };
}

export type DocumentType = "OFICIO" | "MEMORANDO" | "OFICIO_CIRCULAR" | "DECRETO" | "PORTARIA" | "REQUERIMENTO" | "MENSAGEM";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface CreateDocumentDTO {
    title: string;
    content: string;
    documentType: DocumentType;
    documentNumber?: string;
    priority: Priority;
    recipients?: { userId: string; role: "TO" | "CC" | "BCC"; canSign?: boolean }[];
    attachments?: Omit<Attachment, "id">[];
    metadata?: Record<string, unknown>;
}

export interface CommunicationDocument {
    id: string;
    documentNumber?: string;
    protocolNumber?: string;
    title: string;
    content: string;
    documentType: DocumentType;
    status: "DRAFT" | "SENT" | "READ" | "SIGNED" | "ARCHIVED";
    priority: Priority;
    createdAt: string;
    updatedAt: string;
    sentAt?: string;
    userStatus?: "PENDING" | "READ" | "SIGNED";
    originalHash?: string;
    metadata?: Record<string, unknown>;
    createdBy: string;
    creator?: {
        id: string;
        username: string;
        firstName?: string;
        lastName?: string;
    };
    recipients?: Recipient[];
    attachments?: Attachment[];
    signatures?: {
        id: string;
        userId: string;
        signedAt: string;
        signatureType: string;
        user?: {
            firstName?: string;
            lastName?: string;
        }
    }[];
    verification?: {
        valid: boolean;
        hash: string;
    };
    auditTrail?: {
        event: string;
        timestamp: string;
        description: string;
        user?: {
            firstName: string;
            lastName: string;
        }
    }[];
    // Flags de permissão derivadas no backend (getById)
    isCreator?: boolean;
    isRecipient?: boolean;
    currentUserCanSign?: boolean;
    currentUserHasSigned?: boolean;
}

export interface CommunicationFilters {
    type?: string;
    startDate?: string;
    endDate?: string;
    personId?: string;
}

const BASE_URL = "/api/v1/communication";

const buildQueryString = (params?: Record<string, unknown>) => {
    if (!params) return "";
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, value.toString());
    });
    const str = query.toString();
    return str ? `?${str}` : "";
};

// --- API METHODS ---

export const communicationApi = {
    create: async (data: CreateDocumentDTO) => {
        const response = await api.post<CommunicationDocument>(`${BASE_URL}/documents`, data);
        return response.data;
    },

    listDrafts: async (params?: CommunicationFilters) => {
        const response = await api.get<CommunicationDocument[]>(`${BASE_URL}/drafts${buildQueryString(params)}`);
        return response.data;
    },

    listReceived: async (params?: CommunicationFilters) => {
        const response = await api.get<CommunicationDocument[]>(`${BASE_URL}/received${buildQueryString(params)}`);
        return response.data;
    },

    listSent: async (params?: CommunicationFilters) => {
        const response = await api.get<CommunicationDocument[]>(`${BASE_URL}/sent${buildQueryString(params)}`);
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<CommunicationDocument>(`${BASE_URL}/documents/${id}`);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateDocumentDTO>) => {
        const response = await api.put<CommunicationDocument>(`${BASE_URL}/documents/${id}`, data);
        return response.data;
    },

    send: async (id: string) => {
        const response = await api.post<{ message: string; protocol: string; document: CommunicationDocument }>(
            `${BASE_URL}/documents/${id}/send`,
            {}
        );
        return response.data;
    },

    downloadAttachment: async (documentId: string, attachmentId: string, fileName: string) => {
        const response = await api.get(`${BASE_URL}/documents/${documentId}/attachments/${attachmentId}/download`, {
            responseType: 'blob'
        });

        // Garante que é um Blob válido e com tipo para o navegador
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data as any]);
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = fileName; // Utiliza a propriedade nativa "download"

        document.body.appendChild(link);
        link.click();

        // Pequeno delay para garantir que o navegador iniciou o download antes de limpar
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 300);
    },

    delete: async (id: string) => {
        const response = await api.delete(`${BASE_URL}/documents/${id}`);
        return response.data;
    },

    // ADICIONADO: Método que faltava para a prévia
    getAttachmentPreviewUrl: async (documentId: string, attachmentId: string) => {
        const response = await api.get(`${BASE_URL}/documents/${documentId}/attachments/${attachmentId}/download`, {
            responseType: 'blob'
        });
        return window.URL.createObjectURL(new Blob([response.data as BlobPart], { type: 'application/pdf' }));
    },

    // ADICIONADO: Método de Assinatura
    sign: async (id: string) => {
        const response = await api.post<{ message: string; signatureHash: string }>(
            `${BASE_URL}/documents/${id}/sign`,
            {}
        );
        return response.data;
    },

    // ADICIONADO: Download do PDF principal do protocolo para PRÉVIA
    getDocumentPreviewUrl: async (documentId: string) => {
        const response = await api.get(`${BASE_URL}/documents/${documentId}/download`, {
            responseType: 'blob'
        });
        return window.URL.createObjectURL(new Blob([response.data as BlobPart], { type: 'application/pdf' }));
    },

    // ADICIONADO: Download do PDF principal do protocolo (sem precisar do attachmentId)
    downloadDocument: async (documentId: string, fileName: string = 'documento.pdf') => {
        const response = await api.get(`${BASE_URL}/documents/${documentId}/download`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data as BlobPart], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }
};

// --- UPLOAD API (ADICIONADO) ---
export const uploadApi = {
    uploadFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<{ fileName: string, fileUrl: string, fileType: string, fileSize: number }>(
            '/api/v1/upload',
            formData
        );
        return response.data;
    }
};
