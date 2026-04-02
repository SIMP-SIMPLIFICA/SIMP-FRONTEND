export type MessageUser = {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  jobTitle?: string | null;
};

export type MessageAttachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
};

export type MessageRecipient = {
  id: string;
  userId: string;
  role: "TO" | "CC" | "BCC";
  canView: boolean;
  readAt: string | null;
  user: MessageUser;
};

export type Message = {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "SENT" | "READ" | "ARCHIVED";
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
  creator: MessageUser;
  recipients: MessageRecipient[];
  attachments: MessageAttachment[];
  isCreator?: boolean;
  isRecipient?: boolean;
};

export type MessageListItem = {
  id: string;
  title: string;
  status: "DRAFT" | "SENT" | "READ" | "ARCHIVED";
  sentAt: string | null;
  creator: MessageUser;
  recipients?: MessageRecipient[];
  isRead?: boolean;
};

export type Recipient = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string | null;
  role: string;
};
