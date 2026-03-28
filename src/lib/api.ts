import {
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  clearAuth,
} from "./auth";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Security Check: Forçar HTTPS em produção
if (import.meta.env.PROD && API_URL.startsWith("http://") && !API_URL.includes("localhost")) {
  console.warn("⚠️ SEGURANÇA: O Front-end está tentando se conectar a uma API insegura (HTTP) em ambiente de produção.");
}

type ApiOptions = RequestInit & { noAuth?: boolean; responseType?: 'json' | 'text' | 'blob' };

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const url = `${API_URL}${path}`;
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (!options.noAuth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";
  let data: unknown;

  if (options.responseType === 'blob') {
    data = await res.blob();
  } else if (contentType.includes("application/json")) {
    data = await res.json().catch(() => ({}));
  } else {
    data = await res.text();
  }

  if (res.status === 401 && !options.noAuth && !path.includes("/auth/login")) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => apiRequest<T>(path, options))
        .catch((err) => Promise.reject(err));
    }

    isRefreshing = true;
    const refreshToken = getRefreshToken();

    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccess = refreshData.accessToken || refreshData.token || refreshData.tokens?.accessToken;
          const newRefresh = refreshData.refreshToken || refreshData.tokens?.refreshToken;

          if (newAccess) {
            setAuthTokens(newAccess, newRefresh);
            processQueue(null, newAccess);
            isRefreshing = false;
            return apiRequest<T>(path, options);
          }
        }
      } catch {
        // Silent error
      }
    }

    isRefreshing = false;
    processQueue(data || "Sessão expirada");
    clearAuth();
    throw { message: "Sessão expirada. Faça login novamente." };
  }

  if (!res.ok) throw data;
  return data as T;
}

export const api = {
  get: <T>(path: string, options?: ApiOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }).then(data => ({ data })),

  post: <T>(path: string, body: unknown, options?: ApiOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }).then(data => ({ data })),

  put: <T>(path: string, body: unknown, options?: ApiOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }).then(data => ({ data })),

  patch: <T>(path: string, body: unknown, options?: ApiOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }).then(data => ({ data })),

  delete: <T>(path: string, options?: ApiOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }).then(data => ({ data })),
};
