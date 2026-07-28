// Central place for the backend API URL.
// In production (Vercel), this comes from the VITE_API_URL environment variable.
// Locally, if that variable isn't set, it falls back to your Flask dev server.
export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
