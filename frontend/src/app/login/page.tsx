"use client";

import { useState } from "react";
import { useAuth, DEMO_CREDENTIALS } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { AlertCircle, Moon, ShieldCheck, Sun } from "lucide-react";

export default function LoginPage() {
  const { login, loading, quickLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 relative transition-colors">
      {/* Theme Toggle in Top Right */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
        </button>
      </div>

      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ShieldCheck className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">SATARK-MPLADS</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg">Evidence-driven MPLADS Monitoring & Fraud Detection Platform</p>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">Smart India Hackathon 2026 — Problem Statement 102</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Manual Login */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 p-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Login</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                  placeholder="your.email@satark.gov.in"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-md p-3">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>

          {/* Quick Demo Login */}
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md border border-slate-200 dark:border-slate-800 p-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Demo Quick Login</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">SIH 2026 Demo — Click any role to login instantly</p>
            <div className="space-y-2">
              {(Object.keys(DEMO_CREDENTIALS) as Array<keyof typeof DEMO_CREDENTIALS>).map((role) => (
                <button
                  key={role}
                  onClick={() => quickLogin(role)}
                  disabled={loading}
                  className="w-full text-left px-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className="font-medium text-slate-900 dark:text-white">{DEMO_CREDENTIALS[role].label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{DEMO_CREDENTIALS[role].email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-slate-500 dark:text-slate-400">
          <p>Government of India — Ministry of Statistics and Programme Implementation</p>
          <p className="mt-1">All rights reserved © 2026</p>
        </div>
      </div>
    </div>
  );
}
