"""Pydantic schemas for projects."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.enums import ProjectStatus, ProjectType


class ProjectCreate(BaseModel):
    project_code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    project_type: ProjectType

    state: str = Field(..., min_length=1)
    district: str = Field(..., min_length=1)
    constituency: str | None = None
    village_locality: str | None = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    inspection_radius_m: int = Field(default=100, ge=10, le=5000)

    sanction_amount: float = Field(..., gt=0)
    released_amount: float = 0
    expenditure: float = 0
    physical_progress: float = Field(default=0, ge=0, le=100)
    financial_progress: float = Field(default=0, ge=0, le=100)

    contractor_id: str | None = None
    start_date: datetime | None = None
    expected_completion_date: datetime | None = None
    status: ProjectStatus = ProjectStatus.DRAFT

    # Optional: assign inspector during creation
    inspector_user_id: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    project_type: ProjectType | None = None
    state: str | None = None
    district: str | None = None
    constituency: str | None = None
    village_locality: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    inspection_radius_m: int | None = Field(default=None, ge=10, le=5000)
    sanction_amount: float | None = Field(default=None, gt=0)
    released_amount: float | None = None
    expenditure: float | None = None
    physical_progress: float | None = Field(default=None, ge=0, le=100)
    financial_progress: float | None = Field(default=None, ge=0, le=100)
    contractor_id: str | None = None
    start_date: datetime | None = None
    expected_completion_date: datetime | None = None
    status: ProjectStatus | None = None


class ProjectResponse(BaseModel):
    id: str
    project_code: str
    name: str
    description: str | None = None
    project_type: str
    state: str
    district: str
    constituency: str | None = None
    village_locality: str | None = None
    latitude: float
    longitude: float
    inspection_radius_m: int
    sanction_amount: float
    released_amount: float
    expenditure: float
    physical_progress: float
    financial_progress: float
    contractor_id: str | None = None
    contractor_name: str | None = None
    start_date: str | None = None
    expected_completion_date: str | None = None
    status: str
    created_at: str
    updated_at: str
    current_inspector: str | None = None
    current_inspector_name: str | None = None
    latest_risk_score: float | None = None
    last_inspection_date: str | None = None
    peer_acceptance_required: bool = False
    peer_acceptance_status: str | None = None

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int
    page: int
    page_size: int
