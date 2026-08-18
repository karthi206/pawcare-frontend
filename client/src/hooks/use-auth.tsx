import { createContext, useContext, useState, useEffect, ReactNode } from "react";

import { apiFetch, setCsrfToken } from "@/lib/api-client";

interface User {
  id: number;
  username: string;
  email: string;
  role: "user" | "vet" | "admin";
  license_number: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  is_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  role: "user" | "vet";
  license_number?: string;
  clinic_name?: string;
  clinic_address?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app load, ask the backend if the browser is carrying a valid auth
  // cookie. There's no token in localStorage to check anymore — the cookie
  // (invisible to JS) is sent automatically by the browser if present.
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await apiFetch("/auth/me");
      if (response.ok) {
        const userData = await response.json();
        if (userData.csrf_token) {
          setCsrfToken(userData.csrf_token);
        }
        setUser(userData);
      } else {
        setUser(null);
        setCsrfToken(null);
      }
    } catch (err) {
      console.error("Failed to fetch current user:", err);
      setUser(null);
      setCsrfToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      if (data.csrf_token) {
        setCsrfToken(data.csrf_token);
      }
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: "Could not reach the server" };
    }
  };

  const register = async (registerData: RegisterData) => {
    try {
      const response = await apiFetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerData),
      });
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: "Could not reach the server" };
    }
  };

  const logout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Failed to log out cleanly:", err);
    } finally {
      // Clear client state regardless of whether the network call
      // succeeded, so the UI never gets stuck showing a logged-in user.
      setUser(null);
      setCsrfToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook - lets any component say `const { user, login } = useAuth()`
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}