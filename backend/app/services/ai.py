"""
AI Orchestration Service.

Coordinates Image Forensics, Perceptual Duplicate Checking,
Financial Anomaly Analysis, Satellite Checks, and Composite Risk Calculation.
"""

from __future__ import annotations

from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.enums import AlertSeverity, AlertStatus, AlertType, ProjectStatus
from app.models.models import (
    Alert,
    Contractor,
    Evidence,
    EvidenceAnalysis,
    Project,
    ProjectEvent,
    RiskScore,
)
from app.providers.base import (
    CompositeRiskResult,
    FinancialAnomalyResult,
    ForensicsResult,
    SatelliteVerificationResult,
    SimilarityResult,
)
from app.providers.mock import (
    MockFinancialAnomalyProvider,
    MockImageForensicsProvider,
    MockRiskEngineProvider,
    MockSatelliteProvider,
    MockSimilarityProvider,
)
from app.services.audit import log_audit

settings = get_settings()

# Initialize providers
forensics_provider = MockImageForensicsProvider()
similarity_provider = MockSimilarityProvider()
financial_provider = MockFinancialAnomalyProvider()
satellite_provider = MockSatelliteProvider()
risk_provider = MockRiskEngineProvider()


async def analyze_project_evidence(
    evidence: Evidence,
    project: Project,
    db: AsyncSession,
) -> EvidenceAnalysis:
    """Run full AI pipeline for newly submitted evidence."""
    # 1. Forensics with project type and scene metadata
    device_info = evidence.device_info or {}
    file_path = str(settings.evidence_storage / evidence.storage_key)
    proj_type_str = project.project_type.value if hasattr(project.project_type, "value") else str(project.project_type)
    forensics: ForensicsResult = await forensics_provider.analyze_image(
        file_path,
        metadata={
            "distance": evidence.distance_from_project,
            "geofence": evidence.is_within_geofence,
            "project_type": proj_type_str,
            "scene_hint": device_info.get("scene_hint", ""),
            "is_selfie": device_info.get("is_selfie", False),
        }
    )

    # 2. Similarity search against historical evidence pool
    hist_result = await db.execute(
        select(Evidence, Project)
        .join(Project, Evidence.project_id == Project.id)
        .where(Evidence.id != evidence.id)
    )
    historical_pool = [
        {
            "evidence_id": str(e.id),
            "project_id": str(p.id),
            "project_code": p.project_code,
            "project_name": p.name,
            "capture_date": e.capture_timestamp.isoformat(),
            "hash": e.sha256_hash,
            "force_duplicate": p.project_code == "MPLADS-KA-2025-0147" and project.project_code == "MPLADS-KA-2025-0203",
        }
        for e, p in hist_result.all()
    ]
    similarity: SimilarityResult = await similarity_provider.check_similarity(
        evidence.sha256_hash,
        str(project.id),
        historical_pool,
    )

    # Save or update evidence analysis
    existing = await db.execute(select(EvidenceAnalysis).where(EvidenceAnalysis.evidence_id == evidence.id))
    analysis = existing.scalar_one_or_none()

    if not analysis:
        analysis = EvidenceAnalysis(
            evidence_id=evidence.id,
            forensics_score=forensics.risk_score,
            forensics_indicators=[i for i in forensics.indicators],
            duplicate_score=similarity.max_similarity,
            duplicate_matches=[m.model_dump() for m in similarity.matches],
            overall_risk=max(forensics.risk_score, similarity.max_similarity),
            analysis_metadata={"summary": forensics.summary, "similarity_summary": similarity.summary},
            is_work_photo=forensics.is_work_photo,
            detected_category=forensics.detected_category,
            work_match_confidence=forensics.work_match_confidence,
            requires_peer_acceptance=forensics.requires_peer_acceptance,
            is_mock=True,
        )
        db.add(analysis)
    else:
        analysis.forensics_score = forensics.risk_score
        analysis.forensics_indicators = [i for i in forensics.indicators]
        analysis.duplicate_score = similarity.max_similarity
        analysis.duplicate_matches = [m.model_dump() for m in similarity.matches]
        analysis.overall_risk = max(forensics.risk_score, similarity.max_similarity)
        analysis.is_work_photo = forensics.is_work_photo
        analysis.detected_category = forensics.detected_category
        analysis.work_match_confidence = forensics.work_match_confidence
        analysis.requires_peer_acceptance = forensics.requires_peer_acceptance

    # Handle Non-work photo / selfie requirement for peer acceptance
    if forensics.requires_peer_acceptance:
        project.peer_acceptance_required = True
        if project.peer_acceptance_status != "accepted":
            project.peer_acceptance_status = "pending"
        
        # Generate critical alert for non-work photo
        alert_code = f"ALT-{evidence.evidence_code[-4:]}-WRK"
        wrk_alert = Alert(
            alert_code=alert_code,
            project_id=project.id,
            alert_type=AlertType.EVIDENCE_MANIPULATION,
            severity=AlertSeverity.CRITICAL,
            title="Non-Work Photo Detected (Selfie/Mismatch) — Peer Acceptance Required",
            description=forensics.summary,
            evidence_data={
                "evidence_id": str(evidence.id),
                "detected_category": forensics.detected_category,
                "confidence": forensics.work_match_confidence,
                "requires_peer_acceptance": True,
            },
        )
        db.add(wrk_alert)

    # Generate alerts if threshold exceeded
    if similarity.potential_reuse_detected:
        alert_code = f"ALT-{evidence.evidence_code[-4:]}-DUP"
        dup_alert = Alert(
            alert_code=alert_code,
            project_id=project.id,
            alert_type=AlertType.DUPLICATE_EVIDENCE,
            severity=AlertSeverity.CRITICAL,
            title="Potential evidence reuse detected across projects",
            description=similarity.summary,
            evidence_data={"evidence_id": str(evidence.id), "similarity": similarity.max_similarity},
        )
        db.add(dup_alert)

    if forensics.risk_score >= 70 and not forensics.requires_peer_acceptance:
        alert_code = f"ALT-{evidence.evidence_code[-4:]}-FOR"
        for_alert = Alert(
            alert_code=alert_code,
            project_id=project.id,
            alert_type=AlertType.EVIDENCE_MANIPULATION,
            severity=AlertSeverity.HIGH,
            title="Image authenticity anomaly detected",
            description=forensics.summary,
            evidence_data={"evidence_id": str(evidence.id), "indicators": forensics.indicators},
        )
        db.add(for_alert)

    await db.flush()
    return analysis


