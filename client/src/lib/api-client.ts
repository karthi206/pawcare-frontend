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

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  singleFlight?: boolean;
}

// In-flight registry for single-dispatch requests to prevent duplicate concurrent network calls
type Resolver = {
  resolve: (res: Response) => void;
  reject: (err: unknown) => void;
};

const inFlightMap = new Map<string, Resolver[]>();

async function singleFlightFetch(
  key: string,
  fetcher: () => Promise<Response>
): Promise<Response> {
  if (inFlightMap.has(key)) {
    return new Promise<Response>((resolve, reject) => {
      inFlightMap.get(key)!.push({ resolve, reject });
    });
  }

  const waiters: Resolver[] = [];
  inFlightMap.set(key, waiters);

  try {
    const originalResponse = await fetcher();

    // Clone the response for all concurrent waiters before any caller consumes the body stream
    for (const waiter of waiters) {
      try {
        waiter.resolve(originalResponse.clone());
      } catch (err) {
        waiter.reject(err);
      }
    }

    return originalResponse;
  } catch (err) {
    for (const waiter of waiters) {
      waiter.reject(err);
    }
    throw err;
  } finally {
    inFlightMap.delete(key);
  }
}

/**
 * Safely parse JSON from a Response without throwing SyntaxError on HTML error responses.
 */
export async function safeParseJson<T = any>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Wrapper around fetch() for calls to the PawCare backend.
 *
 * - Always sends credentials, so the httpOnly auth cookie is included.
 * - For state-changing requests (POST/PUT/PATCH/DELETE), attaches the
 *   X-CSRF-TOKEN header and injects csrf_token into FormData if applicable.
 * - Includes configurable timeout (default 25s) with AbortController.
 * - Supports automatic transient retry on network drops and 502/503/504 errors for GET.
 * - Supports single-flight deduplication on POST /upload and when singleFlight: true.
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 25000, retries = 1, singleFlight, ...fetchOptions } = options;
  const method = (fetchOptions.method || "GET").toUpperCase();
  const headers = new Headers(fetchOptions.headers);

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set("X-CSRF-TOKEN", csrfToken);

      // Also append to FormData for multipart/form-data upload requests
      if (fetchOptions.body instanceof FormData && !fetchOptions.body.has("csrf_token")) {
        fetchOptions.body.append("csrf_token", csrfToken);
      }
    }
  }

  const url = path.startsWith("http") ? path : `${FLASK_API_URL}${path}`;

  const executeFetch = async (): Promise<Response> => {
    let lastError: unknown = null;
    const maxAttempts = method === "GET" ? Math.max(1, retries + 1) : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          credentials: "include",
          signal: fetchOptions.signal || controller.signal,
        });

        clearTimeout(timeoutId);

        // If server returned a transient gateway error and we have retries left
        if (attempt < maxAttempts && (response.status === 502 || response.status === 503 || response.status === 504)) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          continue;
        }

        return response;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err?.name === "AbortError") {
          lastError = new Error(`Request to ${path} timed out after ${timeoutMs / 1000}s`);
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          continue;
        }
      }
    }

    throw lastError || new Error(`Network request failed for ${path}`);
  };

  // Enforce single-dispatch semantics for /upload or when singleFlight is explicitly requested
  const isUploadPath = path === "/upload" || path === "/api/upload" || path.endsWith("/upload");
  const isSingleFlight = singleFlight === true || (singleFlight !== false && isUploadPath && method === "POST");

  if (isSingleFlight) {
    const flightKey = `${method}:${url}`;
    return singleFlightFetch(flightKey, executeFetch);
  }

  return executeFetch();
}
