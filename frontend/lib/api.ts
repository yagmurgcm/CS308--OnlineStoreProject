export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Use backend directly (ENV) or fall back to localhost:3001; /api proxy is also available.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001"; // CORS is enabled on backend

const buildAuthHeaders = (headers?: HeadersInit) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {}),
  };
};

type NextFetchOptions = RequestInit & { next?: { revalidate?: number } };

async function request<T>(
  path: string,
  options: NextFetchOptions = {},
): Promise<T> {
  const { headers: customHeaders, next, cache, ...rest } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    cache: cache ?? "no-store",
    next: { revalidate: 0, ...(next || {}) },
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(customHeaders),
    },
  });

  if (!res.ok) {
    // Don't throw error for 401 Unauthorized - let the caller handle it
    if (res.status === 401) {
      const error = new Error("Unauthorized") as Error & { status: number };
      error.status = 401;
      throw error;
    }
    
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.message === "string") {
        message = data.message;
      }
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }
    throw new Error(message);
  }

  try {
    return (await res.json()) as T;
  } catch {
    return undefined as unknown as T;
  }
}

async function requestBinary(
  path: string,
  options: NextFetchOptions = {},
): Promise<Blob> {
  const { headers: customHeaders, next, cache, ...rest } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    cache: cache ?? "no-store",
    next: { revalidate: 0, ...(next || {}) },
    ...rest,
    headers: buildAuthHeaders(customHeaders),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.blob();
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, options),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  getBinary: (path: string) => requestBinary(path),
};

export type AuthResponse = { access_token: string };