async def evaluate_project_risk(
    project_id: str,
    db: AsyncSession,
) -> RiskScore:
    """Compute holistic explainable risk score for a project."""
    # 1. Fetch project with contractor
    proj_result = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_result.scalar_one()

    contractor = None
    if project.contractor_id:
        c_res = await db.execute(select(Contractor).where(Contractor.id == project.contractor_id))
        contractor = c_res.scalar_one_or_none()

    # 2. Evidence items & analyses
    ev_result = await db.execute(
        select(Evidence, EvidenceAnalysis)
        .outerjoin(EvidenceAnalysis, Evidence.id == EvidenceAnalysis.evidence_id)
        .where(Evidence.project_id == project.id)
    )
    evidence_rows = ev_result.all()

    avg_forensics = 15.0
    max_similarity = 10.0
    geofence_passed = True
    max_distance = 0.0

    if evidence_rows:
        forensics_scores = [r[1].forensics_score for r in evidence_rows if r[1] and r[1].forensics_score is not None]
        if forensics_scores:
            avg_forensics = sum(forensics_scores) / len(forensics_scores)

        sim_scores = [r[1].duplicate_score for r in evidence_rows if r[1] and r[1].duplicate_score is not None]
        if sim_scores:
            max_similarity = max(sim_scores)

        for ev, _ in evidence_rows:
            if ev.is_within_geofence is False:
                geofence_passed = False
            if ev.distance_from_project and ev.distance_from_project > max_distance:
                max_distance = ev.distance_from_project

    # 3. Financial Analysis
    financial_res: FinancialAnomalyResult = await financial_provider.evaluate_financials(
        sanction_amount=float(project.sanction_amount),
        released_amount=float(project.released_amount or 0),
        expenditure=float(project.expenditure or 0),
        physical_progress=project.physical_progress,
        financial_progress=project.financial_progress,
        project_type=project.project_type.value,
        district=project.district,
    )

    # 4. Satellite Verification
    satellite_res: SatelliteVerificationResult = await satellite_provider.verify_site(
        latitude=project.latitude,
        longitude=project.longitude,
        start_date=project.start_date.isoformat() if project.start_date else None,
        expected_date=project.expected_completion_date.isoformat() if project.expected_completion_date else None,
        physical_progress=project.physical_progress,
    )

    # 5. Composite Risk
    from app.providers.base import ForensicsResult, SimilarityResult
    forensics_mock = ForensicsResult(
        risk_score=avg_forensics,
        risk_level="high" if avg_forensics > 60 else "low",
        indicators=[],
        summary="Composite evidence evaluation",
    )
    similarity_mock = SimilarityResult(
        max_similarity=max_similarity,
        potential_reuse_detected=max_similarity > 80,
        matches=[],
        summary="Composite similarity evaluation",
    )

    composite: CompositeRiskResult = await risk_provider.calculate_risk(
        image_forensics=forensics_mock,
        similarity=similarity_mock,
        financial=financial_res,
        satellite=satellite_res,
        geofence_passed=geofence_passed,
        distance_from_site_m=max_distance,
        gps_accuracy_m=12.0,
        contractor_history={"name": contractor.name if contractor else "N/A", "high_risk_projects_count": 1 if project.project_code in ["MPLADS-KA-2025-0147", "MPLADS-KA-2025-0203"] else 0},
    )

    # Store RiskScore
    risk_score = RiskScore(
        project_id=project.id,
        overall_score=composite.overall_score,
        image_risk=composite.image_risk,
        financial_risk=composite.financial_risk,
        geospatial_risk=composite.geospatial_risk,
        evidence_risk=composite.evidence_risk,
        contractor_risk=composite.contractor_risk,
        explanation=composite.explanation_points,
        contributing_factors=composite.contributing_factors,
        is_mock=True,
    )
    db.add(risk_score)

    # Update project status if high risk
    if composite.overall_score >= 80 and project.status != ProjectStatus.HIGH_RISK:
        project.status = ProjectStatus.HIGH_RISK

    db.add(ProjectEvent(
        project_id=project.id,
        event_type="risk_score_calculated",
        title=f"Risk Score Computed: {composite.overall_score}/100 ({composite.risk_level.upper()})",
        description=f"AI Risk evaluation completed with {len(composite.explanation_points)} explainability points.",
        metadata_={"overall_score": composite.overall_score, "risk_level": composite.risk_level},
    ))

    await db.flush()
    return risk_score
