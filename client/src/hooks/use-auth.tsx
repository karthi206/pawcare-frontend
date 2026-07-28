import { createContext, useContext, useState, useEffect, ReactNode } from "react";

import { API_URL as FLASK_API_URL } from "@/lib/config";
const TOKEN_STORAGE_KEY = "pawcare_auth_token";

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
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
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
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app load, check if a token was saved from a previous session and restore it
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      fetchCurrentUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const response = await fetch(`${FLASK_API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setToken(authToken);
      } else {
        // Token invalid/expired - clear it
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (err) {
      console.error("Failed to fetch current user:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(`${FLASK_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: "Could not reach the server" };
    }
  };

  const register = async (registerData: RegisterData) => {
    try {
      const response = await fetch(`${FLASK_API_URL}/auth/register`, {
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

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
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
