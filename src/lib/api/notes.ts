import { api } from "../api";

export interface Note {
  id: string;
  title: string | null;
  content: string;
  color: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  title?: string;
  content: string;
  color?: string;
}

export type UpdateNoteInput = Partial<CreateNoteInput>;

export const notesService = {
  list: async () => {
    const res = await api.get<Note[]>("/api/v1/utilities/notes");
    return res.data;
  },

  create: async (data: CreateNoteInput) => {
    const res = await api.post<Note>("/api/v1/utilities/notes", data);
    return res.data;
  },

  update: async (id: string, data: UpdateNoteInput) => {
    const res = await api.put<Note>(`/api/v1/utilities/notes/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    await api.delete(`/api/v1/utilities/notes/${id}`);
  },
};
