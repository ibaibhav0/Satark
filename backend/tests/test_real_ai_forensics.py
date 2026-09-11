"""
Comprehensive tests for Real AI Forensics & Risk Engine and Duplicate Image Blocking.
"""

from __future__ import annotations

import io
from pathlib import Path

import imagehash
import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image

from app.core.security import create_access_token
from app.main import app
from app.models.models import Evidence, Project, User
from app.providers.real import (
    RealFinancialAnomalyProvider,
    RealImageForensicsProvider,
    RealRiskEngineProvider,
    RealSatelliteProvider,
    RealSimilarityProvider,
)
from sqlalchemy import select


def _generate_test_image(color: tuple[int, int, int] = (120, 140, 160), pattern: str = "civil") -> bytes:
    """Generate a test image with synthetic pattern in JPEG format."""
    img = Image.new("RGB", (120, 120), color=color)
    if pattern == "civil":
        # Draw high-frequency structural lines simulating concrete / rebar
        arr = np.array(img)
        for i in range(10, 110, 10):
            arr[i, :, :] = (40, 40, 40)
            arr[:, i, :] = (200, 200, 200)
        img = Image.fromarray(arr)
    elif pattern == "portrait":
        # Fill with flesh tone
        arr = np.full((120, 120, 3), (220, 170, 140), dtype=np.uint8)
        img = Image.fromarray(arr)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_real_image_forensics_ela_and_scene(tmp_path: Path):
    """Test Error Level Analysis (ELA) and scene classification on real generated images."""
    forensics = RealImageForensicsProvider()

    # 1. Clean civil work photo
    clean_bytes = _generate_test_image(pattern="civil")
    clean_file = tmp_path / "site_work.jpg"
    clean_file.write_bytes(clean_bytes)

    res_clean = await forensics.analyze_image(str(clean_file), {"project_type": "road"})
    assert res_clean.risk_score < 40.0
    assert res_clean.is_work_photo is True
    assert res_clean.requires_peer_acceptance is False
    assert any(i["name"] == "Error Level Analysis (ELA)" for i in res_clean.indicators)

    # 2. Portrait / Selfie photo detection
    portrait_bytes = _generate_test_image(pattern="portrait")
    portrait_file = tmp_path / "inspector_selfie.jpg"
    portrait_file.write_bytes(portrait_bytes)

    res_selfie = await forensics.analyze_image(str(portrait_file), {"project_type": "road", "is_selfie": True})
    assert res_selfie.risk_score >= 75.0
    assert res_selfie.is_work_photo is False
    assert res_selfie.requires_peer_acceptance is True
    assert "selfie" in res_selfie.detected_category.lower() or "portrait" in res_selfie.summary.lower()


@pytest.mark.asyncio
async def test_real_similarity_perceptual_hashing():
    """Test Perceptual Hashing (pHash) duplicate detection logic."""
    similarity_engine = RealSimilarityProvider()

    img1_bytes = _generate_test_image(color=(100, 150, 200), pattern="civil")
    img1 = Image.open(io.BytesIO(img1_bytes))
    hashes = similarity_engine.compute_hashes_for_image(img1)
    phash1 = hashes["phash"]

    # Identical image
    historical_pool = [
        {
            "evidence_id": "EVD-HIST-001",
            "project_id": "proj-diff-999",
            "project_code": "MPLADS-KA-2024-0010",
            "project_name": "Earlier Road Works",
            "capture_date": "2025-01-10T10:00:00",
            "hash": "some_sha256",
            "phash": phash1,
        }
    ]

    res = await similarity_engine.check_similarity(
        image_hash=phash1,
        current_project_id="proj-current-111",
        historical_pool=historical_pool,
    )

    assert res.potential_reuse_detected is True
    assert res.max_similarity >= 95.0
    assert len(res.matches) >= 1
    assert res.matches[0].matched_project_code == "MPLADS-KA-2024-0010"


@pytest.mark.asyncio
async def test_real_financial_anomaly_cpwd_engine():
    """Test CPWD Schedule of Rates and progress decoupling calculations."""
    financial_engine = RealFinancialAnomalyProvider()

    # Severe decoupling (physical: 35%, financial: 85% -> gap +50%)
    res = await financial_engine.evaluate_financials(
        sanction_amount=5000000.0,
        released_amount=4500000.0,
        expenditure=4250000.0,
        physical_progress=35.0,
        financial_progress=85.0,
        project_type="community_hall",
        district="Bengaluru Urban",
    )

    assert res.is_decoupled is True
    assert res.progress_expenditure_gap == 50.0
    assert res.risk_score >= 60.0
    assert any("progress–expenditure decoupling" in ind.lower() for ind in res.indicators)


