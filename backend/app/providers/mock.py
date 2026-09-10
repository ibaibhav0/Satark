"""
Mock AI providers for development, CI, and SIH 2026 hackathon demo scenarios.

Implements realistic mock responses with deterministic anomaly injection for demo projects.
"""

from __future__ import annotations

import random
from typing import Any

from app.providers.base import (
    CompositeRiskResult,
    FinancialAnomalyProvider,
    FinancialAnomalyResult,
    ForensicsResult,
    ImageForensicsProvider,
    RiskEngineProvider,
    SatelliteProvider,
    SatelliteVerificationResult,
    SimilarityMatch,
    SimilarityProvider,
    SimilarityResult,
)


class MockImageForensicsProvider(ImageForensicsProvider):
    async def analyze_image(self, file_path: str, metadata: dict[str, Any] | None = None) -> ForensicsResult:
        meta = metadata or {}
        is_suspicious = meta.get("force_suspicious", False)
        project_type = meta.get("project_type", "infrastructure")
        scene_hint = meta.get("scene_hint", "").lower()
        file_lower = file_path.lower()

        # Check for selfie or non-work photo simulation/detection
        is_selfie = (
            meta.get("is_selfie", False)
            or scene_hint in ("selfie", "person", "portrait", "non_work", "avatar")
            or any(term in file_lower for term in ("selfie", "portrait", "face", "avatar", "non_work", "dummy"))
        )

        if is_selfie:
            return ForensicsResult(
                risk_score=82.0,
                risk_level="high",
                indicators=[
                    {"name": "AI Scene Classification", "status": "FLAGGED", "detail": f"Detected personal selfie/portrait. Image does NOT depict project works ({project_type}). Peer acceptance from another inspector required."},
                    {"name": "Metadata Consistency", "status": "WARNING", "detail": "Front-facing camera metadata detected without wide-angle work field of view"},
                    {"name": "Error Level Analysis (ELA)", "status": "PASS", "detail": "Compression grid normal but subject matter non-compliant"},
                    {"name": "C2PA Provenance", "status": "ABSENT", "detail": "No hardware site attestation manifest found"},
                    {"name": "Physical Consistency", "status": "FLAGGED", "detail": "Facial features detected in foreground; absent expected construction/project scene"},
                ],
                c2pa_present=False,
                metadata_intact=True,
                manipulation_probability=0.74,
                summary=f"Non-work photo detected: AI Vision identified a personal selfie/portrait instead of expected project infrastructure ({project_type}). Requires peer acceptance from another inspector before work can be marked as completed.",
                is_work_photo=False,
                detected_category="inspector_selfie",
                work_match_confidence=18.5,
                requires_peer_acceptance=True,
                peer_review_reason=f"AI Scene Classifier flagged uploaded image as personal selfie/portrait. Work category mismatch ({project_type}). Peer inspector acceptance required before project completion.",
            )
        elif is_suspicious or "suspicious" in file_lower:
            return ForensicsResult(
                risk_score=88.5,
                risk_level="high",
                indicators=[
                    {"name": "AI Scene Classification", "status": "PASS", "detail": f"Scene matches project category ({project_type})"},
                    {"name": "Metadata Consistency", "status": "FLAGGED", "detail": "EXIF capture date inconsistent with upload timestamp"},
                    {"name": "Error Level Analysis (ELA)", "status": "ANOMALY", "detail": "Localized compression artifacts detected in central quadrant"},
                    {"name": "C2PA Provenance", "status": "ABSENT", "detail": "No cryptographic provenance manifest found"},
                    {"name": "Physical Consistency", "status": "WARNING", "detail": "Shadow vector mismatch with sun elevation at recorded timestamp"},
                ],
                c2pa_present=False,
                metadata_intact=False,
                manipulation_probability=0.82,
                summary="Image authenticity anomaly detected — localized compression and shadow vector mismatch require review.",
                is_work_photo=True,
                detected_category=str(project_type),
                work_match_confidence=88.0,
                requires_peer_acceptance=False,
                peer_review_reason=None,
            )
        else:
            return ForensicsResult(
                risk_score=14.0,
                risk_level="low",
                indicators=[
                    {"name": "AI Scene Classification", "status": "PASS", "detail": f"Scene verified: Valid infrastructure work matching project type ({project_type})"},
                    {"name": "Metadata Consistency", "status": "PASS", "detail": "EXIF camera parameters and timestamps verified"},
                    {"name": "Error Level Analysis (ELA)", "status": "PASS", "detail": "Uniform compression grid observed"},
                    {"name": "C2PA Provenance", "status": "VERIFIED", "detail": "Hardware camera attestation signature verified"},
                    {"name": "Physical Consistency", "status": "PASS", "detail": "Illumination and shadow vectors consistent with solar position"},
                ],
                c2pa_present=True,
                metadata_intact=True,
                manipulation_probability=0.06,
                summary=f"Evidence integrity verified — AI Scene Classification confirmed genuine {project_type} work site photo.",
                is_work_photo=True,
                detected_category=str(project_type),
                work_match_confidence=97.2,
                requires_peer_acceptance=False,
                peer_review_reason=None,
            )


