"""
SQLAlchemy models for the SATARK-MPLADS platform.

Tables:
  users, projects, contractors, project_inspectors,
  inspections, evidence, evidence_analysis, financial_records,
  risk_scores, alerts, project_events, audit_logs
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.enums import (
    AlertSeverity,
    AlertStatus,
    AlertType,
    AssignmentStatus,
    EvidenceStatus,
    ExpenseBillStatus,
    InspectionStatus,
    InspectorRequestStatus,
    InspectorRequestType,
    ProjectStatus,
    ProjectType,
    SummonsStatus,
    UserRole,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Users ───────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, index=True)

    # Inspector-specific fields (null for non-inspectors)
    inspector_id = Column(String(50), unique=True, nullable=True, index=True)
    phone = Column(String(20), nullable=True)

    # District/jurisdiction scope
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    # Relationships
    assignments = relationship("ProjectInspector", back_populates="inspector", foreign_keys="ProjectInspector.inspector_user_id")
    inspections = relationship("Inspection", back_populates="inspector")


# ── Contractors ─────────────────────────────────────────────────────

class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(255), nullable=False)
    registration_number = Column(String(100), unique=True, nullable=True)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    projects = relationship("Project", back_populates="contractor")


# ── Projects ────────────────────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=_uuid)
    project_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    project_type = Column(Enum(ProjectType), nullable=False)

    # Location
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    constituency = Column(String(200), nullable=True)
    village_locality = Column(String(300), nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    inspection_radius_m = Column(Integer, default=100, nullable=False)  # geofence in meters

    # Financial
    sanction_amount = Column(Numeric(15, 2), nullable=False)
    released_amount = Column(Numeric(15, 2), default=0)
    expenditure = Column(Numeric(15, 2), default=0)

    # Progress
    physical_progress = Column(Float, default=0)  # 0-100%
    financial_progress = Column(Float, default=0)  # 0-100%

    # Contractor
    contractor_id = Column(String(36), ForeignKey("contractors.id"), nullable=True)

    # Timeline
    start_date = Column(DateTime(timezone=True), nullable=True)
    expected_completion_date = Column(DateTime(timezone=True), nullable=True)
    actual_completion_date = Column(DateTime(timezone=True), nullable=True)

    # Status
    status = Column(Enum(ProjectStatus), default=ProjectStatus.DRAFT, nullable=False, index=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    peer_acceptance_required = Column(Boolean, default=False, nullable=False)
    peer_acceptance_status = Column(String(50), nullable=True)  # None, "pending", "accepted", "rejected"

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    # Relationships
    contractor = relationship("Contractor", back_populates="projects")
    assignments = relationship("ProjectInspector", back_populates="project")
    inspections = relationship("Inspection", back_populates="project")
    evidence_items = relationship("Evidence", back_populates="project")
    financial_records = relationship("FinancialRecord", back_populates="project")
    expense_bills = relationship("ExpenseBill", back_populates="project")
    risk_scores = relationship("RiskScore", back_populates="project")
    alerts = relationship("Alert", back_populates="project")
    events = relationship("ProjectEvent", back_populates="project", order_by="ProjectEvent.created_at.desc()")

    __table_args__ = (
        Index("ix_projects_district_status", "district", "status"),
        Index("ix_projects_location", "latitude", "longitude"),
    )


# ── Project ↔ Inspector Assignment ─────────────────────────────────

class ProjectInspector(Base):
    __tablename__ = "project_inspectors"

    id = Column(String(36), primary_key=True, default=_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    inspector_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    assigned_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    assigned_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    unassigned_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.ACTIVE, nullable=False)

    project = relationship("Project", back_populates="assignments")
    inspector = relationship("User", back_populates="assignments", foreign_keys=[inspector_user_id])

    __table_args__ = (
        Index("ix_pi_active", "inspector_user_id", "status"),
    )


# ── Inspections ─────────────────────────────────────────────────────

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(String(36), primary_key=True, default=_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    inspector_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    started_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    status = Column(Enum(InspectionStatus), default=InspectionStatus.STARTED, nullable=False)
    notes = Column(Text, nullable=True)

    # GPS at inspection start
    start_latitude = Column(Float, nullable=True)
    start_longitude = Column(Float, nullable=True)
    start_gps_accuracy = Column(Float, nullable=True)  # meters

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    project = relationship("Project", back_populates="inspections")
    inspector = relationship("User", back_populates="inspections")
    evidence_items = relationship("Evidence", back_populates="inspection")


# ── Evidence ────────────────────────────────────────────────────────

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=_uuid)
    evidence_code = Column(String(50), unique=True, nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    inspection_id = Column(String(36), ForeignKey("inspections.id"), nullable=False, index=True)
    inspector_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    # Storage
    storage_key = Column(String(500), nullable=False)  # path/key in storage
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    sha256_hash = Column(String(64), nullable=False)

    # Capture metadata
    capture_timestamp = Column(DateTime(timezone=True), nullable=False)
    capture_latitude = Column(Float, nullable=False)
    capture_longitude = Column(Float, nullable=False)
    gps_accuracy = Column(Float, nullable=True)  # meters
    distance_from_project = Column(Float, nullable=True)  # meters
    is_within_geofence = Column(Boolean, nullable=True)

    # Status
    status = Column(Enum(EvidenceStatus), default=EvidenceStatus.CAPTURED, nullable=False)
    device_info = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    project = relationship("Project", back_populates="evidence_items")
    inspection = relationship("Inspection", back_populates="evidence_items")
    analysis = relationship("EvidenceAnalysis", back_populates="evidence", uselist=False)


# ── Evidence Analysis (AI results) ──────────────────────────────────

class EvidenceAnalysis(Base):
    __tablename__ = "evidence_analysis"

    id = Column(String(36), primary_key=True, default=_uuid)
    evidence_id = Column(String(36), ForeignKey("evidence.id"), unique=True, nullable=False)

    # Image forensics
    forensics_score = Column(Float, nullable=True)  # 0-100 risk
    forensics_indicators = Column(JSON, nullable=True)

    # Duplicate detection
    duplicate_score = Column(Float, nullable=True)  # 0-100 similarity
    duplicate_matches = Column(JSON, nullable=True)

    # Overall assessment
    overall_risk = Column(Float, nullable=True)
    analysis_metadata = Column(JSON, nullable=True)

    # Work photo scene verification & peer acceptance
    is_work_photo = Column(Boolean, default=True, nullable=False)
    detected_category = Column(String(100), default="infrastructure", nullable=True)
    work_match_confidence = Column(Float, default=95.0, nullable=True)
    requires_peer_acceptance = Column(Boolean, default=False, nullable=False)
    peer_accepted = Column(Boolean, nullable=True)
    peer_inspector_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    peer_notes = Column(String(1000), nullable=True)
    peer_reviewed_at = Column(DateTime(timezone=True), nullable=True)

    is_mock = Column(Boolean, default=False, nullable=False)
    processed_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    evidence = relationship("Evidence", back_populates="analysis")


# ── Financial Records ───────────────────────────────────────────────

class FinancialRecord(Base):
    __tablename__ = "financial_records"

    id = Column(String(36), primary_key=True, default=_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)

    record_date = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=True)

    amount = Column(Numeric(15, 2), nullable=False)
    category = Column(String(100), nullable=True)  # materials, labor, equipment, etc.
    physical_progress_at_time = Column(Float, nullable=True)
    financial_progress_at_time = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    project = relationship("Project", back_populates="financial_records")


# ── Risk Scores ─────────────────────────────────────────────────────

class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(String(36), primary_key=True, default=_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)

    overall_score = Column(Float, nullable=False)  # 0-100
    image_risk = Column(Float, nullable=True)
    financial_risk = Column(Float, nullable=True)
    geospatial_risk = Column(Float, nullable=True)
    evidence_risk = Column(Float, nullable=True)
    contractor_risk = Column(Float, nullable=True)

    # Explainability
    explanation = Column(JSON, nullable=True)  # list of reason strings / SHAP values
    contributing_factors = Column(JSON, nullable=True)

    is_mock = Column(Boolean, default=False, nullable=False)
    calculated_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    project = relationship("Project", back_populates="risk_scores")


# ── Alerts ──────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=_uuid)
    alert_code = Column(String(50), unique=True, nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)

    alert_type = Column(Enum(AlertType), nullable=False)
    severity = Column(Enum(AlertSeverity), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    evidence_data = Column(JSON, nullable=True)

    status = Column(Enum(AlertStatus), default=AlertStatus.OPEN, nullable=False, index=True)
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    project = relationship("Project", back_populates="alerts")


# ── Project Events (Timeline) ──────────────────────────────────────

class ProjectEvent(Base):
    __tablename__ = "project_events"

    id = Column(String(36), primary_key=True, default=_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)

    event_type = Column(String(100), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    project = relationship("Project", back_populates="events")


# ── Audit Logs ──────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=_uuid)

    actor_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    actor_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)

    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)

    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    __table_args__ = (
        Index("ix_audit_actor_action", "actor_id", "action"),
        Index("ix_audit_entity", "entity_type", "entity_id"),
        Index("ix_audit_created", "created_at"),
    )


# ── Inspector Summons ───────────────────────────────────────────────

class InspectorSummons(Base):
    __tablename__ = "inspector_summons"

    id = Column(String(36), primary_key=True, default=_uuid)
    summons_code = Column(String(50), unique=True, nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    inspector_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    officer_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    # Summons details
    reason = Column(Text, nullable=False)  # Why the report is requested
    questions = Column(JSON, nullable=True)  # Specific questions officer wants answered

    status = Column(Enum(SummonsStatus), default=SummonsStatus.PENDING, nullable=False, index=True)

    # Inspector response
    response_text = Column(Text, nullable=True)
    response_attachments = Column(JSON, nullable=True)  # File references if any
    responded_at = Column(DateTime(timezone=True), nullable=True)

    # Officer review
    officer_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    project = relationship("Project")
    inspector = relationship("User", foreign_keys=[inspector_user_id])
    officer = relationship("User", foreign_keys=[officer_user_id])

    __table_args__ = (
        Index("ix_summons_status_project", "status", "project_id"),
        Index("ix_summons_inspector_status", "inspector_user_id", "status"),
    )


# ── Expense Bills & Material Invoices ───────────────────────────────

class ExpenseBill(Base):
    __tablename__ = "expense_bills"

    id = Column(String(36), primary_key=True, default=_uuid)
    bill_code = Column(String(50), unique=True, nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    inspector_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)

    vendor_name = Column(String(255), nullable=False)
    invoice_number = Column(String(100), nullable=True)
    bill_date = Column(DateTime(timezone=True), nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)
    file_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)

    # Line items with benchmark comparison details
    items = Column(JSON, nullable=False)  # list of item objects

    # AI Anomaly Evaluation
    overall_deviation_pct = Column(Float, default=0.0, nullable=False)
    anomaly_score = Column(Float, default=0.0, nullable=False)  # 0-100 risk score
    fraud_risk_level = Column(String(50), default="LOW", nullable=False)
    ai_analysis_summary = Column(Text, nullable=True)
    status = Column(Enum(ExpenseBillStatus), default=ExpenseBillStatus.VERIFIED, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    project = relationship("Project", back_populates="expense_bills")
    inspector = relationship("User", foreign_keys=[inspector_user_id])

    __table_args__ = (
        Index("ix_bills_project_created", "project_id", "created_at"),
        Index("ix_bills_inspector", "inspector_user_id"),
    )


# ── Inspector Management Requests (District Officer -> Admin Approval) ─

class InspectorRequest(Base):
    __tablename__ = "inspector_requests"

    id = Column(String(36), primary_key=True, default=_uuid)
    request_code = Column(String(50), unique=True, nullable=False, index=True)
    request_type = Column(Enum(InspectorRequestType), nullable=False, index=True)  # add or remove
    officer_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    target_inspector_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)

    # Submitted data payload (for add: full_name, email, inspector_id, phone, password, state, district; for remove: target info)
    inspector_data = Column(JSON, nullable=False)
    reason = Column(Text, nullable=False)

    status = Column(Enum(InspectorRequestStatus), default=InspectorRequestStatus.PENDING, nullable=False, index=True)
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    admin_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)

    officer = relationship("User", foreign_keys=[officer_user_id])
    target_inspector = relationship("User", foreign_keys=[target_inspector_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    __table_args__ = (
        Index("ix_insp_req_status_created", "status", "created_at"),
        Index("ix_insp_req_officer", "officer_user_id"),
    )


