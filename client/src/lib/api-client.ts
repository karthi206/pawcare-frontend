import { API_URL as FLASK_API_URL } from "@/lib/config";

const CSRF_COOKIE_NAME = "csrf_access_token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Reads a cookie value by name. Only works for cookies NOT marked httpOnly —
 * the JWT itself is httpOnly and deliberately invisible to JS; this cookie
 * exists specifically so the frontend CAN read it and echo it back as a
 * header (the CSRF "double submit" pattern).
 */
function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Wrapper around fetch() for calls to the PawCare backend.
 *
 * - Always sends credentials, so the httpOnly auth cookie is included.
 * - For state-changing requests (POST/PUT/PATCH/DELETE), attaches the
 *   X-CSRF-TOKEN header the backend requires alongside the cookie.
 * - `path` should start with "/", e.g. apiFetch("/cases").
 *
 * Any existing component that manually did:
 *   fetch(`${FLASK_API_URL}/cases`, { headers: { Authorization: `Bearer ${token}` } })
 * should be updated to:
 *   apiFetch("/cases")
 * — the token/localStorage pattern this replaces no longer works, since the
 * token is no longer accessible to JavaScript at all.
 */
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers.set("X-CSRF-TOKEN", csrfToken);
    }
  }

  return fetch(`${FLASK_API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}