@pytest.mark.asyncio
async def test_real_satellite_remote_sensing():
    """Test Remote Sensing optical change engine (NDVI/NDBI)."""
    satellite_engine = RealSatelliteProvider()

    # Advanced construction progress (75%)
    res_high = await satellite_engine.verify_site(
        latitude=12.9716,
        longitude=77.5946,
        start_date="2025-01-01",
        expected_date="2025-12-31",
        physical_progress=75.0,
    )

    assert res_high.change_detected is True
    assert res_high.confidence_pct >= 85.0
    assert res_high.builtup_index_change is not None and res_high.builtup_index_change > 0.30
    assert res_high.vegetation_index_change is not None and res_high.vegetation_index_change < 0


@pytest.mark.asyncio
async def test_real_shap_composite_risk_engine():
    """Test SHAP-inspired explainable multi-factor composite risk engine."""
    risk_engine = RealRiskEngineProvider()

    forensics_engine = RealImageForensicsProvider()
    clean_bytes = _generate_test_image()
    forensics_clean = await forensics_engine.analyze_image("dummy.jpg", {"force_suspicious": False})

    financial_engine = RealFinancialAnomalyProvider()
    fin_anom = await financial_engine.evaluate_financials(
        sanction_amount=4000000.0,
        released_amount=3600000.0,
        expenditure=3500000.0,
        physical_progress=30.0,
        financial_progress=88.0,
        project_type="road",
        district="Bengaluru Urban",
    )

    composite = await risk_engine.calculate_risk(
        image_forensics=forensics_clean,
        similarity=None,
        financial=fin_anom,
        satellite=None,
        geofence_passed=True,
        distance_from_site_m=25.0,
        gps_accuracy_m=8.0,
        contractor_history={"high_risk_projects_count": 0},
    )

    assert composite.overall_score >= 25.0
    assert "financial_decoupling" in composite.shap_values
    assert composite.shap_values["financial_decoupling"] > 0
    assert len(composite.explanation_points) > 0


@pytest.mark.asyncio
async def test_duplicate_image_upload_blocked_by_ai():
    """
    Test Duplicate Image Prevention:
    Uploading an image succeeds on the first attempt,
    but uploading the exact same image again is rejected with HTTP 409 Conflict.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login as inspector1
        login_res = await ac.post("/api/auth/login", json={"email": "inspector1@satark.gov.in", "password": "inspector123"})
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get assigned project for inspector1 (Project A: MPLADS-KA-2025-0147)
        proj_res = await ac.get("/api/projects", headers=headers)
        assert proj_res.status_code == 200
        projects = proj_res.json()["projects"]
        assert len(projects) > 0
        target_project = projects[0]

        # 3. Start an inspection
        insp_res = await ac.post(
            "/api/inspections/start",
            json={
                "project_id": target_project["id"],
                "latitude": target_project["latitude"],
                "longitude": target_project["longitude"],
                "gps_accuracy": 10.0,
            },
            headers=headers,
        )
        assert insp_res.status_code == 201
        inspection_id = insp_res.json()["id"]

        # 4. Generate unique test image bytes
        import random
        unique_color = (random.randint(50, 200), random.randint(50, 200), random.randint(50, 200))
        img_bytes = _generate_test_image(color=unique_color, pattern="civil")

        # 5. First upload: MUST SUCCEED (201 Created)
        files = {"file": ("first_upload.jpg", img_bytes, "image/jpeg")}
        data = {
            "latitude": str(target_project["latitude"]),
            "longitude": str(target_project["longitude"]),
            "gps_accuracy": "10.0",
        }
        upload1 = await ac.post(f"/api/inspections/{inspection_id}/evidence", data=data, files=files, headers=headers)
        assert upload1.status_code == 201
        ev_id = upload1.json()["id"]
        assert ev_id is not None

        # 6. Second upload of the EXACT SAME IMAGE: MUST BE BLOCKED (409 Conflict)
        files_dup = {"file": ("second_upload_duplicate.jpg", img_bytes, "image/jpeg")}
        upload2 = await ac.post(f"/api/inspections/{inspection_id}/evidence", data=data, files=files_dup, headers=headers)
        assert upload2.status_code == 409
        err_body = upload2.json()
        assert "Duplicate image blocked" in err_body["detail"]
        assert "AI Forensics" in err_body["detail"]
