import { api } from "@/lib/api";

export type DocumentCategory = {
  id: string;
  name: string;
  createdAt: string;
};

export type LibraryDocument = {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  accessLevel: number;
  createdAt: string;
  uploader: { id: string; firstName: string | null; lastName: string | null; avatar: string | null };
  category: { id: string; name: string } | null;
};

export type LibraryListResponse = {
  data: LibraryDocument[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export type LibraryLog = {
  id: string;
  action: string;
  resourceId: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  user: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
};

export type LibraryLogsResponse = {
  data: LibraryLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export const libraryService = {
  list: async (params: { search?: string; categoryId?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.search)     qs.set("search",     params.search);
    if (params.categoryId) qs.set("categoryId", params.categoryId);
    if (params.page)       qs.set("page",       String(params.page));
    if (params.limit)      qs.set("limit",      String(params.limit));
    const response = await api.get<LibraryListResponse>(`/api/v1/library?${qs}`);
    return response.data;
  },

  listCategories: async (): Promise<DocumentCategory[]> => {
    const response = await api.get<DocumentCategory[]>("/api/v1/library/categories");
    return response.data;
  },

  createCategory: async (name: string): Promise<DocumentCategory> => {
    const response = await api.post<DocumentCategory>("/api/v1/library/categories", { name });
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/library/categories/${id}`);
  },

  upload: async (formData: FormData) => {
    const response = await api.post<LibraryDocument>("/api/v1/library/upload", formData);
    return response.data;
  },

  download: async (id: string): Promise<{ url: string; fileName: string }> => {
    const response = await api.get<{ url: string; fileName: string }>(`/api/v1/library/${id}/download`);
    return response.data;
  },

  downloadZip: async (documentIds: string[]): Promise<void> => {
    let response;
    try {
      response = await api.post("/api/v1/library/download-zip", { documentIds }, {
        responseType: "blob",
        headers: { Accept: "application/zip" },
      });
    } catch (err: unknown) {
      // Axios wraps non-2xx as errors; parse blob body to extract message
      const axiosErr = err as { response?: { data?: unknown } };
      if (axiosErr?.response?.data instanceof Blob) {
        const text = await axiosErr.response.data.text();
        try {
          const json = JSON.parse(text) as { message?: string };
          throw new Error(json.message ?? "Erro ao gerar ZIP");
        } catch {
          throw new Error("Erro ao gerar ZIP");
        }
      }
      throw err;
    }

    const blob =
      response.data instanceof Blob
        ? response.data
        : new Blob([response.data as BlobPart], { type: "application/zip" });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "documentos-biblioteca.zip");
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  delete: async (id: string) => {
    await api.delete(`/api/v1/library/${id}`);
  },

  logs: async (params: { page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    const response = await api.get<LibraryLogsResponse>(`/api/v1/library/logs?${qs}`);
    return response.data;
  },
};
