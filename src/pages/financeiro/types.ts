export type EntryType = "EXPENSE" | "INCOME";
export type AttachmentStatus = "none" | "pending" | "ok";

export interface FinanceEntry {
    id: string;
    occurredAt: string; // ISO string
    description: string;
    categoryName: string;
    amountCents: number;
    type: EntryType;
    subcategoryName?: string;
    nfeNumber?: string;
    issueDate?: string;
    providerDocument?: string;
    empenhoNumber?: string;
    liquidacaoNumber?: string;
    deliveryDate?: string;
    attachmentsStatus: AttachmentStatus;
}
