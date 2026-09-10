/**
 * API client for SATARK-MPLADS backend.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "field_inspector" | "district_officer" | "auditor";
  inspector_id?: string | null;
  state?: string | null;
  district?: string | null;
  is_active: boolean;
}

export interface ProjectItem {
  id: string;
  project_code: string;
  name: string;
  description?: string;
  project_type: string;
  state: string;
  district: string;
  constituency?: string;
  village_locality?: string;
  latitude: number;
  longitude: number;
  inspection_radius_m: number;
  sanction_amount: number;
  released_amount: number;
  expenditure: number;
  physical_progress: number;
  financial_progress: number;
  contractor_id?: string;
  contractor_name?: string;
  start_date?: string;
  expected_completion_date?: string;
  status: string;
  created_at: string;
  updated_at: string;
  current_inspector?: string;
  current_inspector_name?: string;
  latest_risk_score?: number;
  last_inspection_date?: string;
}

export interface RiskScoreData {
  id: string;
  project_id: string;
  overall_score: number;
  risk_level: string;
  image_risk?: number;
  financial_risk?: number;
  geospatial_risk?: number;
  evidence_risk?: number;
  contractor_risk?: number;
  explanation: string[];
  contributing_factors: Record<string, any>;
  is_mock: boolean;
  calculated_at: string;
}

export interface AlertItem {
  id: string;
  alert_code: string;
  project_id: string;
  project_code?: string;
  alert_type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description?: string;
  evidence_data?: Record<string, any>;
  status: "open" | "under_review" | "escalated" | "resolved" | "dismissed";
  assigned_to?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogItem {
  id: string;
  actor_id?: string;
  actor_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description?: string;
  previous_value?: Record<string, any>;
  new_value?: Record<string, any>;
  created_at: string;
}

export interface DashboardStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  critical_risk_projects: number;
  high_risk_projects: number;
  medium_risk_projects: number;
  low_risk_projects: number;
  critical_alerts: number;
  pending_inspections: number;
  total_inspectors: number;
  total_evidence: number;
}

export interface ProjectEventItem {
  id: string;
  project_id: string;
  event_type: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  actor_id?: string;
  created_at: string;
}

export interface EvidenceItem {
  id: string;
  evidence_code: string;
  project_id: string;
  inspection_id: string;
  capture_timestamp: string;
  capture_latitude: number;
  capture_longitude: number;
  gps_accuracy?: number;
  distance_from_project?: number;
  is_within_geofence?: boolean;
  sha256_hash: string;
  status: string;
  file_name: string;
  storage_key: string;
  created_at: string;
  // Work-photo AI classification fields
  is_work_photo?: boolean;
  detected_category?: string | null;
  work_match_confidence?: number | null;
  requires_peer_acceptance?: boolean;
  peer_accepted?: boolean | null;
  peer_inspector_id?: string | null;
  peer_inspector_name?: string | null;
  peer_notes?: string | null;
  peer_reviewed_at?: string | null;
}


export interface EvidenceAnalysisItem {
  id: string;
  evidence_id: string;
  forensics_score?: number;
  forensics_indicators?: Array<{ name: string; status: string; detail: string }>;
  duplicate_score?: number;
  duplicate_matches?: Array<{
    matched_evidence_id: string;
    matched_project_code: string;
    matched_project_name: string;
    matched_capture_date: string;
    similarity_score: number;
    match_confidence: string;
  }>;
  overall_risk?: number;
  analysis_metadata?: Record<string, any>;
  is_mock: boolean;
  processed_at: string;
}

export interface SummonsItem {
  id: string;
  summons_code: string;
  project_id: string;
  project_code?: string;
  project_name?: string;
  inspector_user_id: string;
  inspector_name?: string;
  inspector_id?: string;
  officer_user_id: string;
  officer_name?: string;
  reason: string;
  questions?: string[];
  status: "pending" | "responded" | "reviewed" | "closed";
  response_text?: string;
  response_attachments?: any[];
  responded_at?: string;
  officer_notes?: string;
  reviewed_at?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialBenchmarkItem {
  category: string;
  name: string;
  unit: string;
  benchmark_price: number;
  tolerance_pct: number;
  description: string;
}

export interface ExpenseBillItemInput {
  item_name: string;
  category?: string;
  quantity: number;
  unit: string;
  claimed_unit_price: number;
  total_amount?: number;
}

export interface EvaluatedBillItem {
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  claimed_unit_price: number;
  total_amount: number;
  benchmark_unit_price: number;
  deviation_pct: number;
  status: "normal" | "elevated" | "severe_inflation" | "fraud_risk";
  notes: string;
}

export interface ExpenseBillResponse {
  id: string;
  bill_code: string;
  project_id: string;
  project_code?: string;
  project_name?: string;
  inspector_user_id: string;
  inspector_name?: string;
  vendor_name: string;
  invoice_number?: string;
  bill_date: string;
  total_amount: number;
  file_url?: string;
  file_name?: string;
  items: EvaluatedBillItem[];
  overall_deviation_pct: number;
  anomaly_score: number;
  fraud_risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  ai_analysis_summary?: string;
  status: "verified" | "flagged" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface BillAnalysisPreviewResult {
  items: EvaluatedBillItem[];
  total_bill_amount: number;
  overall_deviation_pct: number;
  max_single_deviation: number;
  anomaly_score: number;
  fraud_risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  summary: string;
  flagged_items_count: number;
}

export interface BillCreatePayload {
  project_id: string;
  vendor_name: string;
  invoice_number?: string;
  bill_date?: string;
  items: ExpenseBillItemInput[];
  file_url?: string;
  file_name?: string;
}

export interface InspectorRequestItem {
  id: string;
  request_code: string;
  request_type: "add" | "remove";
  officer_user_id: string;
  officer_name?: string;
  target_inspector_id?: string;
  target_inspector_name?: string;
  inspector_data: {
    full_name?: string;
    email?: string;
    inspector_id?: string;
    phone?: string;
    password?: string;
    state?: string;
    district?: string;
    [key: string]: any;
  };
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by?: string;
  reviewer_name?: string;
  admin_notes?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InspectorRequestCreatePayload {
  request_type: "add" | "remove";
  target_inspector_id?: string;
  inspector_data: Record<string, any>;
  reason: string;
}


// Helpers
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("satark_token");
}

export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("satark_token", token);
  }
}

export function clearAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("satark_token");
    localStorage.removeItem("satark_user");
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
    }
    let errorDetail = "An error occurred";
    try {
      const err = await response.json();
      errorDetail = err.detail || errorDetail;
    } catch {}
    throw new Error(errorDetail);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    return request<{ access_token: string; refresh_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  getMe: async () => {
    return request<UserProfile>("/api/auth/me");
  },

  // Projects
  getProjects: async (params?: { district?: string; status?: string; search?: string; page?: number; page_size?: number }) => {
    const q = new URLSearchParams();
    if (params?.district) q.append("district", params.district);
    if (params?.status) q.append("status", params.status);
    if (params?.search) q.append("search", params.search);
    if (params?.page) q.append("page", params.page.toString());
    if (params?.page_size) q.append("page_size", params.page_size.toString());
    const queryStr = q.toString() ? `?${q.toString()}` : "";
    return request<{ projects: ProjectItem[]; total: number; page: number; page_size: number }>(`/api/projects${queryStr}`);
  },
  getProject: async (id: string) => {
    return request<ProjectItem>(`/api/projects/${id}`);
  },
  createProject: async (data: any) => {
    return request<ProjectItem>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  updateProject: async (id: string, data: any) => {
    return request<ProjectItem>(`/api/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  deleteProject: async (id: string) => {
    return request<void>(`/api/projects/${id}`, {
      method: "DELETE",
    });
  },
  requestCompletion: async (id: string) => {
    return request<ProjectItem>(`/api/projects/${id}/request-completion`, {
      method: "POST",
    });
  },
  approveCompletion: async (id: string) => {
    return request<ProjectItem>(`/api/projects/${id}/approve-completion`, {
      method: "POST",
    });
  },
  rejectCompletion: async (id: string) => {
    return request<ProjectItem>(`/api/projects/${id}/reject-completion`, {
      method: "POST",
    });
  },

  // Users
  getUsers: async (role?: string) => {
    const q = role ? `?role=${role}` : "";
    return request<any[]>(`/api/users${q}`);
  },
  createUser: async (data: any) => {
    return request<any>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  createInspector: async (data: any) => {
    return request<any>("/api/users", {
      method: "POST",
      body: JSON.stringify({ ...data, role: "field_inspector" }),
    });
  },
  deleteUser: async (userId: string) => {
    return request<{ message: string }>(`/api/users/${userId}`, {
      method: "DELETE",
    });
  },

  // Inspector Approval Requests (District Officer <-> Admin)
  getInspectorRequests: async (status?: string) => {
    const q = status ? `?status=${status}` : "";
    return request<InspectorRequestItem[]>(`/api/users/inspector-requests${q}`);
  },
  createInspectorRequest: async (data: InspectorRequestCreatePayload) => {
    return request<InspectorRequestItem>("/api/users/inspector-requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  approveInspectorRequest: async (requestId: string, notes?: string) => {
    return request<InspectorRequestItem>(`/api/users/inspector-requests/${requestId}/approve`, {
      method: "POST",
      body: JSON.stringify({ admin_notes: notes }),
    });
  },
  rejectInspectorRequest: async (requestId: string, notes?: string) => {
    return request<InspectorRequestItem>(`/api/users/inspector-requests/${requestId}/reject`, {
      method: "POST",
      body: JSON.stringify({ admin_notes: notes }),
    });
  },


  // Assignments
  assignInspector: async (projectId: string, inspectorUserId: string) => {
    return request<any>("/api/assignments", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, inspector_user_id: inspectorUserId }),
    });
  },
  getProjectAssignments: async (projectId: string) => {
    return request<any[]>(`/api/assignments/project/${projectId}`);
  },

  // Inspections & Evidence
  startInspection: async (projectId: string, lat: number, lng: number, accuracy?: number) => {
    return request<any>("/api/inspections/start", {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, latitude: lat, longitude: lng, gps_accuracy: accuracy }),
    });
  },
  uploadEvidence: async (inspectionId: string, formData: FormData) => {
    return request<EvidenceItem>(`/api/inspections/${inspectionId}/evidence`, {
      method: "POST",
      body: formData,
    });
  },
  submitInspection: async (inspectionId: string, notes?: string) => {
    return request<any>(`/api/inspections/${inspectionId}/submit`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  },
  getProjectInspections: async (projectId: string) => {
    return request<any[]>(`/api/inspections/project/${projectId}`);
  },
  getInspectionEvidence: async (inspectionId: string) => {
    return request<EvidenceItem[]>(`/api/inspections/${inspectionId}/evidence`);
  },

  // AI & Risk
  getProjectRisk: async (projectId: string) => {
    return request<RiskScoreData>(`/api/ai/risk/${projectId}`);
  },
  evaluateRisk: async (projectId: string) => {
    return request<RiskScoreData>(`/api/ai/evaluate-risk/${projectId}`, {
      method: "POST",
    });
  },
  analyzeEvidence: async (evidenceId: string) => {
    return request<EvidenceAnalysisItem>("/api/ai/analyze-evidence", {
      method: "POST",
      body: JSON.stringify({ evidence_id: evidenceId }),
    });
  },
  getEvidenceAnalysis: async (evidenceId: string) => {
    return request<EvidenceAnalysisItem>(`/api/ai/evidence-analysis/${evidenceId}`);
  },

  // Alerts & Audit & Dashboard
  getAlerts: async (severity?: string, status?: string) => {
    const q = new URLSearchParams();
    if (severity) q.append("severity", severity);
    if (status) q.append("status", status);
    const queryStr = q.toString() ? `?${q.toString()}` : "";
    return request<AlertItem[]>(`/api/alerts${queryStr}`);
  },
  updateAlert: async (alertId: string, data: any) => {
    return request<AlertItem>(`/api/alerts/${alertId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  getAuditLogs: async () => {
    return request<AuditLogItem[]>("/api/audit");
  },
  getProjectTimeline: async (projectId: string) => {
    return request<ProjectEventItem[]>(`/api/timeline/${projectId}`);
  },
  getDashboardStats: async () => {
    return request<DashboardStats>("/api/dashboard/stats");
  },

  // Summons
  getSummons: async (status?: string, projectId?: string) => {
    const q = new URLSearchParams();
    if (status) q.append("status", status);
    if (projectId) q.append("project_id", projectId);
    const queryStr = q.toString() ? `?${q.toString()}` : "";
    return request<SummonsItem[]>(`/api/summons${queryStr}`);
  },
  getSummonsById: async (summonsId: string) => {
    return request<SummonsItem>(`/api/summons/${summonsId}`);
  },
  createSummons: async (data: { project_id: string; inspector_user_id: string; reason: string; questions?: string[] }) => {
    return request<SummonsItem>("/api/summons", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  respondToSummons: async (summonsId: string, data: { response_text: string; response_attachments?: any[] }) => {
    return request<SummonsItem>(`/api/summons/${summonsId}/respond`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  reviewSummons: async (summonsId: string, data: { status: string; officer_notes?: string }) => {
    return request<SummonsItem>(`/api/summons/${summonsId}/review`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Expense Bills & Material Price AI Anomaly Engine
  getMaterialBenchmarks: async () => {
    return request<MaterialBenchmarkItem[]>("/api/bills/benchmarks");
  },
  analyzeBillPreview: async (items: ExpenseBillItemInput[]) => {
    return request<BillAnalysisPreviewResult>("/api/bills/analyze-preview", {
      method: "POST",
      body: JSON.stringify(items),
    });
  },
  createExpenseBill: async (data: BillCreatePayload) => {
    return request<ExpenseBillResponse>("/api/bills", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  getProjectExpenseBills: async (projectId: string) => {
    return request<ExpenseBillResponse[]>(`/api/bills/project/${projectId}`);
  },
  getExpenseBill: async (billId: string) => {
    return request<ExpenseBillResponse>(`/api/bills/${billId}`);
  },
  updateExpenseBillStatus: async (billId: string, status: string) => {
    return request<ExpenseBillResponse>(`/api/bills/${billId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
