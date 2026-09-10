"""
Abstract Base Classes for AI / Forensics / Anomaly Detection Providers.

Following Section 11, 12, 13, 14, 15, 16, 32:
All AI components use modular interfaces so mock/production providers
can be swapped seamlessly without altering business logic.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from pydantic import BaseModel


class ForensicsResult(BaseModel):
    """Result of Image Forensics & Authenticity analysis."""
    risk_score: float  # 0-100 (0: high confidence authentic, 100: high risk anomaly)
    risk_level: str    # low, moderate, high, critical
    indicators: list[dict[str, Any]]  # Specific indicators e.g. metadata stripped, ELA anomaly
    c2pa_present: bool = False
    metadata_intact: bool = True
    manipulation_probability: float = 0.0
    summary: str
    is_work_photo: bool = True
    detected_category: str = "infrastructure"
    work_match_confidence: float = 95.0
    requires_peer_acceptance: bool = False
    peer_review_reason: str | None = None


class SimilarityMatch(BaseModel):
    """Potential match with historical evidence."""
    matched_evidence_id: str
    matched_project_code: str
    matched_project_name: str
    matched_capture_date: str
    similarity_score: float  # 0-100%
    match_confidence: str    # LOW, MEDIUM, HIGH


class SimilarityResult(BaseModel):
    """Result of duplicate / cross-project image similarity check."""
    max_similarity: float
    potential_reuse_detected: bool
    matches: list[SimilarityMatch]
    summary: str


class FinancialAnomalyResult(BaseModel):
    """Result of financial & physical progress analysis."""
    risk_score: float  # 0-100
    progress_expenditure_gap: float  # e.g., Financial 91% - Physical 42% = +49%
    cost_variance_pct: float
    is_decoupled: bool
    is_cost_anomalous: bool
    indicators: list[str]
    summary: str


class SatelliteVerificationResult(BaseModel):
    """Result of pre/during/post satellite imagery change detection."""
    change_detected: bool
    confidence_pct: float
    vegetation_index_change: float | None = None
    builtup_index_change: float | None = None
    status_label: str  # "Construction detected", "Construction partially detected", "Little/no detectable change", "Insufficient imagery"
    summary: str


class CompositeRiskResult(BaseModel):
    """Explainable composite risk score breakdown."""
    overall_score: float  # 0-100
    risk_level: str       # low, moderate, high, critical
    image_risk: float
    financial_risk: float
    geospatial_risk: float
    evidence_risk: float
    contractor_risk: float
    explanation_points: list[str]
    contributing_factors: dict[str, Any]
    shap_values: dict[str, float]


class ImageForensicsProvider(ABC):
    @abstractmethod
    async def analyze_image(self, file_path: str, metadata: dict[str, Any] | None = None) -> ForensicsResult:
        pass


class SimilarityProvider(ABC):
    @abstractmethod
    async def check_similarity(
        self,
        image_hash: str,
        current_project_id: str,
        historical_pool: list[dict[str, Any]],
    ) -> SimilarityResult:
        pass


class FinancialAnomalyProvider(ABC):
    @abstractmethod
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
        pass


class SatelliteProvider(ABC):
    @abstractmethod
    async def verify_site(
        self,
        latitude: float,
        longitude: float,
        start_date: str | None,
        expected_date: str | None,
        physical_progress: float,
    ) -> SatelliteVerificationResult:
        pass


class RiskEngineProvider(ABC):
    @abstractmethod
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
        pass
