import { api } from "../api"; // Sua instância do Axios configurada

// DTOs (Tipos de Dados)
export interface CreateDocumentDTO {
  title: string;
  content: string;
  documentType: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  recipients?: { userId: string; role: "TO" | "CC" | "BCC" }[];
}

export type DocumentVerification = {
  protocol: string | null;  // e.g., "20260205-0001"
  hash: string | null;      // SHA-256 hash
  url: string;              // Verification Link
  timestamp: string | null; // ISO Date String
  valid: boolean;           // true if signed/sent
}

export interface CommunicationDocument {
  id: string;
  documentNumber?: string;
  protocolNumber?: string;
  title: string;
  content: string;
  documentType: string;
  status: "DRAFT" | "SENT" | "READ" | "SIGNED";
  priority: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  sentAt?: string;
  signatures?: {
    id: string;
    userId: string;
    userName: string;
    signedAt: string;
    signatureType: "AUTO" | "MANUAL";
  }[];
  originalHash?: string;
  verification?: DocumentVerification;
}

// Configuração da URL Base
// Ajustado para incluir /api/v1 para evitar o erro 404
const BASE_URL = "/api/v1/communication";

export const communicationApi = {
  // Criar Rascunho
  create: async (data: CreateDocumentDTO) => {
    const response = await api.post<CommunicationDocument>(`${BASE_URL}/documents`, data);
    return response.data;
  },

  // Listar Rascunhos
  listDrafts: async () => {
    const response = await api.get<CommunicationDocument[]>(`${BASE_URL}/drafts`);
    return response.data;
  },

  // Listar Recebidos (Inbox)
  listReceived: async () => {
    const response = await api.get<CommunicationDocument[]>(`${BASE_URL}/received`);
    return response.data;
  },

  // Listar Enviados (Sent)
  listSent: async () => {
    const response = await api.get<CommunicationDocument[]>(`${BASE_URL}/sent`);
    return response.data;
  },

  // Pegar Detalhes
  getById: async (id: string) => {
    const response = await api.get<CommunicationDocument>(`${BASE_URL}/documents/${id}`);
    return response.data;
  },

  // Atualizar Rascunho
  update: async (id: string, data: Partial<CreateDocumentDTO>) => {
    const response = await api.put<CommunicationDocument>(`${BASE_URL}/documents/${id}`, data);
    return response.data;
  },

  // Deletar Rascunho
  delete: async (id: string) => {
    await api.delete(`${BASE_URL}/documents/${id}`);
  },

  // Protocolar e Enviar (Novo)
  send: async (id: string) => {
    const response = await api.post<{ message: string; protocol: string; document: CommunicationDocument }>(
      `${BASE_URL}/documents/${id}/send`,
      {} // <--- ADICIONE ESTE OBJETO VAZIO
    );
    return response.data;
  }
};