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
    <div className="min-h-screen bg-slate-50 dark:bg-transparent text-slate-900 dark:text-slate-100 flex items-center justify-center relative transition-colors animate-fade-in overflow-hidden">
      {/* Decorative Cyber Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[70%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/10 blur-[140px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-cyan-500/10 dark:bg-cyan-500/10 blur-[120px] pointer-events-none mix-blend-screen" />

      {/* Theme Toggle in Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-lg cursor-pointer hover:scale-105 active:scale-95"
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-amber-400" />}
        </button>
      </div>

      <div className="w-full max-w-6xl mx-4 grid lg:grid-cols-2 gap-0 bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden relative z-10 animate-fade-in-up">
        
        {/* Left Side: Branding & Info */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-linear-to-br from-indigo-600 to-cyan-700 text-white relative overflow-hidden">
          {/* Internal gradient overlay for depth */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none animate-pulse-slow"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-xl">
                <ShieldCheck className="w-10 h-10 text-cyan-300" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">SATARK<span className="font-light opacity-90">-MPLADS</span></h1>
                <p className="text-cyan-100 text-sm font-medium tracking-wide uppercase mt-1">National Informatics Centre</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold leading-tight mb-6 mt-16 drop-shadow-lg">
              Next-Generation<br/>
              <span className="text-cyan-300">Evidence Intelligence</span>
            </h2>
            <p className="text-lg text-indigo-100/90 leading-relaxed max-w-md font-light">
              Secure access portal for authorized personnel. Utilizing AI forensics, satellite change detection, and cryptographic provenance to ensure transparent MPLADS fund utilization.
            </p>
          </div>

          <div className="relative z-10 text-sm font-medium text-indigo-200/80 border-t border-white/20 pt-6 mt-12 flex justify-between items-center">
            <span>Govt. of India • MoSPI</span>
            <span className="bg-white/10 px-3 py-1 rounded-full text-xs border border-white/10 backdrop-blur-xs">V 2.4.0-SECURE</span>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 lg:p-14 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-cyan-400" />
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">SATARK<span className="font-light">-MPLADS</span></h1>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Secure Authentication</h2>
            <p className="text-slate-500 dark:text-slate-400">Enter your official credentials to access the portal.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 mb-8">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Official Email</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder-slate-400 shadow-inner"
                  placeholder="name@satark.gov.in"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <a href="#" className="text-xs font-medium text-indigo-600 dark:text-cyan-400 hover:underline">Forgot password?</a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder-slate-400 shadow-inner"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg p-3.5 animate-fade-in shadow-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 dark:shadow-cyan-500/20 transition-all cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : "Sign In"}
            </button>
          </form>

          {/* Quick Access Presets (for review/demo purposes) */}
          <div className="mt-auto pt-8 border-t border-slate-200 dark:border-white/10">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-full h-px bg-slate-200 dark:bg-white/10"></span>
              Quick Presets
              <span className="w-full h-px bg-slate-200 dark:bg-white/10"></span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(DEMO_CREDENTIALS) as Array<keyof typeof DEMO_CREDENTIALS>).map((role) => (
                <button
                  key={role}
                  onClick={() => quickLogin(role)}
                  disabled={loading}
                  className="flex flex-col items-start px-4 py-3 border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all cursor-pointer group"
                >
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-cyan-400 transition-colors">{DEMO_CREDENTIALS[role].label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">{DEMO_CREDENTIALS[role].email}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
