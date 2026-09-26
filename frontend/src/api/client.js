// ── MediQ Real Backend HTTP Client ──
// Thin fetch wrapper: base URL, bearer token from the session, 401 handling,
// and unwraps the backend's {"error": {code, message, details}} envelope.

export const USE_MOCKS = String(import.meta.env.VITE_USE_MOCKS ?? "false") === "true";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const SESSION_KEY = "mediq_user";

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function clearSessionAndRedirect() {
  localStorage.removeItem(SESSION_KEY);
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(method, path, { body, params, auth = true } = {}) {
  const url = new URL(API_BASE_URL.replace(/\/$/, "") + path);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }

  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const session = getSession();
    if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  }

  let res;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the MediQ server. Is the backend running?", 0, "network_error");
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && auth) clearSessionAndRedirect();
    const message = data?.error?.message || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, data?.error?.code);
  }

  return data;
}

export const api = {
  get: (path, params) => request("GET", path, { params }),
  post: (path, body) => request("POST", path, { body }),
  put: (path, body) => request("PUT", path, { body }),
  patch: (path, body) => request("PATCH", path, { body }),
  getPublic: (path, params) => request("GET", path, { params, auth: false }),
  postPublic: (path, body) => request("POST", path, { body, auth: false }),
};
