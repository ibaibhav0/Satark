"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, clearAuthToken, getAuthToken, setAuthToken, UserProfile } from "@/lib/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  quickLogin: (role: "admin" | "inspector1" | "inspector2" | "inspector3" | "officer" | "auditor") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_CREDENTIALS = {
  admin: { email: "admin@satark.gov.in", pass: "admin123", label: "Admin (Dr. Rajesh Kumar)" },
  inspector1: { email: "inspector1@satark.gov.in", pass: "inspector123", label: "Inspector 1 — INS-0042 (Priya Sharma)" },
  inspector2: { email: "inspector2@satark.gov.in", pass: "inspector123", label: "Inspector 2 — INS-0078 (Amit Patel)" },
  inspector3: { email: "inspector3@satark.gov.in", pass: "inspector123", label: "Inspector 3 — INS-0105 (Kavitha Reddy)" },
  officer: { email: "officer@satark.gov.in", pass: "officer123", label: "District Officer (Sanjay Mehra IAS)" },
  auditor: { email: "auditor@satark.gov.in", pass: "auditor123", label: "Auditor (Meena Iyer)" },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const profile = await api.getMe();
        setUser(profile);
      } catch (err) {
        // Token is invalid or expired; silently clear it and reset state
        clearAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, pass);
      setAuthToken(res.access_token);
      const profile = await api.getMe();
      setUser(profile);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (role: keyof typeof DEMO_CREDENTIALS) => {
    const cred = DEMO_CREDENTIALS[role];
    await login(cred.email, cred.pass);
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, quickLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
