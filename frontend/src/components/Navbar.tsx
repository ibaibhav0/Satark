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
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-xs transition-colors duration-150">
      {/* Top tricolor stripe */}
      <div className="h-1 bg-gradient-to-r from-orange-500 via-white to-green-600"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === "/dashboard"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>

              <Link
                href="/projects"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname?.startsWith("/projects")
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <FolderKanban className="w-4 h-4" />
                Projects
              </Link>

              {isInspector && (
                <Link
                  href="/inspections"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname?.startsWith("/inspections")
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  Live Field Inspections
                </Link>
              )}

              {(isAdmin || isOfficer) && (
                <Link
                  href="/alerts"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname?.startsWith("/alerts")
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Alerts & Anomalies
                </Link>
              )}

              {(isAdmin || isAuditor) && (
                <Link
                  href="/audit"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname?.startsWith("/audit")
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60"
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
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user.full_name}
              </div>
              <div className="mt-0.5">{getRoleBadge()}</div>
            </div>

            {/* Dark / Light Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-400 hover:text-amber-300 transition-transform duration-200 rotate-0 hover:rotate-45" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600 hover:text-indigo-600 transition-transform duration-200" />
              )}
            </button>

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