class MockSimilarityProvider(SimilarityProvider):
    async def check_similarity(
        self,
        image_hash: str,
        current_project_id: str,
        historical_pool: list[dict[str, Any]],
    ) -> SimilarityResult:
        # Check if any historical record has high match simulation
        for item in historical_pool:
            if item.get("project_id") != current_project_id and item.get("force_duplicate", False):
                return SimilarityResult(
                    max_similarity=94.2,
                    potential_reuse_detected=True,
                    matches=[
                        SimilarityMatch(
                            matched_evidence_id=item.get("evidence_id", "EVD-PREV-0087"),
                            matched_project_code=item.get("project_code", "MPLADS-KA-2025-0147"),
                            matched_project_name=item.get("project_name", "Community Health Center Construction"),
                            matched_capture_date=item.get("capture_date", "2025-10-12"),
                            similarity_score=94.2,
                            match_confidence="HIGH",
                        )
                    ],
                    summary="Potential evidence reuse detected — 94.2% perceptual hash similarity with historical project MPLADS-KA-2025-0147.",
                )

        return SimilarityResult(
            max_similarity=18.5,
            potential_reuse_detected=False,
            matches=[],
            summary="No significant visual duplicates detected in historical repository.",
        )


class MockFinancialAnomalyProvider(FinancialAnomalyProvider):
    async def evaluate_financials(
        self,
        sanction_amount: float,
        released_amount: float,
        expenditure: float,
        physical_progress: float,
        financial_progress: float,
        project_type: str,
        district: str,
    ) -> FinancialAnomalyResult:
        gap = financial_progress - physical_progress
        is_decoupled = gap > 25.0
        indicators = []

        if is_decoupled:
            indicators.append(f"Progress-expenditure gap of +{gap:.1f}% exceeds 25% threshold")
            indicators.append(f"Financial expenditure ({financial_progress:.1f}%) significantly outpaces physical site work ({physical_progress:.1f}%)")

        cost_variance = 0.0
        if expenditure > 0 and physical_progress > 0:
            effective_cost_rate = expenditure / (physical_progress / 100.0)
            if effective_cost_rate > sanction_amount * 1.2:
                cost_variance = ((effective_cost_rate / sanction_amount) - 1.0) * 100.0
                indicators.append(f"Effective completion cost trend is +{cost_variance:.1f}% above sanctioned benchmark")

        risk = 15.0
        if is_decoupled:
            risk += 50.0
        if cost_variance > 20:
            risk += 25.0
        risk = min(100.0, risk)

        return FinancialAnomalyResult(
            risk_score=round(risk, 1),
            progress_expenditure_gap=round(gap, 1),
            cost_variance_pct=round(cost_variance, 1),
            is_decoupled=is_decoupled,
            is_cost_anomalous=cost_variance > 20.0,
            indicators=indicators if indicators else ["Financial progress aligns with physical execution milestone schedule."],
            summary="Severe progress–expenditure decoupling detected — requires audit." if is_decoupled else "Financial velocity is within expected benchmark parameters.",
        )


