"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  API_BASE_URL,
  ProjectItem,
  RiskScoreData,
  EvidenceItem,
  EvidenceAnalysisItem,
  ProjectEventItem,
  SummonsItem,
  ExpenseBillResponse,
} from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { StatusBadge, RiskBadge, SeverityBadge } from "@/components/StatusBadge";
import { ExpenseBillModal } from "@/components/ExpenseBillModal";
import { LiveCameraModal } from "@/components/LiveCameraModal";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FolderKanban,
  History,
  Layers,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  X,
  XCircle,
  FileText,
  Receipt,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [risk, setRisk] = useState<RiskScoreData | null>(null);
  const [inspections, setInspections] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [timeline, setTimeline] = useState<ProjectEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluatingRisk, setEvaluatingRisk] = useState(false);
  const [requestingCompletion, setRequestingCompletion] = useState(false);
  const [approvingCompletion, setApprovingCompletion] = useState(false);
  const [rejectingCompletion, setRejectingCompletion] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  // Summons Modal
  const [showSummonsModal, setShowSummonsModal] = useState(false);
  const [summonsReason, setSummonsReason] = useState("");
  const [summonsQuestions, setSummonsQuestions] = useState<string[]>([""]);
  const [creatingSummons, setCreatingSummons] = useState(false);
  const [projectSummons, setProjectSummons] = useState<SummonsItem[]>([]);

  // Live Camera & Evidence Upload Modal
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Expense Bills & Material Price AI Anomaly
  const [expenseBills, setExpenseBills] = useState<ExpenseBillResponse[]>([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);

  // Evidence Detail Modal
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [evidenceAnalysis, setEvidenceAnalysis] = useState<EvidenceAnalysisItem | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"evidence" | "bills" | "risk" | "timeline" | "summons">("bills");

  // Summons Responses & Reviews
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [selectedSummonsForResponse, setSelectedSummonsForResponse] = useState<SummonsItem | null>(null);
  const [responseReportText, setResponseReportText] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSummonsForReview, setSelectedSummonsForReview] = useState<SummonsItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState<"reviewed" | "closed">("reviewed");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [projData, riskData, inspData, timeData, summonsData, billsData] = await Promise.all([
        api.getProject(id),
        api.getProjectRisk(id).catch(() => null),
        api.getProjectInspections(id).catch(() => []),
        api.getProjectTimeline(id).catch(() => []),
        api.getSummons(undefined, id).catch(() => []),
        api.getProjectExpenseBills(id).catch(() => []),
      ]);

      setProject(projData);
      setRisk(riskData);
      setInspections(inspData);
      setTimeline(timeData);
      setProjectSummons(summonsData);
      setExpenseBills(billsData);

      // Load evidence for all inspections
      const allEv: EvidenceItem[] = [];
      for (const insp of inspData) {
        try {
          const evs = await api.getInspectionEvidence(insp.id);
          allEv.push(...evs);
        } catch {}
      }
      setEvidenceList(allEv);
    } catch (err: any) {
      console.error("Failed to load project details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleTriggerRiskEval = async () => {
    if (!id) return;
    try {
      setEvaluatingRisk(true);
      const newRisk = await api.evaluateRisk(id);
      setRisk(newRisk);
      // Reload timeline and project to get updated scores
      const [projData, timeData] = await Promise.all([
        api.getProject(id),
        api.getProjectTimeline(id).catch(() => []),
      ]);
      setProject(projData);
      setTimeline(timeData);
    } catch (err: any) {
      alert(`Risk evaluation failed: ${err.message}`);
    } finally {
      setEvaluatingRisk(false);
    }
  };

  const handleOpenEvidence = async (ev: EvidenceItem) => {
    setSelectedEvidence(ev);
    try {
      setLoadingAnalysis(true);
      const analysis = await api.getEvidenceAnalysis(ev.id);
      setEvidenceAnalysis(analysis);
    } catch (err) {
      // If analysis not found, attempt on-demand analysis
      try {
        const fresh = await api.analyzeEvidence(ev.id);
        setEvidenceAnalysis(fresh);
      } catch {
        setEvidenceAnalysis(null);
      }
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleRequestCompletion = async () => {
    if (!id) return;
    if (
      !confirm(
        "Are you sure you want to mark this project as completed? This will submit a formal completion request to the District Officer for verification and approval."
      )
    ) {
      return;
    }
    try {
      setRequestingCompletion(true);
      await api.requestCompletion(id);
      alert(
        "Completion request submitted successfully! The District Officer has been notified for final verification and approval."
      );
      await loadData();
    } catch (err: any) {
      alert(`Failed to request completion: ${err.message}`);
    } finally {
      setRequestingCompletion(false);
    }
  };

  const handleApproveCompletion = async () => {
    if (!id) return;
    if (
      !confirm(
        "Approve project completion? This will update the project status to COMPLETED and mark inspector assignment as completed."
      )
    ) {
      return;
    }
    try {
      setApprovingCompletion(true);
      await api.approveCompletion(id);
      alert("Project completion successfully approved! Status updated to COMPLETED.");
      await loadData();
    } catch (err: any) {
      alert(`Failed to approve completion: ${err.message}`);
    } finally {
      setApprovingCompletion(false);
    }
  };

  const handleRejectCompletion = async () => {
    if (!id) return;
    if (
      !confirm(
        "Reject project completion request? Project will be returned to UNDER REVIEW status for further verification or correction."
      )
    ) {
      return;
    }
    try {
      setRejectingCompletion(true);
      await api.rejectCompletion(id);
      alert("Completion request rejected. Project status returned to UNDER REVIEW.");
      await loadData();
    } catch (err: any) {
      alert(`Failed to reject completion: ${err.message}`);
    } finally {
      setRejectingCompletion(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!id || !project) return;
    if (
      !confirm(
        `Are you sure you want to delete project "${project.name}" (${project.project_code})? This action is permanent and recorded in the audit trail.`
      )
    ) {
      return;
    }
    try {
      setDeletingProject(true);
      await api.deleteProject(id);
      alert("Project deleted successfully.");
      router.push("/projects");
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
    } finally {
      setDeletingProject(false);
    }
  };

  const handleCreateSummons = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !project) {
      alert("Invalid project state.");
      return;
    }

    try {
      setCreatingSummons(true);
      // Filter empty questions
      const filteredQuestions = summonsQuestions.filter((q) => q.trim() !== "");

      // Look up inspector user id from assignments or fallback to project current inspector
      const assignments = await api.getProjectAssignments(id).catch(() => []);
      const activeAssignment = assignments.find((a) => a.status === "active");
      const targetInspectorId = activeAssignment?.inspector_user_id || activeAssignment?.inspector_id || project.current_inspector;

      if (!targetInspectorId) {
        alert("No active field inspector is assigned to this project to issue summons to. Please assign an inspector first.");
        return;
      }

      await api.createSummons({
        project_id: id,
        inspector_user_id: targetInspectorId,
        reason: summonsReason,
        questions: filteredQuestions.length > 0 ? filteredQuestions : undefined,
      });

      alert("Summons issued successfully! Field Inspector has been notified to provide a detailed explanation report.");
      setShowSummonsModal(false);
      setSummonsReason("");
      setSummonsQuestions([""]);
      await loadData();
    } catch (err: any) {
      alert(`Failed to issue summons: ${err.message}`);
    } finally {
      setCreatingSummons(false);
    }
  };

  const addQuestionField = () => {
    setSummonsQuestions([...summonsQuestions, ""]);
  };

  const updateQuestion = (index: number, value: string) => {
    const updated = [...summonsQuestions];
    updated[index] = value;
    setSummonsQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setSummonsQuestions(summonsQuestions.filter((_, i) => i !== index));
  };

  const handleOpenRespondModal = (summons: SummonsItem) => {
    setSelectedSummonsForResponse(summons);
    setResponseReportText("");
    setShowRespondModal(true);
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSummonsForResponse) return;

    try {
      setSubmittingResponse(true);
      await api.respondToSummons(selectedSummonsForResponse.id, {
        response_text: responseReportText,
      });

      alert("Clarification report submitted successfully to the District Officer!");
      setShowRespondModal(false);
      setSelectedSummonsForResponse(null);
      setResponseReportText("");
      await loadData();
    } catch (err: any) {
      alert(`Failed to submit report: ${err.message}`);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleOpenReviewModal = (summons: SummonsItem) => {
    setSelectedSummonsForReview(summons);
    setReviewNotes(summons.officer_notes || "");
    setReviewStatus("reviewed");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSummonsForReview) return;

    try {
      setSubmittingReview(true);
      await api.reviewSummons(selectedSummonsForReview.id, {
        status: reviewStatus,
        officer_notes: reviewNotes || undefined,
      });

      alert(`Summons status updated to ${reviewStatus.toUpperCase()}!`);
      setShowReviewModal(false);
      setSelectedSummonsForReview(null);
      setReviewNotes("");
      await loadData();
    } catch (err: any) {
      alert(`Failed to update summons: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Project Not Found or Access Forbidden</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
            You may not have the authorized permissions to inspect this MPLADS asset.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isHighRisk = (risk?.overall_score || project.latest_risk_score || 0) >= 60;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12 transition-colors">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Back Link */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects Directory
          </Link>
        </div>

        {/* Completion Requested Notification Banner */}
        {project.status === "completion_requested" && (
          <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 rounded-lg p-4 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Project Completion Requested — Pending Officer Verification & Approval
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  {user?.role === "field_inspector"
                    ? "You have marked this project as completed. Your request has been transmitted to the District Officer for administrative review."
                    : `Field Inspector ${project.current_inspector || ""} has submitted this project for completion. Review evidence and verify before granting final approval.`}
                </p>
              </div>
            </div>

            {(user?.role === "admin" || user?.role === "district_officer") && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleApproveCompletion}
                  disabled={approvingCompletion}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve Completion
                </button>
                <button
                  onClick={handleRejectCompletion}
                  disabled={rejectingCompletion}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject Request
                </button>
              </div>
            )}
          </div>
        )}

        {/* Project Master Dossier Header */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-6 transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
                  {project.project_code}
                </span>
                <StatusBadge status={project.status} />
                <RiskBadge score={risk?.overall_score || project.latest_risk_score} />
                <span className="text-xs text-slate-400 capitalize bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {project.project_type}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{project.name}</h1>

              {project.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{project.description}</p>
              )}

              {/* Geographic Coordinates & Locality */}
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-600 dark:text-slate-400 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>
                    {project.village_locality ? `${project.village_locality}, ` : ""}
                    {project.district}, {project.state}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <Navigation className="w-4 h-4 text-slate-400" />
                  <span>
                    GPS: {project.latitude.toFixed(6)}, {project.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded font-medium border border-indigo-100 dark:border-indigo-900/50">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Enforced Geofence: {project.inspection_radius_m}m</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 min-w-[200px]">
              {/* Inspector: Mark as Completed & Live Camera Capture */}
              {user?.role === "field_inspector" && project.status !== "completion_requested" && project.status !== "completed" && (
                <>
                  <button
                    onClick={handleRequestCompletion}
                    disabled={requestingCompletion}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Send className={`w-3.5 h-3.5 ${requestingCompletion ? "animate-pulse" : ""}`} />
                    {requestingCompletion ? "Submitting..." : "Mark as Completed"}
                  </button>
                  <button
                    onClick={() => setShowCameraModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Live Camera Inspection
                  </button>
                </>
              )}

              {/* Officer/Admin: Approve/Reject Completion */}
              {(user?.role === "admin" || user?.role === "district_officer") && project.status === "completion_requested" && (
                <>
                  <button
                    onClick={handleApproveCompletion}
                    disabled={approvingCompletion}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Check className={`w-3.5 h-3.5 ${approvingCompletion ? "animate-pulse" : ""}`} />
                    {approvingCompletion ? "Approving..." : "Approve Completion"}
                  </button>
                  <button
                    onClick={handleRejectCompletion}
                    disabled={rejectingCompletion}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className={`w-3.5 h-3.5 ${rejectingCompletion ? "animate-pulse" : ""}`} />
                    {rejectingCompletion ? "Rejecting..." : "Reject Request"}
                  </button>
                </>
              )}

              {/* Admin/Officer: Re-evaluate Risk */}
              {(user?.role === "admin" || user?.role === "district_officer") && project.status !== "completion_requested" && (
                <button
                  onClick={handleTriggerRiskEval}
                  disabled={evaluatingRisk}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${evaluatingRisk ? "animate-spin" : ""}`} />
                  {evaluatingRisk ? "Running Forensic AI..." : "Re-evaluate AI Risk"}
                </button>
              )}

              {/* Only Field Inspector: Upload Expense Bill */}
              {user?.role === "field_inspector" && (
                <button
                  onClick={() => setShowBillModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Upload Expense Bill (AI Audit)
                </button>
              )}

              {/* District Officer / Admin: Issue Summons / Notice */}
              {(user?.role === "district_officer" || user?.role === "admin") && (
                <button
                  onClick={() => setShowSummonsModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Issue Field Summons
                </button>
              )}

              {/* Admin: Delete Project */}
              {user?.role === "admin" && (
                <button
                  onClick={handleDeleteProject}
                  disabled={deletingProject}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${deletingProject ? "animate-pulse" : ""}`} />
                  {deletingProject ? "Deleting..." : "Delete Project"}
                </button>
              )}
            </div>
          </div>

          {/* Financial & Physical Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-lg">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Sanction Amount</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                ₹{(project.sanction_amount / 100000).toFixed(2)} Lakhs
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Expenditure</span>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                ₹{(project.expenditure / 100000).toFixed(2)} Lakhs ({project.financial_progress}%)
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Physical Progress</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full"
                    style={{ width: `${project.physical_progress}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{project.physical_progress}%</span>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">Assigned Inspector</span>
              <div className="text-xs font-medium text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{project.current_inspector_name || "Unassigned"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("bills")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "bills"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Receipt className="w-4 h-4 text-indigo-500" />
            Material Bills & Invoices ({expenseBills.length})
            {expenseBills.some((b) => b.anomaly_score >= 45) && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("evidence")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "evidence"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Camera className="w-4 h-4" />
            Field Evidence ({evidenceList.length})
          </button>

          <button
            onClick={() => setActiveTab("risk")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "risk"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Explainable AI Risk Engine
          </button>

          <button
            onClick={() => setActiveTab("timeline")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "timeline"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            Event Audit Timeline ({timeline.length})
          </button>

          <button
            onClick={() => setActiveTab("summons")}
            className={`pb-3 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors relative whitespace-nowrap cursor-pointer ${
              activeTab === "summons"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            Official Summons & Reports ({projectSummons.length})
            {projectSummons.some((s) => s.status === "pending") && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-0 right-0"></span>
            )}
          </button>
        </div>

        {/* Tab: Material Expense Bills & AI Anomaly Audit */}
        {activeTab === "bills" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Material Expense Invoices & AI Price Comparison
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    AI automatically compares claimed material rates with standard CPWD / State Schedule of Rates benchmarks to identify over-invoicing and rate escalation fraud.
                  </p>
                </div>

                {user?.role === "field_inspector" && (
                  <button
                    onClick={() => setShowBillModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer shrink-0"
                  >
                    <Receipt className="w-4 h-4" />
                    Upload Expense Bill
                  </button>
                )}
              </div>
            </div>

            {expenseBills.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
                <Receipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  No Material Expense Bills Uploaded Yet
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto">
                  {user?.role === "field_inspector"
                    ? "Upload vendor material bills for this project. The AI engine cross-references cement, steel, sand, aggregate, labor, and machinery rates against CPWD benchmarks."
                    : "No material expense bills have been uploaded for this project yet. Assigned Field Inspectors upload vendor invoices for automated AI price audits."}
                </p>
                {user?.role === "field_inspector" && (
                  <button
                    onClick={() => setShowBillModal(true)}
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    Upload First Expense Bill
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {expenseBills.map((bill) => {
                  const isExpanded = expandedBillId === bill.id;
                  const isHighRisk = bill.anomaly_score >= 45 || bill.fraud_risk_level === "HIGH" || bill.fraud_risk_level === "CRITICAL";

                  return (
                    <div
                      key={bill.id}
                      className={`bg-white dark:bg-slate-900 rounded-xl border transition-all shadow-xs overflow-hidden ${
                        isHighRisk
                          ? "border-red-300 dark:border-red-900/60 bg-red-50/10 dark:bg-red-950/10"
                          : "border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      {/* Bill Card Summary Header */}
                      <div className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                {bill.bill_code}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                  bill.fraud_risk_level === "CRITICAL" || bill.fraud_risk_level === "HIGH"
                                    ? "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-300 dark:border-red-900"
                                    : bill.fraud_risk_level === "MODERATE"
                                    ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-900"
                                    : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900"
                                }`}
                              >
                                {bill.fraud_risk_level} FRAUD RISK ({bill.anomaly_score.toFixed(0)}/100)
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Status: <strong className="uppercase text-slate-700 dark:text-slate-300">{bill.status}</strong>
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 pt-1">
                              <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                {bill.vendor_name}
                              </span>
                              {bill.invoice_number && (
                                <span className="font-mono text-slate-500 dark:text-slate-400">
                                  Inv: {bill.invoice_number}
                                </span>
                              )}
                              <span>• Date: {new Date(bill.bill_date).toLocaleDateString()}</span>
                              {bill.inspector_name && (
                                <span>• Submitted by: {bill.inspector_name}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">
                                Total Amount
                              </span>
                              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                                ₹{Number(bill.total_amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </span>
                              <div className="text-[11px] font-semibold mt-0.5">
                                Price Deviation:{" "}
                                <span
                                  className={
                                    bill.overall_deviation_pct > 15
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  }
                                >
                                  {bill.overall_deviation_pct > 0
                                    ? `+${bill.overall_deviation_pct}%`
                                    : `${bill.overall_deviation_pct}%`}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => setExpandedBillId(isExpanded ? null : bill.id)}
                              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                            >
                              <span>{isExpanded ? "Hide Audit" : "View Audit"}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* AI Summary note */}
                        {bill.ai_analysis_summary && (
                          <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                              <strong className="text-slate-900 dark:text-white mr-1">AI Forensic Findings:</strong>
                              {bill.ai_analysis_summary}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Expanded Line Items Detail Table */}
                      {isExpanded && bill.items && bill.items.length > 0 && (
                        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Line-by-Line CPWD Material Rate Verification
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Benchmark database: CPWD Delhi Schedule of Rates (DSR) & State PWD Rates
                            </span>
                          </div>

                          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                  <th className="p-3">Item Description</th>
                                  <th className="p-3 text-right">Quantity & Unit</th>
                                  <th className="p-3 text-right">Claimed Rate</th>
                                  <th className="p-3 text-right">CPWD Benchmark</th>
                                  <th className="p-3 text-right">Deviation</th>
                                  <th className="p-3">AI Verdict & Findings</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {bill.items.map((it, idx) => {
                                  const isFlagged = it.status === "fraud_risk" || it.status === "severe_inflation";
                                  return (
                                    <tr key={idx} className={isFlagged ? "bg-red-50/40 dark:bg-red-950/20" : ""}>
                                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                                        {it.item_name}
                                        <span className="block text-[10px] text-slate-400 uppercase font-normal">
                                          {it.category}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                                        {it.quantity} {it.unit}
                                      </td>
                                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                        ₹{it.claimed_unit_price.toFixed(2)}
                                      </td>
                                      <td className="p-3 text-right font-mono text-slate-500 dark:text-slate-400">
                                        ₹{it.benchmark_unit_price.toFixed(2)}
                                      </td>
                                      <td className="p-3 text-right">
                                        <span
                                          className={`inline-block px-2 py-0.5 rounded font-mono font-bold ${
                                            it.deviation_pct > 35
                                              ? "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300"
                                              : it.deviation_pct > 15
                                              ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                                              : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                                          }`}
                                        >
                                          {it.deviation_pct > 0 ? `+${it.deviation_pct}%` : `${it.deviation_pct}%`}
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-600 dark:text-slate-300 text-[11px] leading-tight">
                                        {it.notes}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Field Evidence Gallery */}
        {activeTab === "evidence" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Field Evidence & Geotagged Visual Proof
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Cryptographically signed evidence captured within {project.inspection_radius_m}m enforced geofence with SHA-256 integrity stamps.
                </p>
              </div>

              {user?.role === "field_inspector" && (
                <button
                  onClick={() => setShowCameraModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  <Camera className="w-4 h-4" />
                  Live Camera Inspection
                </button>
              )}
            </div>

            {evidenceList.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xs transition-colors">
                <Camera className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Geotagged Evidence Captured Yet</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto">
                  Once an authorized inspector completes on-site verification within the {project.inspection_radius_m}m geofence, evidence photos will appear here with cryptographic integrity hashes.
                </p>
                {user?.role === "field_inspector" && (
                  <button
                    onClick={() => setShowCameraModal(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Capture First Evidence
                  </button>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {evidenceList.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => handleOpenEvidence(ev)}
                    className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden group"
                  >
                    {/* Image Preview Box */}
                    <div className="relative aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
                      <img
                        src={`${API_BASE_URL}/api/inspections/evidence-file/${ev.storage_key}`}
                        alt={ev.evidence_code}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.triedFallback) {
                            target.dataset.triedFallback = "true";
                            target.src = `${API_BASE_URL}/evidence/${ev.storage_key}`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 pointer-events-none"></div>

                      <div className="absolute bottom-2 left-3 right-3 text-white">
                        <span className="font-mono text-[11px] bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                          {ev.evidence_code}
                        </span>
                        <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ev.capture_timestamp).toLocaleString()}
                        </div>
                      </div>

                      <div className="absolute top-2 right-2">
                        {ev.is_within_geofence ? (
                          <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow backdrop-blur-sm flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Geofence Verified
                          </span>
                        ) : (
                          <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow backdrop-blur-sm flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Geofence Violation
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata summary */}
                    <div className="p-4 space-y-2">
                      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span>Distance from Site:</span>
                        <strong className="font-mono text-slate-900 dark:text-white">{ev.distance_from_project?.toFixed(1) || 0}m</strong>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span>GPS Accuracy:</span>
                        <strong className="font-mono text-slate-900 dark:text-white">±{ev.gps_accuracy || 5}m</strong>
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                        <span>View Forensics & Integrity</span>
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Explainable AI Risk Score Breakdown */}
        {activeTab === "risk" && (
          <div className="space-y-6">
            {/* Risk Master Card */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-xs transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Forensic Risk Assessment</h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Multi-modal AI evaluation incorporating image forensics, financial flow velocity, duplicate visual clustering & geospatial validation.
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase">Composite Score</div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {risk?.overall_score || project.latest_risk_score || 0}
                      <span className="text-sm font-normal text-slate-400">/100</span>
                    </div>
                  </div>
                  <RiskBadge score={risk?.overall_score || project.latest_risk_score} />
                </div>
              </div>

              {/* Individual Multi-modal Sub-Scores */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded border border-slate-100 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Image Forensics</span>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">{risk?.image_risk ?? 15}%</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">ELA & metadata tampering</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded border border-slate-100 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Financial Anomaly</span>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">{risk?.financial_risk ?? 10}%</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Disbursement vs physical gap</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded border border-slate-100 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Geospatial Risk</span>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">{risk?.geospatial_risk ?? 5}%</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Geofence offset deviation</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded border border-slate-100 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Evidence Quality</span>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">{risk?.evidence_risk ?? 10}%</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Recycled/Duplicate vectors</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded border border-slate-100 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">Contractor History</span>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-1">{risk?.contractor_risk ?? 20}%</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Historical delay index</div>
                </div>
              </div>
            </div>

            {/* Explainable AI Factors */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-xs transition-colors">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                SHAP-Style Key Contributing Risk Factors
              </h3>

              {risk?.explanation && risk.explanation.length > 0 ? (
                <div className="space-y-3">
                  {risk.explanation.map((factor, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-start gap-3"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{factor}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400 py-4">
                  No critical anomaly factors identified. Project telemetry is within standard parameters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Event Audit Timeline */}
        {activeTab === "timeline" && (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-xs transition-colors">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Chronological Project Event & Inspection Trail
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Immutable event log recording project creation, field inspections, forensic analyses, bills, and status changes.
                </p>
              </div>
            </div>

            {timeline.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
                No chronological events recorded yet for this project.
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-6 ml-2">
                {timeline.map((evt) => (
                  <div key={evt.id} className="relative group">
                    <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-indigo-600 dark:bg-indigo-500 ring-4 ring-white dark:ring-slate-900" />
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{evt.title}</span>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {new Date(evt.created_at).toLocaleString()}
                        </span>
                      </div>
                      {evt.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                          {evt.description}
                        </p>
                      )}
                      {evt.event_type && (
                        <span className="inline-block mt-2 font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {evt.event_type}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Official Summons & Reports */}
        {activeTab === "summons" && (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 shadow-xs transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  District Officer Summons & Field Explanation Reports
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Formal administrative inquiries issued by the District Officer directing the field inspector to explain high/moderate risks, financial-physical anomalies, or upload comprehensive site clarification reports.
                </p>
              </div>

              {user?.role === "district_officer" && project.current_inspector && (
                <button
                  onClick={() => setShowSummonsModal(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shadow-sm transition-colors shrink-0 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  Issue New Summons
                </button>
              )}
            </div>

            {projectSummons.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-medium text-slate-700 dark:text-slate-300">No Summons or Inquiries Issued for this Project</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  {user?.role === "district_officer"
                    ? "If this project is flagging high or moderate risk, you can issue a formal summons to the assigned field officer to demand a site investigation report."
                    : "When a District Officer requires an explanation regarding project progress or anomalies, the official notice will appear here."}
                </p>
                {user?.role === "district_officer" && project.current_inspector && (
                  <button
                    onClick={() => setShowSummonsModal(true)}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-medium cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    Issue Field Summons
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {projectSummons.map((s) => (
                  <div
                    key={s.id}
                    className={`p-5 rounded-lg border transition-all ${
                      s.status === "pending"
                        ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 shadow-xs"
                        : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                          {s.summons_code}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                            s.status === "pending"
                              ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-900"
                              : s.status === "responded"
                              ? "bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-900"
                              : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900"
                          }`}
                        >
                          {s.status === "pending" ? "Awaiting Inspector Response" : s.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        Issued on {new Date(s.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Inquiry Details */}
                    <div className="mt-4 space-y-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Directive & Reason from Officer ({s.officer_name || "District Officer"})
                        </span>
                        <p className="text-sm text-slate-800 dark:text-slate-200 font-medium mt-1 leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-850 p-3 rounded border border-slate-200 dark:border-slate-700">
                          {s.reason}
                        </p>
                      </div>

                      {s.questions && s.questions.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Specific Questions to Answer
                          </span>
                          <ul className="mt-1 space-y-1.5 list-disc list-inside bg-white dark:bg-slate-850 p-3 rounded border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                            {s.questions.map((q, qIdx) => (
                              <li key={qIdx} className="leading-relaxed font-medium">
                                {q}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Inspector Response Section */}
                      {s.response_text ? (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              Inspector Clarification Report ({s.inspector_name || s.inspector_id || "Field Inspector"})
                            </span>
                            {s.responded_at && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                Submitted {new Date(s.responded_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="bg-emerald-50/40 dark:bg-emerald-950/30 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {s.response_text}
                          </div>
                        </div>
                      ) : (
                        user?.role === "field_inspector" && (
                          <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-900/60 flex justify-end">
                            <button
                              onClick={() => handleOpenRespondModal(s)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Submit Clarification Report
                            </button>
                          </div>
                        )
                      )}

                      {/* Officer Notes if reviewed */}
                      {s.officer_notes && (
                        <div className="mt-3 bg-slate-100 dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-slate-900 dark:text-white block mb-0.5">District Officer Review Remarks:</span>
                          {s.officer_notes}
                        </div>
                      )}

                      {/* Action for Officer to Review/Close */}
                      {user?.role === "district_officer" && s.status === "responded" && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                          <button
                            onClick={() => handleOpenReviewModal(s)}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Review & Close Summons
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Forensic Evidence Detail Modal */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Evidence Forensic Analysis & Integrity Report
                </h3>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{selectedEvidence.evidence_code}</span>
              </div>
              <button
                onClick={() => setSelectedEvidence(null)}
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Top Section: Full Image Preview & Integrity Stamp */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center relative aspect-video">
                  <img
                    src={`${API_BASE_URL}/api/inspections/evidence-file/${selectedEvidence.storage_key}`}
                    alt={selectedEvidence.evidence_code}
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.triedFallback) {
                        target.dataset.triedFallback = "true";
                        target.src = `${API_BASE_URL}/evidence/${selectedEvidence.storage_key}`;
                      }
                    }}
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-[10px] font-mono">
                    GPS: {selectedEvidence.capture_latitude.toFixed(6)}, {selectedEvidence.capture_longitude.toFixed(6)}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cryptographic Integrity Stamp</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200 break-all">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-1">SHA-256 Hash:</span>
                    {selectedEvidence.sha256_hash}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Capture Time</span>
                      <strong className="text-slate-900 dark:text-white font-medium">
                        {new Date(selectedEvidence.capture_timestamp).toLocaleString()}
                      </strong>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Geofence Radius Check</span>
                      <strong className={selectedEvidence.is_within_geofence ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}>
                        {selectedEvidence.is_within_geofence ? "PASS (Within Bounds)" : "FAIL (Out of Bounds)"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Forensic Analysis Section */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Neural Image Forensics & Recycled Image Detection
                </h4>

                {loadingAnalysis ? (
                  <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    Running forensic neural analysis...
                  </div>
                ) : evidenceAnalysis ? (
                  <div className="space-y-4">
                    {/* Manipulation Indicators */}
                    <div className="bg-slate-50 dark:bg-slate-800/70 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Image Manipulation Indicators (ELA)</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          Forensic Risk: {evidenceAnalysis.forensics_score || 0}%
                        </span>
                      </div>

                      {evidenceAnalysis.forensics_indicators && evidenceAnalysis.forensics_indicators.length > 0 ? (
                        <div className="space-y-2">
                          {evidenceAnalysis.forensics_indicators.map((ind, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-white dark:bg-slate-850 p-2 rounded border border-slate-200 dark:border-slate-700">
                              <span className="font-medium text-slate-800 dark:text-slate-200">{ind.name}</span>
                              <span className={`font-semibold ${ind.status === "passed" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                                {ind.status.toUpperCase()} — {ind.detail}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 dark:text-slate-400">No EXIF or pixel manipulation artifacts detected.</div>
                      )}
                    </div>

                    {/* Duplicate / Recycled Image Detection */}
                    {evidenceAnalysis.duplicate_matches && evidenceAnalysis.duplicate_matches.length > 0 && (
                      <div className="bg-red-50 dark:bg-red-950/40 p-4 rounded-lg border border-red-200 dark:border-red-900/60">
                        <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-xs uppercase mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                          Recycled / Duplicate Image Cluster Detected!
                        </div>
                        <div className="space-y-2">
                          {evidenceAnalysis.duplicate_matches.map((dup, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded border border-red-100 dark:border-red-900/40 text-xs">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                Match with Project: <span className="font-mono text-indigo-600 dark:text-indigo-400">{dup.matched_project_code}</span> ({dup.matched_project_name})
                              </div>
                              <div className="text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                                <span>Similarity Index: <strong className="text-slate-800 dark:text-slate-200">{(dup.similarity_score * 100).toFixed(1)}%</strong></span>
                                <span className="text-red-600 dark:text-red-400 font-semibold">{dup.match_confidence} Confidence</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-4 rounded border border-slate-200 dark:border-slate-700">
                    No neural anomalies flagged for this evidence frame.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
              <button
                onClick={() => setSelectedEvidence(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* District Officer Summons Issue Modal */}
      {showSummonsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Issue Administrative Summons</h3>
              </div>
              <button
                onClick={() => setShowSummonsModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Direct assigned Field Inspector <strong>{project.current_inspector_name || project.current_inspector}</strong> to explain risk anomalies, physical/financial mismatch, or submit a comprehensive field investigation report.
            </p>

            <form onSubmit={handleCreateSummons} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Reason / Administrative Directive
                </label>
                <textarea
                  value={summonsReason}
                  onChange={(e) => setSummonsReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-slate-400"
                  placeholder="e.g. Project is flagged with High AI Risk (Score 78/100) due to financial expenditure exceeding physical progress and duplicate evidence alert. Provide immediate site clarification and progress audit."
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Specific Questions / Demanded Inquiries
                  </label>
                  <button
                    type="button"
                    onClick={addQuestionField}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    + Add Question
                  </button>
                </div>
                <div className="space-y-2">
                  {summonsQuestions.map((q, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => updateQuestion(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        placeholder="e.g. What is the actual on-ground physical completion percentage?"
                      />
                      {summonsQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Template Fillers */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5">Quick Inquiry Templates:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSummonsReason(`Urgent: The AI Risk Engine has scored this asset as HIGH RISK (${risk?.overall_score || project.latest_risk_score}/100). Please conduct an immediate on-site inspection and submit a comprehensive explanation report.`);
                      setSummonsQuestions([
                        "Why is financial expenditure out of sync with verified physical progress?",
                        "Are there any site bottlenecks or contractor delays?",
                        "Submit fresh geotagged photographic proof within geofence."
                      ]);
                    }}
                    className="text-[11px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded cursor-pointer"
                  >
                    High Risk Score Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSummonsReason("Progress Mismatch Inquiry: Physical progress is significantly lagging behind sanction fund disbursements. Submit explanation regarding contractor utilization.");
                      setSummonsQuestions([
                        "What is the current milestone status of the construction work?",
                        "Has the contractor mobilized required materials on site?"
                      ]);
                    }}
                    className="text-[11px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded cursor-pointer"
                  >
                    Progress Mismatch Template
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSummonsModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSummons}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {creatingSummons ? "Issuing Summons..." : "Issue Official Summons"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Field Inspector Clarification Response Modal */}
      {showRespondModal && selectedSummonsForResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submit Inspector Clarification Report</h3>
              </div>
              <button
                onClick={() => setShowRespondModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded border border-amber-200 dark:border-amber-900/60 mb-4 text-xs text-slate-800 dark:text-slate-200">
              <span className="font-bold text-amber-900 dark:text-amber-300 block mb-1">
                Notice {selectedSummonsForResponse.summons_code} from {selectedSummonsForResponse.officer_name || "District Officer"}:
              </span>
              <p className="whitespace-pre-wrap">{selectedSummonsForResponse.reason}</p>
              {selectedSummonsForResponse.questions && selectedSummonsForResponse.questions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-900/60">
                  <span className="font-semibold block mb-1">Questions to address:</span>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedSummonsForResponse.questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitResponse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Field Investigation & Clarification Report
                </label>
                <textarea
                  value={responseReportText}
                  onChange={(e) => setResponseReportText(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
                  placeholder="Enter your detailed physical findings, reason for risk score/mismatch, contractor on-site status, and verified milestones..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRespondModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResponse}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingResponse ? "Submitting Report..." : "Submit Official Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* District Officer Review Summons Modal */}
      {showReviewModal && selectedSummonsForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Review Inspector Response</h3>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Status Decision
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as "reviewed" | "closed")}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="reviewed">Mark as Reviewed & Satisfactory</option>
                  <option value="closed">Close Summons (Inquiry Resolved)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Officer Review Remarks / Directives
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded text-sm placeholder-slate-400"
                  placeholder="e.g. Explanation accepted. Physical progress verified at 65%. Follow up in 15 days."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-4 py-2 bg-slate-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {submittingReview ? "Saving Review..." : "Confirm & Save Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Camera & Image Upload Modal */}
      {showCameraModal && project && (
        <LiveCameraModal
          isOpen={showCameraModal}
          onClose={() => setShowCameraModal(false)}
          project={project}
          onInspectionComplete={() => {
            loadData();
          }}
        />
      )}

      {/* Expense Bill Upload Modal */}
      {showBillModal && (
        <ExpenseBillModal
          projectId={project.id}
          projectCode={project.project_code}
          projectName={project.name}
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
