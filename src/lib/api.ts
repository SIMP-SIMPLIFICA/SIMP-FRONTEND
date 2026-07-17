import {
  getAccessToken,
  setAuthTokens,
  getImpersonateRefreshToken,
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

  // Set JSON content-type only when not sending FormData
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any;

  if (contentType.includes("application/json")) {
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

    // During impersonation the super-admin's httpOnly cookie must NOT be used —
    // we send the impersonated refresh token in the body with credentials:'omit'
    // so the browser neither sends nor overwrites the super-admin's cookie.
    // For normal sessions the cookie is the sole source of truth (no body token).
    const impersonateRefresh = getImpersonateRefreshToken();

    try {
      // Normal sessions: rely on the httpOnly cookie — send NO body and NO Content-Type
      // so Fastify's JSON parser is not triggered on an empty payload.
      // Impersonation: must send the refresh token in the body (cookie must not be used).
      const refreshRes = await fetch(`${API_URL}/api/v1/auth/refresh-token`, {
        method: "POST",
        credentials: impersonateRefresh ? "omit" : "include",
        ...(impersonateRefresh
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken: impersonateRefresh }),
            }
          : {}),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newAccess =
          refreshData.accessToken ||
          refreshData.token ||
          refreshData.tokens?.accessToken;

        if (newAccess) {
          // For body-based (impersonation) refreshes the backend returns the rotated
          // refresh token in the body so we can keep the in-memory token current.
          // For cookie-based refreshes this field is undefined — passing undefined to
          // setAuthTokens leaves _impersonateRefreshToken unchanged (correct).
          const newImpersonateRefresh = refreshData.tokens?.refreshToken as string | undefined;
          setAuthTokens(newAccess, newImpersonateRefresh);

          processQueue(null, newAccess);
          isRefreshing = false;
          return apiRequest<T>(path, options);
        }
      }
    } catch {
      // network error during refresh — fall through to logout
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T>(path: string, body: any, options?: ApiOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }).then(data => ({ data })),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put: <T>(path: string, body: any, options?: ApiOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }).then(data => ({ data })),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: <T>(path: string, body: any, options?: ApiOptions) =>
    apiRequest<T>(path, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body)
    }).then(data => ({ data })),

  delete: <T>(path: string, options?: ApiOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }).then(data => ({ data })),
};
