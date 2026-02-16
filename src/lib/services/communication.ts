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
    user?: {
        id: string;
        firstName: string;
        lastName: string;
        avatar?: string;
        username?: string;
    };
}

export type DocumentType = "OFICIO" | "MEMORANDO" | "CIRCULAR";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface CreateDocumentDTO {
    title: string;
    content: string;
    documentType: DocumentType;
    documentNumber?: string;
    priority: Priority;
    recipients?: { userId: string; role: "TO" | "CC" | "BCC" }[];
    attachments?: Omit<Attachment, "id">[];
    metadata?: Record<string, any>;
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
    metadata?: Record<string, any>;
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
}

const BASE_URL = "/api/v1/communication";

// --- API METHODS ---

export const communicationApi = {
    create: async (data: CreateDocumentDTO) => {
        const response = await api.post<CommunicationDocument>(`${BASE_URL}/documents`, data);
        return response.data;
    },

    listDrafts: async () => {
        const response = await api.get<CommunicationDocument[]>(`${BASE_URL}/drafts`);
        return response.data;
    },

    listReceived: async () => {
        const response = await api.get<CommunicationDocument[]>(`${BASE_URL}/received`);
        return response.data;
    },

    listSent: async () => {
        const response = await api.get<CommunicationDocument[]>(`${BASE_URL}/sent`);
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
        const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
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
