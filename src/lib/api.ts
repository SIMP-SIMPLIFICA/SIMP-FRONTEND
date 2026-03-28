import {
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  clearAuth,
} from "./auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type ApiOptions = RequestInit & { noAuth?: boolean };

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

  // Apenas define JSON se NÃO for FormData (para permitir uploads)
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

  if (contentType.includes("application/json")) {
    data = await res.json().catch(() => ({}));
  } else {
    data = await res.text();
  }

  if (res.status === 401 && !options.noAuth && !path.includes("/auth/login")) {
    console.warn(`⚠️ [API] 401 detectado em ${path}. Tentando refresh...`);
    
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
            console.log("✅ [API] Token renovado com sucesso!");
            setAuthTokens(newAccess, newRefresh);
            processQueue(null, newAccess);
            isRefreshing = false;
            return apiRequest<T>(path, options);
          }
        }
      } catch (refreshErr) {
        console.error("❌ [API] Falha no refresh:", refreshErr);
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

// --- ADAPTER PARA SERVIÇOS ---
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