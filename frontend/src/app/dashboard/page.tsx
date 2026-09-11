"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, DashboardStats, ProjectItem, AlertItem, SummonsItem, InspectorRequestItem } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { InspectorManagementModal } from "@/components/InspectorManagementModal";
import { ExpenseBillModal } from "@/components/ExpenseBillModal";
import { StatusBadge, RiskBadge, SeverityBadge } from "@/components/StatusBadge";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Filter,
  FolderKanban,
  MapPin,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summonsList, setSummonsList] = useState<SummonsItem[]>([]);
  const [inspectorRequests, setInspectorRequests] = useState<InspectorRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Interactive filter state for stat cards
  const [selectedMetric, setSelectedMetric] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspector management modal state (Admin & District Officer)
  const [showInspectorManagementModal, setShowInspectorManagementModal] = useState(false);

  // Field Inspector Expense Bill Modal state (Field Inspector only)
  const [billModalProject, setBillModalProject] = useState<ProjectItem | null>(null);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const isPrivileged = user.role === "admin" || user.role === "district_officer";
      const [statsData, projectsData, alertsData, summonsData, reqsData] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getProjects({ page: 1, page_size: 100 }),
        api.getAlerts().catch(() => []),
        api.getSummons().catch(() => []),
        isPrivileged ? api.getInspectorRequests().catch(() => []) : Promise.resolve([]),
      ]);

      if (statsData) setStats(statsData);
      setProjects(projectsData.projects);
      setAlerts(alertsData.slice(0, 6));
      setSummonsList(summonsData);
      setInspectorRequests(reqsData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      loadData();
    }
  }, [user, authLoading]);


  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading SATARK Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isInspector = user.role === "field_inspector";

  // Compute exact metrics from projects array
  const totalCount = projects.length;
  const activeCount = projects.filter(
    (p) => p.status !== "completed" && p.status !== "closed" && p.status !== "cancelled"
  ).length;
  const criticalRiskCount = projects.filter((p) => (p.latest_risk_score ?? 0) > 80).length;
  const highRiskCount = projects.filter(
    (p) => (p.latest_risk_score ?? 0) > 60 && (p.latest_risk_score ?? 0) <= 80
  ).length;
  const mediumRiskCount = projects.filter(
    (p) => (p.latest_risk_score ?? 0) >= 50 && (p.latest_risk_score ?? 0) <= 60
  ).length;
  const lowRiskCount = projects.filter((p) => (p.latest_risk_score ?? 0) < 50).length;
  const completedCount = projects.filter(
    (p) => p.status === "completed" || p.status === "closed"
  ).length;

  // Filter projects based on selected metric and search query
  const filteredProjects = projects.filter((project) => {
    const score = project.latest_risk_score ?? 0;
    const isCompleted = project.status === "completed" || project.status === "closed";
    const isActive = !isCompleted && project.status !== "cancelled";

    let matchesMetric = true;
    switch (selectedMetric) {
      case "active":
        matchesMetric = isActive;
        break;
      case "critical_risk":
        matchesMetric = score > 80;
        break;
      case "high_risk":
        matchesMetric = score > 60 && score <= 80;
        break;
      case "medium_risk":
        matchesMetric = score >= 50 && score <= 60;
        break;
      case "low_risk":
        matchesMetric = score < 50;
        break;
      case "completed":
        matchesMetric = isCompleted;
        break;
      case "all":
      default:
        matchesMetric = true;
        break;
    }

    if (!matchesMetric) return false;

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchCode = project.project_code.toLowerCase().includes(q);
      const matchName = project.name.toLowerCase().includes(q);
      const matchLoc = project.village_locality?.toLowerCase().includes(q) || false;
      const matchDist = project.district?.toLowerCase().includes(q) || false;
      const matchInsp = project.current_inspector_name?.toLowerCase().includes(q) || false;
      return matchCode || matchName || matchLoc || matchDist || matchInsp;
    }

    return true;
  });

  const getMetricTitle = () => {
    switch (selectedMetric) {
      case "active":
        return "Active Ongoing Projects (In Progress)";
      case "critical_risk":
        return "Critical Risk Projects (Risk Factor > 80%)";
      case "high_risk":
        return "High Risk Projects (Risk Factor 60% – 80%)";
      case "medium_risk":
        return "Medium Risk Projects (Risk Factor 50% – 60%)";
      case "low_risk":
        return "Low Risk Projects (Risk Factor < 50%)";
      case "completed":
        return "Completed Projects (100% Verified)";
      case "all":
      default:
        return user.role === "field_inspector"
          ? "All Assigned Field Projects"
          : user.role === "district_officer"
          ? "All District Projects"
          : "All Monitored Projects";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-150">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl border border-slate-200/60 dark:border-white/10 p-8 mb-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] relative overflow-hidden">
          {/* Subtle gradient accent inside banner */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/15 dark:bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none mix-blend-screen"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/15 dark:bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none mix-blend-screen"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Welcome back, {user.full_name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                {user.role === "field_inspector"
                  ? `Inspector ID: ${user.inspector_id} · ${user.district || "District"} · Scope restricted to assigned project sites only`
                  : user.role === "district_officer"
                  ? `Jurisdiction: ${user.district} · District-level MPLADS monitoring under MOSPI/DPA 2024-25`
                  : user.role === "auditor"
                  ? "System-wide audit trail access · MPLADS Compliance & CAG Reporting View"
                  : `All Districts · SATARK Centralised MPLADS Monitoring Platform · FY 2024-25`}
              </p>
            </div>

            {isInspector ? (
              <Link
                href="/inspections"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors shadow-xs"
              >
                <Camera className="w-4 h-4" />
                Start Field Inspection
              </Link>
            ) : (
              <div className="flex flex-wrap items-center gap-2.5">
                {(user.role === "admin" || user.role === "district_officer") && (
                  <button
                    type="button"
                    onClick={() => setShowInspectorManagementModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium text-sm transition-colors shadow-xs cursor-pointer"
                  >
                    <Users className="w-4 h-4" />
                    Inspector Management
                    {inspectorRequests.filter((r) => r.status === "pending").length > 0 && (
                      <span className="bg-amber-300 text-slate-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shadow-xs">
                        {inspectorRequests.filter((r) => r.status === "pending").length}
                      </span>
                    )}
                  </button>
                )}
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors shadow-xs"
                >
                  <FolderKanban className="w-4 h-4" />
                  Manage Projects
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Admin Pending Inspector Requests Notice Banner */}
        {user.role === "admin" && inspectorRequests.some((r) => r.status === "pending") && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900/60 rounded-lg p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase">
                  District Officer Field Inspector Requests Pending ({inspectorRequests.filter((r) => r.status === "pending").length})
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  District Officers have submitted requests to add or decommission field inspectors in their jurisdictions awaiting your approval.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInspectorManagementModal(true)}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded border border-emerald-300 dark:border-emerald-800 shadow-xs self-start sm:self-auto cursor-pointer"
            >
              Review & Approve Requests
            </button>
          </div>
        )}

        {/* District Officer Inspector Request Status Banner */}
        {user.role === "district_officer" && inspectorRequests.length > 0 && (
          <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase">Field Inspector Management Requests</h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {inspectorRequests.filter((r) => r.status === "pending").length} pending Admin approval •{" "}
                  {inspectorRequests.filter((r) => r.status === "approved").length} approved •{" "}
                  {inspectorRequests.filter((r) => r.status === "rejected").length} rejected
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInspectorManagementModal(true)}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-white bg-white dark:bg-slate-900 px-3 py-1.5 rounded border border-emerald-200 dark:border-emerald-800 shadow-xs self-start sm:self-auto cursor-pointer"
            >
              Manage / Request Inspectors
            </button>
          </div>
        )}

        {/* Inspector Pending Summons Notice Banner */}
        {isInspector && summonsList.some((s) => s.status === "pending") && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 rounded-lg p-5 mb-8 shadow-xs">
            <div className="flex items-start gap-3.5">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Administrative Action Required: {summonsList.filter((s) => s.status === "pending").length} Summons / Directives Pending
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  The District Officer has requested comprehensive field explanation reports regarding high risk or physical progress discrepancies on your assigned projects.
                </p>
                <div className="mt-3 space-y-2">
                  {summonsList
                    .filter((s) => s.status === "pending")
                    .map((summons) => (
                      <div
                        key={summons.id}
                        className="bg-white dark:bg-slate-900 p-3 rounded border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{summons.summons_code}</span>
                          <span className="text-slate-400 dark:text-slate-600 mx-1.5">•</span>
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{summons.project_name || summons.project_code}</span>
                          <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5 line-clamp-1">{summons.reason}</p>
                        </div>
                        <Link
                          href={`/projects/${summons.project_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium flex-shrink-0"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Submit Report
                        </Link>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* District Officer Summons Status Banner */}
        {user.role === "district_officer" && summonsList.length > 0 && (
          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-lg p-4 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase">Active Field Inquiries & Summons</h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  {summonsList.filter((s) => s.status === "pending").length} awaiting inspector response •{" "}
                  {summonsList.filter((s) => s.status === "responded").length} clarification reports ready for your review
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMetric("all")}
              className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white bg-white dark:bg-slate-900 px-3 py-1.5 rounded border border-indigo-200 dark:border-indigo-800 shadow-xs self-start sm:self-auto cursor-pointer"
            >
              View Summons Projects
            </button>
          </div>
        )}

        {/* Interactive Stats Grid - Clickable for Instant Details */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Project Metrics Overview (Click card to filter details)
            </h2>
            {selectedMetric !== "all" && (
              <button
                onClick={() => setSelectedMetric("all")}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" /> Reset Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: Total Projects */}
            <div
              onClick={() => setSelectedMetric("all")}
              className={`p-5 rounded-2xl transition-all duration-300 cursor-pointer select-none relative overflow-hidden group ${
                selectedMetric === "all"
                  ? "bg-indigo-50/90 dark:bg-indigo-900/40 border border-indigo-500/50 shadow-lg shadow-indigo-500/20 transform scale-[1.02]"
                  : "bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 hover:border-indigo-400/50 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:shadow-lg hover:-translate-y-1"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Total
                </span>
                <FolderKanban className={`w-4 h-4 ${selectedMetric === "all" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">{totalCount}</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">All scoped works</p>
            </div>

            {/* Card 2: Active Ongoing Projects */}
            <div
              onClick={() => setSelectedMetric("active")}
              className={`p-5 rounded-2xl transition-all duration-300 cursor-pointer select-none relative overflow-hidden group ${
                selectedMetric === "active"
                  ? "bg-emerald-50/90 dark:bg-emerald-900/40 border border-emerald-500/50 shadow-lg shadow-emerald-500/20 transform scale-[1.02]"
                  : "bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 hover:border-emerald-400/50 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:shadow-lg hover:-translate-y-1"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Active
                </span>
                <Clock className={`w-4 h-4 ${selectedMetric === "active" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`} />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">{activeCount}</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Ongoing works</p>
            </div>

            {/* Card 3: Critical Risk Projects (>80%) */}
            <div
              onClick={() => setSelectedMetric("critical_risk")}
              className={`p-5 rounded-2xl transition-all duration-300 cursor-pointer select-none relative overflow-hidden group ${
                selectedMetric === "critical_risk"
                  ? "bg-red-50/90 dark:bg-red-900/40 border border-red-500/50 shadow-lg shadow-red-500/20 transform scale-[1.02]"
                  : "bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 hover:border-red-400/50 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:shadow-lg hover:-translate-y-1"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-red-700 dark:text-red-300 text-[11px] font-bold uppercase tracking-wider">
                  Critical Risk
                </span>
                <ShieldAlert className={`w-4 h-4 ${selectedMetric === "critical_risk" ? "text-red-600 dark:text-red-400" : "text-red-400 dark:text-red-500"}`} />
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1.5">{criticalRiskCount}</div>
              <p className="text-[11px] text-red-600/80 dark:text-red-400/80 font-medium mt-0.5">Risk &gt; 80%</p>
            </div>

            {/* Card 4: High Risk Projects (60%-80%) */}
            <div
              onClick={() => setSelectedMetric("high_risk")}
              className={`p-5 rounded-2xl transition-all duration-300 cursor-pointer select-none relative overflow-hidden group ${
                selectedMetric === "high_risk"
                  ? "bg-rose-50/90 dark:bg-rose-900/40 border border-rose-500/50 shadow-lg shadow-rose-500/20 transform scale-[1.02]"
                  : "bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 hover:border-rose-400/50 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:shadow-lg hover:-translate-y-1"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-rose-700 dark:text-rose-300 text-[11px] font-bold uppercase tracking-wider">
                  High Risk
                </span>
                <AlertTriangle className={`w-4 h-4 ${selectedMetric === "high_risk" ? "text-rose-600 dark:text-rose-400" : "text-rose-400 dark:text-rose-500"}`} />
              </div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1.5">{highRiskCount}</div>
              <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium mt-0.5">Risk &gt; 60%</p>
            </div>

            {/* Card 5: Medium Risk Projects (50%-60%) */}
            <div
              onClick={() => setSelectedMetric("medium_risk")}
              className={`p-5 rounded-2xl transition-all duration-300 cursor-pointer select-none relative overflow-hidden group ${
                selectedMetric === "medium_risk"
                  ? "bg-amber-50/90 dark:bg-amber-900/40 border border-amber-500/50 shadow-lg shadow-amber-500/20 transform scale-[1.02]"
                  : "bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 hover:border-amber-400/50 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:shadow-lg hover:-translate-y-1"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-amber-700 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                  Medium Risk
                </span>
                <ShieldCheck className={`w-4 h-4 ${selectedMetric === "medium_risk" ? "text-amber-600 dark:text-amber-400" : "text-amber-400 dark:text-amber-500"}`} />
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">{mediumRiskCount}</div>
              <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium mt-0.5">Risk &ge; 50%</p>
            </div>

            {/* Card 6: Completed Projects */}
            <div
              onClick={() => setSelectedMetric("completed")}
              className={`p-5 rounded-2xl transition-all duration-300 cursor-pointer select-none relative overflow-hidden group ${
                selectedMetric === "completed"
                  ? "bg-blue-50/90 dark:bg-blue-900/40 border border-blue-500/50 shadow-lg shadow-blue-500/20 transform scale-[1.02]"
                  : "bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 hover:border-blue-400/50 hover:bg-white/80 dark:hover:bg-slate-800/60 hover:shadow-lg hover:-translate-y-1"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  Completed
                </span>
                <CheckCircle2 className={`w-4 h-4 ${selectedMetric === "completed" ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1.5">{completedCount}</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">100% verified</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Dynamic Interactive Projects List */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  {getMetricTitle()}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Showing {filteredProjects.length} of {projects.length} total projects in this view
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 text-xs">
              <button
                onClick={() => setSelectedMetric("all")}
                className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedMetric === "all"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setSelectedMetric("active")}
                className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedMetric === "active"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                }`}
              >
                Active Works ({activeCount})
              </button>
              <button
                onClick={() => setSelectedMetric("critical_risk")}
                className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedMetric === "critical_risk"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60"
                }`}
              >
                Critical Risk &gt;80% ({criticalRiskCount})
              </button>
              <button
                onClick={() => setSelectedMetric("high_risk")}
                className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedMetric === "high_risk"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60"
                }`}
              >
                High Risk 60-80% ({highRiskCount})
              </button>
              <button
                onClick={() => setSelectedMetric("medium_risk")}
                className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedMetric === "medium_risk"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60"
                }`}
              >
                Medium Risk 50-60% ({mediumRiskCount})
              </button>
              <button
                onClick={() => setSelectedMetric("completed")}
                className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedMetric === "completed"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60"
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>

            {/* Filtered Project Cards */}
            <div className="space-y-4">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  <FolderKanban className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No projects matching this filter</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Try selecting a different metric category or clearing your search.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedMetric("all");
                      setSearchQuery("");
                    }}
                    className="mt-3 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded text-xs font-semibold cursor-pointer"
                  >
                    Show All Projects
                  </button>
                </div>
              ) : (
                filteredProjects.map((project) => {
                  const score = project.latest_risk_score ?? 0;
                  const hasSummons = summonsList.some(
                    (s) => s.project_id === project.id && s.status === "pending"
                  );

                  return (
                    <div
                      key={project.id}
                      className={`p-4 rounded-lg border transition-all hover:shadow-md ${
                        score > 80
                          ? "bg-red-50/30 dark:bg-red-950/20 border-red-200 dark:border-red-900/50"
                          : score > 60
                          ? "bg-rose-50/20 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Title & Badges */}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                              {project.project_code}
                            </span>
                            <StatusBadge status={project.status} />
                            <RiskBadge score={project.latest_risk_score} />
                            {hasSummons && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded text-[10px] font-bold">
                                <AlertTriangle className="w-3 h-3" />
                                Summons Pending
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mt-2">
                            {project.name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {project.village_locality}, {project.district}
                            </span>
                            <span>•</span>
                            <span>Sanction: ₹{(project.sanction_amount / 100000).toFixed(1)}L</span>
                            {project.current_inspector_name && (
                              <>
                                <span>•</span>
                                <span>Inspector: {project.current_inspector_name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Progress & Actions */}
                        <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                          <div>
                            <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              Physical: <strong className="text-slate-900 dark:text-white">{project.physical_progress}%</strong>
                              {" • "}
                              Financial: <strong className="text-slate-900 dark:text-white">{project.financial_progress}%</strong>
                            </div>
                            <div className="w-36 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5 hidden sm:block">
                              <div
                                className={`h-full rounded-full ${
                                  project.physical_progress >= 100
                                    ? "bg-emerald-600"
                                    : score > 60
                                    ? "bg-red-500"
                                    : "bg-indigo-600"
                                }`}
                                style={{ width: `${project.physical_progress}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {isInspector && (
                              <button
                                type="button"
                                onClick={() => setBillModalProject(project)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 px-3 py-1.5 rounded transition-colors border border-emerald-200 dark:border-emerald-800/60 cursor-pointer shadow-2xs"
                                title="Upload Vendor Invoice & Check Material Prices with AI"
                              >
                                <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                Upload Bill
                              </button>
                            )}

                            <Link
                              href={`/projects/${project.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 px-3 py-1.5 rounded transition-colors"
                            >
                              Forensic Dossier →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Alerts & Notifications Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs p-6">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Active Forensic Alerts
                </h2>
                <Link
                  href="/alerts"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-semibold flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
                    No active alerts in this jurisdiction.
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors bg-slate-50/50 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{alert.alert_code}</span>
                        <SeverityBadge severity={alert.severity} />
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">{alert.title}</h4>
                      {alert.description && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{alert.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Jurisdictional Governance Card */}
            <div className="bg-slate-900 dark:bg-slate-800/90 text-white rounded-lg p-6 shadow-xs border border-slate-800 dark:border-slate-700">
              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">SATARK Integrity Framework</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-2">
                SHA-256 Geofenced Evidence Verification
              </h3>
              <p className="text-xs text-slate-300 dark:text-slate-300 leading-relaxed">
                Every field capture is cryptographically hashed (SHA-256) and GPS-validated against site boundaries. Evidence captured outside the project geofence radius is automatically escalated. Implements MoSPI MPLADS Monitoring Guidelines 2024 &amp; NIC Digital Evidence Standards.
              </p>
              <div className="mt-3 pt-3 border-t border-slate-800 dark:border-slate-700 flex items-center gap-2 text-[10px] text-slate-500">
                <span className="font-mono">NIC-SATARK v1.0</span>
                <span>·</span>
                <span>MoSPI / DPA</span>
                <span>·</span>
                <span>MPLADS Act 1993 (Amended 2023)</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Inspector Management Modal (Admin Direct / District Officer Approval Request) */}
      <InspectorManagementModal
        isOpen={showInspectorManagementModal}
        onClose={() => setShowInspectorManagementModal(false)}
        currentUser={user}
        onSuccess={loadData}
      />

      {/* Expense Bill Modal (Field Inspector only) */}
      {billModalProject && (
        <ExpenseBillModal
          projectId={billModalProject.id}
          projectCode={billModalProject.project_code}
          projectName={billModalProject.name}
          isOpen={!!billModalProject}
          onClose={() => setBillModalProject(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}

