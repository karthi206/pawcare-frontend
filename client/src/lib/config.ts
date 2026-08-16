// Central place for the backend API URL.
//
// In production (Vercel), requests go through the /api/* rewrite proxy
// defined in vercel.json, which forwards them to the Render backend
// server-side. This keeps the browser talking to a single origin
// (pawcare-frontend-azure.vercel.app) so the httpOnly auth cookie is
// treated as first-party — third-party cookie blocking (Safari, Firefox,
// and increasingly Chrome) was silently breaking auth when the frontend
// called onrender.com directly.
//
// Locally, VITE_API_URL isn't set, so this falls back to hitting your
// Flask dev server directly. Note: cookie-based auth (SameSite=Lax) may
// still not work locally in this direct-connection mode, since
// localhost:5173 and 127.0.0.1:5000 are different origins/ports — see
// vite.config.ts for a local dev proxy if you want the same first-party
// cookie behavior locally that the Vercel /api rewrite gives you in prod.
export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";