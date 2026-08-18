import { API_URL as FLASK_API_URL } from "@/lib/config";

const CSRF_COOKIE_NAME = "csrf_access_token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let cachedCsrfToken: string | null =
  typeof window !== "undefined" ? sessionStorage.getItem("pawcare_csrf_token") : null;

/**
 * Stores or clears the cached CSRF token.
 */
export function setCsrfToken(token: string | null): void {
  cachedCsrfToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      sessionStorage.setItem("pawcare_csrf_token", token);
    } else {
      sessionStorage.removeItem("pawcare_csrf_token");
    }
  }
}

/**
 * Reads the CSRF token from document.cookie, falling back to cached/sessionStorage.
 */
export function getCsrfToken(): string | null {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
    const cookieVal = match ? decodeURIComponent(match[1]) : null;
    if (cookieVal) {
      setCsrfToken(cookieVal);
      return cookieVal;
    }
  }
  return cachedCsrfToken;
}

/**
 * Wrapper around fetch() for calls to the PawCare backend.
 *
 * - Always sends credentials, so the httpOnly auth cookie is included.
 * - For state-changing requests (POST/PUT/PATCH/DELETE), attaches the
 *   X-CSRF-TOKEN header and injects csrf_token into FormData if applicable.
 */
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set("X-CSRF-TOKEN", csrfToken);

      // Also append to FormData for multipart/form-data upload requests
      if (options.body instanceof FormData && !options.body.has("csrf_token")) {
        options.body.append("csrf_token", csrfToken);
      }
    }
  }

  return fetch(`${FLASK_API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
}