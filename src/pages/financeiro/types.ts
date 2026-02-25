export type EntryType = "EXPENSE" | "INCOME";
export type AttachmentStatus = "none" | "pending" | "ok";

export interface FinanceEntry {
    id: string;
    occurredAt: string; // ISO string
    description: string;
    categoryName: string;
    amountCents: number;
    type: EntryType;
    attachmentsStatus: AttachmentStatus;
}
