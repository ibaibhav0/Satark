"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  AlertTriangle,
  FileCheck,
  FolderKanban,
  History,
  LayoutDashboard,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const isInspector = user.role === "field_inspector";
  const isOfficer = user.role === "district_officer";
  const isAuditor = user.role === "auditor";

  const getRoleBadge = () => {
    switch (user.role) {
      case "admin":
        return (
          <span className="bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded text-xs font-semibold uppercase">
            Admin
          </span>
        );
      case "field_inspector":
        return (
          <span className="bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded text-xs font-semibold uppercase">
            Field Inspector ({user.inspector_id})
          </span>
        );
      case "district_officer":
        return (
          <span className="bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50 px-2 py-0.5 rounded text-xs font-semibold uppercase">
            District Officer
          </span>
        );
      case "auditor":
        return (
          <span className="bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded text-xs font-semibold uppercase">
            Auditor
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed top-0 inset-x-0 z-50 p-4 pointer-events-none">
      <nav className="pointer-events-auto max-w-7xl mx-auto bg-white/70 dark:bg-[#0a0f1c]/70 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300 relative overflow-hidden">
        {/* Subtle top glow line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition-colors">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    SATARK
                  </span>
                  <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded font-semibold">
                    MPLADS
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-tight hidden sm:block">
                  Ministry of Statistics &amp; Programme Implementation · NIC · FY 2024-25
                </div>
              </div>
            </Link>


            {/* Navigation links */}
            <div className="hidden md:flex ml-8 space-x-1">
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  pathname === "/dashboard"
                    ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-white/5 text-cyan-600 dark:text-cyan-400"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>

              <Link
                href="/projects"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  pathname?.startsWith("/projects")
                    ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-white/5 text-cyan-600 dark:text-cyan-400"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                }`}
              >
                <FolderKanban className="w-4 h-4" />
                Projects
              </Link>

              {isInspector && (
                <Link
                  href="/inspections"
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    pathname?.startsWith("/inspections")
                      ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-white/5 text-cyan-600 dark:text-cyan-400"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  Live Field Inspections
                </Link>
              )}

              {(isAdmin || isOfficer) && (
                <Link
                  href="/alerts"
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    pathname?.startsWith("/alerts")
                      ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-white/5 text-cyan-600 dark:text-cyan-400"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Alerts & Anomalies
                </Link>
              )}

              {(isAdmin || isAuditor) && (
                <Link
                  href="/audit"
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    pathname?.startsWith("/audit")
                      ? "bg-white dark:bg-slate-800 shadow-sm border border-slate-200/50 dark:border-white/5 text-cyan-600 dark:text-cyan-400"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <History className="w-4 h-4" />
                  Audit Logs
                </Link>
              )}
            </div>
          </div>

          {/* User & Theme Toggle & Logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer"
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
            >
              {theme === "light" ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px] text-amber-400" />}
            </button>

            <div className="flex items-center gap-3 border-l border-slate-200 dark:border-slate-800/80 pl-4 ml-1">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{user.full_name}</span>
                {getRoleBadge()}
              </div>
              <div className="w-9 h-9 rounded-full bg-linear-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white dark:ring-[#0a0f1c]">
                {user.full_name.charAt(0)}
              </div>
            </div>

            <button
              onClick={logout}
              className="ml-2 p-2 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 dark:hover:text-red-400 transition-all cursor-pointer group"
              title="Sign out"
            >
              <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  </div>
  );
}
