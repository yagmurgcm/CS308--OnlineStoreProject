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

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(options.headers),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  try {
    return (await res.json()) as T;
  } catch {
    return undefined as unknown as T;
  }
}

async function requestBinary(
  path: string,
  options: RequestInit = {},
): Promise<Blob> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildAuthHeaders(options.headers),
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
