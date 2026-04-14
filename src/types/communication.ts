export type MessageUser = {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  jobTitle?: string | null;
};

export type MessageStatus = "DRAFT" | "SENT" | "READ" | "ARCHIVED";

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

export type MessageReplyRecipient = {
  userId: string;
  readAt: string | null;
};

export type MessageReply = {
  id: string;
  title: string;
  content?: string | null;
  sentAt: string | null;
  creator: MessageUser;
  recipients: MessageReplyRecipient[];
};

export type MessageReplyTo = {
  id: string;
  title: string;
  sentAt: string | null;
  creator: MessageUser;
};

export type Message = {
  id: string;
  title: string;
  content: string;
  status: MessageStatus;
  sentAt: string | null;
  readAt: string | null;
  replyToId: string | null;
  replyTo: MessageReplyTo | null;
  replies: MessageReply[];
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
  status: MessageStatus;
  sentAt: string | null;
  replyToId: string | null;
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
  hasPermission?: boolean;
};