class MockSatelliteProvider(SatelliteProvider):
    async def verify_site(
        self,
        latitude: float,
        longitude: float,
        start_date: str | None,
        expected_date: str | None,
        physical_progress: float,
    ) -> SatelliteVerificationResult:
        if physical_progress > 60:
            # If reported physical progress is high, verify whether satellite observed building change
            return SatelliteVerificationResult(
                change_detected=True,
                confidence_pct=88.0,
                vegetation_index_change=-0.22,
                builtup_index_change=0.45,
                status_label="Construction detected",
                summary="Multi-temporal optical comparison confirms substantial ground structural footprint expansion.",
            )
        else:
            return SatelliteVerificationResult(
                change_detected=True,
                confidence_pct=72.0,
                vegetation_index_change=-0.08,
                builtup_index_change=0.15,
                status_label="Construction partially detected",
                summary="Ground excavation and preliminary clearing visible at registered coordinates.",
            )


class MockRiskEngineProvider(RiskEngineProvider):
    async def calculate_risk(
        self,
        image_forensics: ForensicsResult | None,
        similarity: SimilarityResult | None,
        financial: FinancialAnomalyResult | None,
        satellite: SatelliteVerificationResult | None,
        geofence_passed: bool,
        distance_from_site_m: float,
        gps_accuracy_m: float | None,
        contractor_history: dict[str, Any] | None,
    ) -> CompositeRiskResult:
        # Component weights
        img_risk = image_forensics.risk_score if image_forensics else 15.0
        sim_risk = similarity.max_similarity if (similarity and similarity.potential_reuse_detected) else 10.0
        evidence_risk = max(img_risk, sim_risk)

        fin_risk = financial.risk_score if financial else 15.0

        # Geospatial risk
        geo_risk = 10.0
        if not geofence_passed:
            geo_risk = 90.0
        elif distance_from_site_m > 100:
            geo_risk = 50.0
        if gps_accuracy_m and gps_accuracy_m > 30.0:
            geo_risk = min(100.0, geo_risk + 20.0)

        # Contractor risk
        contractor_risk = 25.0
        if contractor_history and contractor_history.get("high_risk_projects_count", 0) > 0:
            contractor_risk = 65.0

        # Weighted calculation: 30% Financial, 25% Evidence/Forensics, 20% Geospatial, 15% Similarity/Duplicate, 10% Contractor
        weighted_score = (
            (fin_risk * 0.30) +
            (img_risk * 0.20) +
            (sim_risk * 0.15) +
            (geo_risk * 0.20) +
            (contractor_risk * 0.15)
        )
        overall_score = round(min(100.0, max(0.0, weighted_score)), 1)

        level = "low"
        if overall_score >= 80:
            level = "critical"
        elif overall_score >= 60:
            level = "high"
        elif overall_score >= 30:
            level = "moderate"

        # Explanations
        explanations: list[str] = []
        shap_vals: dict[str, float] = {}

        if fin_risk > 60:
            explanations.append(f"Physical progress vs financial expenditure decoupling detected (gap: {financial.progress_expenditure_gap if financial else 0}%)")
            shap_vals["financial_decoupling"] = 0.35
        else:
            shap_vals["financial_decoupling"] = -0.10

        if sim_risk > 60:
            explanations.append(f"Visual similarity engine flagged potential cross-project duplicate evidence ({similarity.max_similarity if similarity else 0:.1f}%)")
            shap_vals["image_duplicate"] = 0.28

        if not geofence_passed:
            explanations.append(f"Evidence captured outside authorized project perimeter ({distance_from_site_m:.1f}m away)")
            shap_vals["geofence_violation"] = 0.25

        if img_risk > 60:
            explanations.append("Image forensics indicated potential manipulation or metadata anomalies")
            shap_vals["forensics_anomaly"] = 0.20

        if contractor_risk > 50:
            explanations.append("Contractor portfolio exhibits elevated historical anomaly recurrence")
            shap_vals["contractor_history"] = 0.12

        if not explanations:
            explanations.append("All physical, financial, and geospatial parameters are within normal variance thresholds.")

        return CompositeRiskResult(
            overall_score=overall_score,
            risk_level=level,
            image_risk=round(img_risk, 1),
            financial_risk=round(fin_risk, 1),
            geospatial_risk=round(geo_risk, 1),
            evidence_risk=round(evidence_risk, 1),
            contractor_risk=round(contractor_risk, 1),
            explanation_points=explanations,
            contributing_factors={
                "financial_gap": financial.progress_expenditure_gap if financial else 0,
                "max_image_similarity": similarity.max_similarity if similarity else 0,
                "geofence_passed": geofence_passed,
                "distance_m": distance_from_site_m,
                "contractor_score": contractor_risk,
            },
            shap_values=shap_vals,
        )
