"""
Seed script: creates demo users, contractors, projects, inspections,
evidence analysis results, risk scores, and alerts.

Run: python -m app.seed
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory, engine, Base
from app.core.security import hash_password
from app.models.enums import (
    AlertSeverity,
    AlertStatus,
    AlertType,
    AssignmentStatus,
    EvidenceStatus,
    ExpenseBillStatus,
    InspectionStatus,
    ProjectStatus,
    ProjectType,
    UserRole,
)
from app.models.models import (
    Alert,
    Contractor,
    Evidence,
    EvidenceAnalysis,
    ExpenseBill,
    FinancialRecord,
    Inspection,
    Project,
    ProjectEvent,
    ProjectInspector,
    RiskScore,
    User,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _days_ago(n: int) -> datetime:
    return _now() - timedelta(days=n)


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as db:
        # Check if already seeded
        result = await db.execute(select(User).limit(1))
        if result.scalar_one_or_none():
            print("Database already seeded. Skipping.")
            return

        # ── Users ───────────────────────────────────────────────────

        admin = User(
            email="admin@satark.gov.in",
            hashed_password=hash_password("admin123"),
            full_name="Dr. Rajesh Kumar",
            role=UserRole.ADMIN,
            state="Karnataka",
            district="Bengaluru Urban",
        )

        inspector1 = User(
            email="inspector1@satark.gov.in",
            hashed_password=hash_password("inspector123"),
            full_name="Priya Sharma",
            role=UserRole.FIELD_INSPECTOR,
            inspector_id="INS-0042",
            phone="+91-9876543210",
            state="Karnataka",
            district="Bengaluru Urban",
        )

        inspector2 = User(
            email="inspector2@satark.gov.in",
            hashed_password=hash_password("inspector123"),
            full_name="Amit Patel",
            role=UserRole.FIELD_INSPECTOR,
            inspector_id="INS-0078",
            phone="+91-9876543211",
            state="Karnataka",
            district="Mysuru",
        )

        inspector3 = User(
            email="inspector3@satark.gov.in",
            hashed_password=hash_password("inspector123"),
            full_name="Kavitha Reddy",
            role=UserRole.FIELD_INSPECTOR,
            inspector_id="INS-0105",
            phone="+91-9876543212",
            state="Telangana",
            district="Hyderabad",
        )

        officer = User(
            email="officer@satark.gov.in",
            hashed_password=hash_password("officer123"),
            full_name="Sanjay Mehra (IAS)",
            role=UserRole.DISTRICT_OFFICER,
            state="Karnataka",
            district="Bengaluru Urban",
        )

        auditor = User(
            email="auditor@satark.gov.in",
            hashed_password=hash_password("auditor123"),
            full_name="Meena Iyer",
            role=UserRole.AUDITOR,
            state="Karnataka",
        )

        db.add_all([admin, inspector1, inspector2, inspector3, officer, auditor])
        await db.flush()

        # ── Contractors ─────────────────────────────────────────────

        contractor1 = Contractor(
            name="Sri Lakshmi Constructions",
            registration_number="KA-CON-2024-0142",
            contact_person="B. Ramesh",
            phone="+91-8012345678",
            state="Karnataka",
            district="Bengaluru Urban",
        )
        contractor2 = Contractor(
            name="Bharat Infrastructure Pvt. Ltd.",
            registration_number="KA-CON-2023-0087",
            contact_person="Suresh Gowda",
            phone="+91-8012345679",
            state="Karnataka",
            district="Mysuru",
        )
        contractor3 = Contractor(
            name="National Builders Co.",
            registration_number="TS-CON-2024-0231",
            contact_person="K. Venkat Rao",
            phone="+91-9100034567",
            state="Telangana",
            district="Hyderabad",
        )
        db.add_all([contractor1, contractor2, contractor3])
        await db.flush()

        # ── Projects ────────────────────────────────────────────────

        # Project A: SUSPICIOUS — financial/physical mismatch
        proj_a = Project(
            project_code="MPLADS-KA-2025-0147",
            name="Community Health Center Construction — Yelahanka",
            description="Construction of a 30-bed community health center with OPD, pharmacy, and diagnostic lab.",
            project_type=ProjectType.HOSPITAL,
            state="Karnataka",
            district="Bengaluru Urban",
            constituency="Bengaluru North",
            village_locality="Yelahanka New Town",
            latitude=13.1007,
            longitude=77.5963,
            inspection_radius_m=150,
            sanction_amount=4500000,
            released_amount=4200000,
            expenditure=4095000,
            physical_progress=42,
            financial_progress=91,
            contractor_id=contractor1.id,
            start_date=_days_ago(180),
            expected_completion_date=_days_ago(-60),
            status=ProjectStatus.HIGH_RISK,
            created_by=admin.id,
        )

        # Project B: SUSPICIOUS — duplicate evidence
        proj_b = Project(
            project_code="MPLADS-KA-2025-0203",
            name="Village Road Widening — Kengeri to Kumbalagodu",
            description="Widening of 2.5 km village road from single lane to double lane with drainage.",
            project_type=ProjectType.ROAD,
            state="Karnataka",
            district="Bengaluru Urban",
            constituency="Rajarajeshwarinagar",
            village_locality="Kumbalagodu",
            latitude=12.8985,
            longitude=77.4879,
            inspection_radius_m=200,
            sanction_amount=3200000,
            released_amount=2800000,
            expenditure=2650000,
            physical_progress=65,
            financial_progress=83,
            contractor_id=contractor1.id,
            start_date=_days_ago(120),
            expected_completion_date=_days_ago(-30),
            status=ProjectStatus.UNDER_REVIEW,
            created_by=admin.id,
        )

        # Project C: SUSPICIOUS — geofence violation
        proj_c = Project(
            project_code="MPLADS-KA-2025-0089",
            name="Primary School Renovation — Hebbal Ward",
            description="Renovation of government primary school including roof repair, painting, new furniture.",
            project_type=ProjectType.SCHOOL,
            state="Karnataka",
            district="Bengaluru Urban",
            constituency="Bengaluru North",
            village_locality="Hebbal",
            latitude=13.0358,
            longitude=77.5970,
            inspection_radius_m=100,
            sanction_amount=1800000,
            released_amount=1500000,
            expenditure=1380000,
            physical_progress=70,
            financial_progress=77,
            contractor_id=contractor2.id,
            start_date=_days_ago(90),
            expected_completion_date=_days_ago(-15),
            status=ProjectStatus.ESCALATED,
            created_by=admin.id,
        )

        # Project D: CLEAN — low risk
        proj_d = Project(
            project_code="MPLADS-KA-2025-0312",
            name="Drinking Water Pipeline — Whitefield",
            description="Installation of 3 km drinking water pipeline from overhead tank to distribution network.",
            project_type=ProjectType.DRINKING_WATER,
            state="Karnataka",
            district="Bengaluru Urban",
            constituency="Mahadevapura",
            village_locality="Whitefield",
            latitude=12.9698,
            longitude=77.7500,
            inspection_radius_m=250,
            sanction_amount=2500000,
            released_amount=2000000,
            expenditure=1800000,
            physical_progress=72,
            financial_progress=72,
            contractor_id=contractor2.id,
            start_date=_days_ago(150),
            expected_completion_date=_days_ago(-45),
            status=ProjectStatus.UNDER_INSPECTION,
            created_by=admin.id,
        )

        # Project E: Mysuru district — assigned to inspector2
        proj_e = Project(
            project_code="MPLADS-KA-2025-0456",
            name="Community Hall Construction — Mysuru South",
            description="Construction of multi-purpose community hall with capacity of 200 persons.",
            project_type=ProjectType.COMMUNITY_HALL,
            state="Karnataka",
            district="Mysuru",
            constituency="Krishnaraja",
            village_locality="Jayalakshmipuram",
            latitude=12.3051,
            longitude=76.6551,
            inspection_radius_m=120,
            sanction_amount=5000000,
            released_amount=3500000,
            expenditure=3200000,
            physical_progress=60,
            financial_progress=64,
            contractor_id=contractor2.id,
            start_date=_days_ago(200),
            expected_completion_date=_days_ago(-20),
            status=ProjectStatus.INSPECTOR_ASSIGNED,
            created_by=admin.id,
        )

        # Project F: Hyderabad — assigned to inspector3
        proj_f = Project(
            project_code="MPLADS-TS-2025-0078",
            name="Street Electrification — Kukatpally",
            description="Installation of 80 LED street lights along main roads and colony internal roads.",
            project_type=ProjectType.ELECTRIFICATION,
            state="Telangana",
            district="Hyderabad",
            constituency="Kukatpally",
            village_locality="KPHB Colony",
            latitude=17.4947,
            longitude=78.3996,
            inspection_radius_m=300,
            sanction_amount=1200000,
            released_amount=1000000,
            expenditure=920000,
            physical_progress=85,
            financial_progress=77,
            contractor_id=contractor3.id,
            start_date=_days_ago(100),
            expected_completion_date=_days_ago(-10),
            status=ProjectStatus.COMPLETED,
            created_by=admin.id,
        )

        db.add_all([proj_a, proj_b, proj_c, proj_d, proj_e, proj_f])
        await db.flush()

        # ── Assignments ─────────────────────────────────────────────

        assignments = [
            ProjectInspector(project_id=proj_a.id, inspector_user_id=inspector1.id, assigned_by=admin.id),
            ProjectInspector(project_id=proj_b.id, inspector_user_id=inspector1.id, assigned_by=admin.id),
            ProjectInspector(project_id=proj_c.id, inspector_user_id=inspector1.id, assigned_by=admin.id),
            ProjectInspector(project_id=proj_d.id, inspector_user_id=inspector1.id, assigned_by=admin.id),
            ProjectInspector(project_id=proj_e.id, inspector_user_id=inspector2.id, assigned_by=admin.id),
            ProjectInspector(project_id=proj_f.id, inspector_user_id=inspector3.id, assigned_by=admin.id),
        ]
        db.add_all(assignments)
        await db.flush()

        # ── Risk Scores ─────────────────────────────────────────────

        risk_a = RiskScore(
            project_id=proj_a.id,
            overall_score=87,
            image_risk=91,
            financial_risk=92,
            geospatial_risk=45,
            evidence_risk=78,
            contractor_risk=65,
            is_mock=False,
            explanation=[
                "Physical progress (42%) significantly lower than financial expenditure (91%)",
                "3 evidence images show high similarity to historical submissions",
                "Material cost exceeds district benchmark by 28%",
                "Contractor has 2 other high-risk projects in same district",
            ],
            contributing_factors={
                "progress_expenditure_gap": 49,
                "duplicate_evidence_count": 3,
                "cost_variance_pct": 28,
                "contractor_risk_flag": True,
            },
        )

        risk_b = RiskScore(
            project_id=proj_b.id,
            overall_score=82,
            image_risk=88,
            financial_risk=61,
            geospatial_risk=72,
            evidence_risk=85,
            contractor_risk=65,
            is_mock=False,
            explanation=[
                "94% image similarity detected with evidence from Project MPLADS-KA-2025-0147",
                "Potential evidence reuse detected — requires review",
                "Financial progress 18% ahead of physical progress",
                "Same contractor as high-risk Project A",
            ],
            contributing_factors={
                "max_similarity_score": 94,
                "duplicate_project_code": "MPLADS-KA-2025-0147",
                "progress_gap": 18,
            },
        )

        risk_c = RiskScore(
            project_id=proj_c.id,
            overall_score=76,
            image_risk=55,
            financial_risk=40,
            geospatial_risk=95,
            evidence_risk=82,
            contractor_risk=30,
            is_mock=False,
            explanation=[
                "Evidence captured 2.3 km from project site (geofence: 100m)",
                "GPS accuracy very low (45m) during 2 of 5 evidence captures",
                "Location evidence does not match the configured project geofence",
            ],
            contributing_factors={
                "max_geofence_violation_m": 2300,
                "low_gps_captures": 2,
            },
        )

        risk_d = RiskScore(
            project_id=proj_d.id,
            overall_score=18,
            image_risk=12,
            financial_risk=15,
            geospatial_risk=8,
            evidence_risk=10,
            contractor_risk=20,
            is_mock=False,
            explanation=[
                "All evidence within project geofence",
                "Financial and physical progress aligned",
                "No duplicate evidence detected",
            ],
            contributing_factors={},
        )

        risk_e = RiskScore(
            project_id=proj_e.id,
            overall_score=35,
            image_risk=30,
            financial_risk=25,
            geospatial_risk=20,
            evidence_risk=40,
            contractor_risk=35,
            is_mock=False,
            explanation=[
                "Minor financial progress gap (4%)",
                "Evidence metadata partially unavailable for 1 image",
            ],
            contributing_factors={},
        )

        risk_f = RiskScore(
            project_id=proj_f.id,
            overall_score=12,
            image_risk=10,
            financial_risk=8,
            geospatial_risk=5,
            evidence_risk=15,
            contractor_risk=10,
            is_mock=False,
            explanation=[
                "Project completed successfully",
                "All verifications passed",
            ],
            contributing_factors={},
        )

        db.add_all([risk_a, risk_b, risk_c, risk_d, risk_e, risk_f])
        await db.flush()

        # ── Alerts ──────────────────────────────────────────────────

        alerts = [
            Alert(
                alert_code="ALT-0001",
                project_id=proj_a.id,
                alert_type=AlertType.PROGRESS_MISMATCH,
                severity=AlertSeverity.CRITICAL,
                title="Severe progress–expenditure decoupling detected",
                description="Physical progress 42% against 91% financial expenditure. Gap of 49 percentage points exceeds threshold.",
                evidence_data={"physical": 42, "financial": 91, "gap": 49},
            ),
            Alert(
                alert_code="ALT-0002",
                project_id=proj_a.id,
                alert_type=AlertType.FINANCIAL_ANOMALY,
                severity=AlertSeverity.HIGH,
                title="Material cost exceeds district benchmark",
                description="Reported material cost exceeds benchmark for similar projects in Bengaluru Urban by 28%.",
                evidence_data={"variance_pct": 28},
            ),
            Alert(
                alert_code="ALT-0003",
                project_id=proj_b.id,
                alert_type=AlertType.DUPLICATE_EVIDENCE,
                severity=AlertSeverity.CRITICAL,
                title="Potential evidence reuse detected",
                description="Evidence image shows 94% similarity with evidence from Project MPLADS-KA-2025-0147 submitted 4 months ago.",
                evidence_data={"similarity": 94, "matched_project": "MPLADS-KA-2025-0147"},
            ),
            Alert(
                alert_code="ALT-24KA-003",
                project_id=proj_b.id,
                alert_type=AlertType.DUPLICATE_EVIDENCE,
                severity=AlertSeverity.CRITICAL,
                title="Potential Evidence Reuse — GHPS Shivajinagar School Renovation",
                description="Evidence photo shows 91% perceptual hash similarity with photo submitted for school renovation MPLADS/2023-24/KA/BN-03/0201 in prior financial year. Suspected image recycling.",
                evidence_data={"similarity": 91, "matched_project": "MPLADS/2023-24/KA/BN-03/0201"},
            ),
            Alert(
                alert_code="ALT-24KA-004",
                project_id=proj_c.id,
                alert_type=AlertType.GEOFENCE_VIOLATION,
                severity=AlertSeverity.HIGH,
                title="Geofence Violation — Pipeline Evidence, Domlur Layout",
                description="Evidence photo GPS coordinates (Koramangala area) are 2.7 km outside the declared project site (Domlur Layout). Project geofence radius is 250m. Potential evidence manipulation.",
                evidence_data={"distance_m": 2700, "radius_m": 250, "captured_near": "Koramangala"},
            ),
            Alert(
                alert_code="ALT-24KA-005",
                project_id=proj_c.id,
                alert_type=AlertType.GPS_ACCURACY_LOW,
                severity=AlertSeverity.MEDIUM,
                title="Insufficient GPS Accuracy — Pipeline Inspection, Domlur",
                description="GPS accuracy of 58m recorded during 3 of 7 evidence captures. SATARK minimum requirement for geospatial verification is 20m accuracy.",
                evidence_data={"accuracy_m": 58, "threshold_m": 20, "affected_captures": 3},
            ),
            Alert(
                alert_code="ALT-24KA-006",
                project_id=proj_a.id,
                alert_type=AlertType.CONTRACTOR_ANOMALY,
                severity=AlertSeverity.HIGH,
                title="Contractor Concentration Risk — Sri Lakshmi Constructions",
                description="Sri Lakshmi Constructions awarded 3 MPLADS works in Bengaluru Urban district in FY 2024-25. Two projects show high-risk anomaly signals. Possible bid rigging pattern.",
                evidence_data={"contractor": "Sri Lakshmi Constructions", "active_projects": 3, "high_risk_count": 2},
            ),
        ]
        db.add_all(alerts)

        # ── Project Events (Timeline) ──────────────────────────────

        for proj, days_offset in [
            (proj_a, 195), (proj_b, 130), (proj_c, 165), (proj_d, 155),
            (proj_e, 210), (proj_f, 280),
        ]:
            db.add(ProjectEvent(
                project_id=proj.id,
                event_type="project_created",
                title="Project Sanctioned",
                description=f"Project {proj.project_code} sanctioned and registered in SATARK-MPLADS system. Notional amount: ₹{proj.sanction_amount/100000:.1f} Lakhs.",
                actor_id=admin.id,
                created_at=_days_ago(days_offset),
            ))
            db.add(ProjectEvent(
                project_id=proj.id,
                event_type="inspector_assigned",
                title="Field Inspector Assigned",
                description=f"Field inspector assigned for site verification and evidence collection.",
                actor_id=admin.id,
                created_at=_days_ago(days_offset - 7),
            ))

        # Extra events for high-risk projects
        db.add(ProjectEvent(
            project_id=proj_a.id,
            event_type="risk_score_updated",
            title="Risk Score Elevated to 89/100 — CRITICAL",
            description="Multiple anomaly signals detected: 52-point progress gap, material over-invoicing, and contractor concentration. Escalated for district officer review.",
            created_at=_days_ago(6),
        ))
        db.add(ProjectEvent(
            project_id=proj_a.id,
            event_type="alert_created",
            title="Critical Alert: Progress–Expenditure Mismatch (52 Points)",
            description="Financial expenditure 90% — physical completion only 38%. CC road foundation work reported incomplete despite near-full fund disbursement.",
            created_at=_days_ago(6),
        ))
        db.add(ProjectEvent(
            project_id=proj_b.id,
            event_type="alert_created",
            title="Critical Alert: Evidence Photo Reuse Detected",
            description="AI perceptual hash comparison found 91% similarity with prior-year school project evidence. Inspector directed to re-capture fresh site photos.",
            created_at=_days_ago(4),
        ))
        db.add(ProjectEvent(
            project_id=proj_c.id,
            event_type="alert_created",
            title="High Alert: Geofence Violation — Pipeline Evidence",
            description="Inspector GPS coordinates during evidence capture were 2.7 km from declared pipeline project site. Show-cause notice issued.",
            created_at=_days_ago(8),
        ))
        db.add(ProjectEvent(
            project_id=proj_f.id,
            event_type="project_completed",
            title="Project Verified & Marked Complete",
            description="Solar street lighting installation verified complete. All 75 poles erected, energized and handed over to GHMC. Utilization certificate issued.",
            created_at=_days_ago(15),
        ))

        # ── Expense Bills & Invoices ─────────────────────────────────
        bill_clean = ExpenseBill(
            bill_code="BILL-24MY-0143-001",
            project_id=proj_e.id,
            inspector_user_id=inspector2.id,
            vendor_name="Nanjangud Stone Aggregates & Quarry Works",
            invoice_number="NSA/INV/2025/0876",
            bill_date=_days_ago(35),
            total_amount=412000.0,
            items=[
                {
                    "item_name": "OPC 53 Grade Cement (ACC Suraksha)",
                    "category": "cement",
                    "quantity": 480,
                    "unit": "bags",
                    "claimed_unit_price": 390.0,
                    "total_amount": 187200.0,
                    "benchmark_unit_price": 385.0,
                    "deviation_pct": 1.30,
                    "status": "normal",
                    "notes": "Rate within standard CPWD Schedule of Rates benchmark (₹385/bag). Marginal variation acceptable.",
                },
                {
                    "item_name": "Granite Hard Rock Aggregate 40mm",
                    "category": "aggregate",
                    "quantity": 95,
                    "unit": "cu.m",
                    "claimed_unit_price": 1180.0,
                    "total_amount": 112100.0,
                    "benchmark_unit_price": 1200.0,
                    "deviation_pct": -1.67,
                    "status": "normal",
                    "notes": "Rate slightly below benchmark — favourable for project.",
                },
                {
                    "item_name": "Rubble Stone (Quarry Dressed)",
                    "category": "aggregate",
                    "quantity": 63,
                    "unit": "cu.m",
                    "claimed_unit_price": 1780.0,
                    "total_amount": 112140.0,
                    "benchmark_unit_price": 1750.0,
                    "deviation_pct": 1.71,
                    "status": "normal",
                    "notes": "Rate within acceptable range per MoRTH/CPWD 2024-25 SOR.",
                },
            ],
            overall_deviation_pct=0.68,
            anomaly_score=1.2,
            fraud_risk_level="LOW",
            ai_analysis_summary="✅ CLEAN PROCUREMENT (Score: 1.2/100): All 3 line items are within CPWD 2024-25 Schedule of Rates for Mysuru district. No significant deviation detected. Procurement appears genuine.",
            status=ExpenseBillStatus.VERIFIED,
        )

        bill_fraud = ExpenseBill(
            bill_code="BILL-24KA-0478-001",
            project_id=proj_a.id,
            inspector_user_id=inspector1.id,
            vendor_name="Sri Balaji Steel Traders & Suppliers, Peenya",
            invoice_number="SBST/INV/2025/2281",
            bill_date=_days_ago(14),
            total_amount=1148000.0,
            items=[
                {
                    "item_name": "TMT Bar Fe500D (SAIL-JSW Brand)",
                    "category": "steel_tmt",
                    "quantity": 6000,
                    "unit": "kg",
                    "claimed_unit_price": 112.0,
                    "total_amount": 672000.0,
                    "benchmark_unit_price": 63.0,
                    "deviation_pct": 77.78,
                    "status": "fraud_risk",
                    "notes": "🚨 Critical Price Anomaly: 77.8% over CPWD market benchmark (₹63/kg). Possible fictitious invoice or collusion with supplier.",
                },
                {
                    "item_name": "OPC 53 Grade Cement (Bulk)",
                    "category": "cement",
                    "quantity": 560,
                    "unit": "bags",
                    "claimed_unit_price": 618.0,
                    "total_amount": 346080.0,
                    "benchmark_unit_price": 385.0,
                    "deviation_pct": 60.52,
                    "status": "fraud_risk",
                    "notes": "🚨 Critical Price Anomaly: 60.5% inflation over CPWD SOR benchmark (₹385/bag). Reported rate exceeds state MRP guidelines.",
                },
                {
                    "item_name": "Kiln Burnt Second Class Bricks",
                    "category": "bricks",
                    "quantity": 11000,
                    "unit": "pieces",
                    "claimed_unit_price": 11.8,
                    "total_amount": 129920.0,
                    "benchmark_unit_price": 8.50,
                    "deviation_pct": 38.82,
                    "status": "severe_inflation",
                    "notes": "⚠️ Severe price inflation: 38.8% above standard rate (₹8.50/piece). Flagged for site-level material audit.",
                },
            ],
            overall_deviation_pct=66.85,
            anomaly_score=91.2,
            fraud_risk_level="CRITICAL",
            ai_analysis_summary="🚨 CRITICAL FINANCIAL FRAUD RISK (Score: 91.2/100): All 3 line items severely exceed CPWD 2024-25 SOR benchmarks with 66.9% average price inflation. TMT steel at ₹112/kg (benchmark ₹63/kg) is the highest risk item. Pattern consistent with fictitious billing or kickback scheme. Immediate audit recommended.",
            status=ExpenseBillStatus.FLAGGED,
        )

        db.add_all([bill_clean, bill_fraud])

        await db.commit()
        print("[OK] Database seeded successfully with demo data.")
        print("  Accounts:")
        print("    Admin:     admin@satark.gov.in / admin123")
        print("    Inspector: inspector1@satark.gov.in / inspector123  (INS-0042)")
        print("    Inspector: inspector2@satark.gov.in / inspector123  (INS-0078)")
        print("    Inspector: inspector3@satark.gov.in / inspector123  (INS-0105)")
        print("    Officer:   officer@satark.gov.in / officer123")
        print("    Auditor:   auditor@satark.gov.in / auditor123")


if __name__ == "__main__":
    asyncio.run(seed())
