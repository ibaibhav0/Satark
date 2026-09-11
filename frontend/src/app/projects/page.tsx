"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ProjectItem } from "@/lib/api";
import { Navbar } from "@/components/Navbar";
import { StatusBadge, RiskBadge } from "@/components/StatusBadge";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Filter,
  FolderKanban,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProjectsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Add Project Modal state (Admin only)
  const [showModal, setShowModal] = useState(false);
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    project_code: `MPLADS/2024-25/KA/BN-01/${Math.floor(1000 + Math.random() * 9000)}`,
    name: "",
    description: "",
    project_type: "road",
    state: "Karnataka",
    district: "Bengaluru Urban",
    constituency: "Bengaluru Central",
    village_locality: "",
    latitude: 12.9716,
    longitude: 77.5946,
    inspection_radius_m: 150,
    sanction_amount: 2500000,
    inspector_user_id: "",
  });

  // Add Inspector Modal state (Admin only)
  const [showInspectorModal, setShowInspectorModal] = useState(false);
  const [inspectorFormData, setInspectorFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    inspector_id: `INS-KA-00${Math.floor(10 + Math.random() * 90)}`,
    phone: "",
    district: "Bengaluru Urban",
    state: "Karnataka",
  });
  const [creatingInspector, setCreatingInspector] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadInspectors = async () => {
    try {
      const data = await api.getUsers("field_inspector");
      setInspectors(data);
    } catch {}
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await api.getProjects({
        search: search || undefined,
        district: district || undefined,
        status: statusFilter || undefined,
      });
      setProjects(res.projects);
      setTotal(res.total);
    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [search, district, statusFilter]);

  useEffect(() => {
    if (user?.role === "admin") {
      loadInspectors();
    }
  }, [user]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProject(formData);
      setShowModal(false);
      setFormData({
        project_code: `MPLADS-KA-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        name: "",
        description: "",
        project_type: "road",
        state: "Karnataka",
        district: "Bengaluru Urban",
        constituency: "Bengaluru Central",
        village_locality: "",
        latitude: 12.9716,
        longitude: 77.5946,
        inspection_radius_m: 150,
        sanction_amount: 2500000,
        inspector_user_id: "",
      });
      loadProjects();
    } catch (err: any) {
      alert(`Failed to create project: ${err.message}`);
    }
  };

  const handleCreateInspector = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingInspector(true);
      await api.createUser({
        ...inspectorFormData,
        role: "field_inspector",
      });
      alert(`Field Inspector ${inspectorFormData.full_name} (${inspectorFormData.inspector_id}) created successfully! They can now log in using email: ${inspectorFormData.email}`);
      setShowInspectorModal(false);
      setInspectorFormData({
        full_name: "",
        email: "",
        password: "",
        inspector_id: `INS-KA-00${Math.floor(10 + Math.random() * 90)}`,
        phone: "",
        district: "Bengaluru Urban",
        state: "Karnataka",
      });
      await loadInspectors();
    } catch (err: any) {
      alert(`Failed to create inspector: ${err.message}`);
    } finally {
      setCreatingInspector(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete project: "${projectName}"? This action is permanent and audited.`)) {
      return;
    }
    try {
      setDeletingId(projectId);
      await api.deleteProject(projectId);
      await loadProjects();
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderKanban className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              MPLADS Projects Directory
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              {user?.role === "field_inspector"
                ? "Displaying only authorized projects assigned to your Inspector ID"
                : `Total ${total} sanctioned projects tracked across active jurisdictions`}
            </p>
          </div>

          {user?.role === "admin" && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowInspectorModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Add Field Officer
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add New Project
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 rounded-2xl p-5 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.1)] flex flex-col md:flex-row gap-4 relative overflow-hidden">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by project name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Districts</option>
              <option value="Bengaluru Urban">Bengaluru Urban</option>
              <option value="Bengaluru Rural">Bengaluru Rural</option>
              <option value="Mysuru">Mysuru</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Tumakuru">Tumakuru</option>
              <option value="Shivamogga">Shivamogga</option>
              <option value="Belagavi">Belagavi</option>
              <option value="Dharwad">Dharwad</option>
              <option value="Mangaluru">Mangaluru</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="inspector_assigned">Inspector Assigned</option>
              <option value="under_inspection">Under Inspection</option>
              <option value="under_review">Under Review</option>
              <option value="high_risk">High Risk</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.1)] overflow-hidden relative">
          {loading ? (
            <div className="py-16 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
              No projects found matching the criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/60 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-3.5">Project Code & Name</th>
                    <th className="px-6 py-3.5">District / Locality</th>
                    <th className="px-6 py-3.5">Assigned Inspector</th>
                    <th className="px-6 py-3.5">Progress (Phy/Fin)</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Risk Score</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">{proj.project_code}</div>
                        <div className="font-medium text-slate-900 dark:text-white mt-0.5 line-clamp-1">{proj.name}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 capitalize">{proj.project_type} • ₹{(proj.sanction_amount / 100000).toFixed(1)} Lakhs</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 dark:text-white font-medium">{proj.district}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{proj.village_locality || proj.state}</div>
                      </td>
                      <td className="px-6 py-4">
                        {proj.current_inspector ? (
                          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <div>
                              <span className="font-mono text-xs font-semibold">{proj.current_inspector}</span>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">{proj.current_inspector_name}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${proj.physical_progress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{proj.physical_progress}%</span>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Exp: ₹{(proj.expenditure / 100000).toFixed(1)}L ({proj.financial_progress}%)</div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={proj.status} />
                      </td>
                      <td className="px-6 py-4">
                        <RiskBadge score={proj.latest_risk_score} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/projects/${proj.id}`}
                            className="inline-flex items-center text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-1.5 rounded transition-colors"
                          >
                            Forensic View →
                          </Link>
                          {user?.role === "admin" && (
                            <button
                              onClick={() => handleDeleteProject(proj.id, proj.name)}
                              disabled={deletingId === proj.id}
                              className="inline-flex items-center text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 bg-red-50 dark:bg-red-950/70 hover:bg-red-100 dark:hover:bg-red-900/60 px-2.5 py-1.5 rounded transition-colors disabled:opacity-50 cursor-pointer"
                              title="Delete Project"
                            >
                              {deletingId === proj.id ? (
                                <CheckCircle2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Project Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full p-6 my-8 text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Sanctioned MPLADS Project</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Project Code</label>
                    <input
                      type="text"
                      value={formData.project_code}
                      onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Project Type</label>
                    <select
                      value={formData.project_type}
                      onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="road">Road</option>
                      <option value="bridge">Bridge</option>
                      <option value="school">School</option>
                      <option value="hospital">Hospital</option>
                      <option value="community_hall">Community Hall</option>
                      <option value="drinking_water">Drinking Water</option>
                      <option value="sanitation">Sanitation</option>
                      <option value="electrification">Electrification</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Project Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                    placeholder="e.g. Construction of Community Health Center"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">District</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Locality</label>
                    <input
                      type="text"
                      value={formData.village_locality}
                      onChange={(e) => setFormData({ ...formData, village_locality: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      placeholder="Village / Locality"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={isNaN(formData.latitude) ? "" : formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value === "" ? NaN : parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={isNaN(formData.longitude) ? "" : formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value === "" ? NaN : parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Geofence Radius (m)</label>
                    <input
                      type="number"
                      value={isNaN(formData.inspection_radius_m) ? "" : formData.inspection_radius_m}
                      onChange={(e) => setFormData({ ...formData, inspection_radius_m: e.target.value === "" ? NaN : parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Sanction Amount (₹)</label>
                    <input
                      type="number"
                      value={isNaN(formData.sanction_amount) ? "" : formData.sanction_amount}
                      onChange={(e) => setFormData({ ...formData, sanction_amount: e.target.value === "" ? NaN : parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Assign Field Inspector</label>
                    <select
                      value={formData.inspector_user_id}
                      onChange={(e) => setFormData({ ...formData, inspector_user_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">Select Inspector (Optional)</option>
                      {inspectors.map((insp) => (
                        <option key={insp.id} value={insp.id}>
                          {insp.inspector_id} — {insp.full_name} ({insp.district || "General"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium cursor-pointer"
                  >
                    Create Project & Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Field Inspector Modal */}
        {showInspectorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6 my-8 text-slate-900 dark:text-slate-100">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Field Inspector</h2>
                </div>
                <button onClick={() => setShowInspectorModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Register a new field inspector with login credentials. Once created, they can immediately log in and be assigned to MPLADS projects.
              </p>

              <form onSubmit={handleCreateInspector} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={inspectorFormData.full_name}
                    onChange={(e) => setInspectorFormData({ ...inspectorFormData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                    placeholder="e.g. Ramesh Kumar"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Email ID (Login)</label>
                    <input
                      type="email"
                      value={inspectorFormData.email}
                      onChange={(e) => setInspectorFormData({ ...inspectorFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      placeholder="inspector@satark.gov.in"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Password</label>
                    <input
                      type="password"
                      value={inspectorFormData.password}
                      onChange={(e) => setInspectorFormData({ ...inspectorFormData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      placeholder="Min 6 characters"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Inspector ID</label>
                    <input
                      type="text"
                      value={inspectorFormData.inspector_id}
                      onChange={(e) => setInspectorFormData({ ...inspectorFormData, inspector_id: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm font-mono text-slate-900 dark:text-white"
                      placeholder="e.g. INS-KA-0045"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={inspectorFormData.phone}
                      onChange={(e) => setInspectorFormData({ ...inspectorFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">District</label>
                    <input
                      type="text"
                      value={inspectorFormData.district}
                      onChange={(e) => setInspectorFormData({ ...inspectorFormData, district: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">State</label>
                    <input
                      type="text"
                      value={inspectorFormData.state}
                      onChange={(e) => setInspectorFormData({ ...inspectorFormData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-sm text-slate-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowInspectorModal(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingInspector}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium disabled:opacity-50 cursor-pointer"
                  >
                    {creatingInspector ? "Creating Officer..." : "Create & Activate Inspector"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
