// ── JWT Token Management & Auth Fetch Helper ────────────────────────────────
// All API calls go through authFetch() which automatically attaches the JWT.

const TOKEN_KEY = "saarthi.token";
const API_URL = () => import.meta.env.VITE_API_URL || "http://localhost:3001";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Wrapper around fetch() that injects the Authorization: Bearer header.
 * Use this for all authenticated API calls.
 */
export async function authFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = getToken();
  const url = `${API_URL()}${path}`;
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  // Don't set Content-Type for FormData (let browser set boundary)
  if (!(init?.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url, { ...init, headers });
}
