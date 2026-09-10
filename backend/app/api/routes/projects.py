"""Project CRUD routes with role-based access control."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_admin, verify_inspector_project_access
from app.core.database import get_db
from app.models.enums import AssignmentStatus, ProjectStatus, UserRole
from app.models.models import (
    Alert,
    Contractor,
    Inspection,
    Project,
    ProjectEvent,
    ProjectInspector,
    RiskScore,
    User,
)
from app.schemas.project import ProjectCreate, ProjectListResponse, ProjectResponse, ProjectUpdate
from app.services.audit import log_audit

router = APIRouter(prefix="/api/projects", tags=["projects"])


async def _build_project_response(project: Project, db: AsyncSession) -> ProjectResponse:
    """Build a full ProjectResponse with joined data."""
    # Current inspector
    active_assignment = await db.execute(
        select(ProjectInspector)
        .where(
            ProjectInspector.project_id == project.id,
            ProjectInspector.status == AssignmentStatus.ACTIVE,
        )
        .options(selectinload(ProjectInspector.inspector))
    )
    assignment = active_assignment.scalar_one_or_none()
    inspector_id_str = None
    inspector_name = None
    if assignment:
        inspector_id_str = assignment.inspector.inspector_id
        inspector_name = assignment.inspector.full_name

    # Contractor name
    contractor_name = None
    if project.contractor_id:
        c_result = await db.execute(select(Contractor).where(Contractor.id == project.contractor_id))
        contractor = c_result.scalar_one_or_none()
        contractor_name = contractor.name if contractor else None

    # Latest risk score
    rs_result = await db.execute(
        select(RiskScore)
        .where(RiskScore.project_id == project.id)
        .order_by(RiskScore.calculated_at.desc())
        .limit(1)
    )
    risk = rs_result.scalar_one_or_none()

    # Last inspection
    insp_result = await db.execute(
        select(Inspection)
        .where(Inspection.project_id == project.id)
        .order_by(Inspection.started_at.desc())
        .limit(1)
    )
    last_insp = insp_result.scalar_one_or_none()

    return ProjectResponse(
        id=str(project.id),
        project_code=project.project_code,
        name=project.name,
        description=project.description,
        project_type=project.project_type.value,
        state=project.state,
        district=project.district,
        constituency=project.constituency,
        village_locality=project.village_locality,
        latitude=project.latitude,
        longitude=project.longitude,
        inspection_radius_m=project.inspection_radius_m,
        sanction_amount=float(project.sanction_amount),
        released_amount=float(project.released_amount or 0),
        expenditure=float(project.expenditure or 0),
        physical_progress=project.physical_progress,
        financial_progress=project.financial_progress,
        contractor_id=str(project.contractor_id) if project.contractor_id else None,
        contractor_name=contractor_name,
        start_date=project.start_date.isoformat() if project.start_date else None,
        expected_completion_date=project.expected_completion_date.isoformat() if project.expected_completion_date else None,
        status=project.status.value,
        created_at=project.created_at.isoformat(),
        updated_at=project.updated_at.isoformat(),
        current_inspector=inspector_id_str,
        current_inspector_name=inspector_name,
        latest_risk_score=risk.overall_score if risk else None,
        last_inspection_date=last_insp.started_at.isoformat() if last_insp else None,
        peer_acceptance_required=bool(getattr(project, "peer_acceptance_required", False)),
        peer_acceptance_status=getattr(project, "peer_acceptance_status", None),
    )


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    district: str | None = None,
    status_filter: ProjectStatus | None = Query(None, alias="status"),
    search: str | None = None,
):
    """
    List projects:
    - ADMIN: all projects
    - INSPECTOR: only assigned projects
    - OFFICER: projects in their jurisdiction
    - AUDITOR: all projects (read-only)
    """
    base_query = select(Project).where(Project.is_deleted == False)

    # INSPECTOR: strict filter to assigned projects only
    if current_user.role == UserRole.FIELD_INSPECTOR:
        assigned_ids = select(ProjectInspector.project_id).where(
            ProjectInspector.inspector_user_id == current_user.id,
            ProjectInspector.status == AssignmentStatus.ACTIVE,
        )
        base_query = base_query.where(Project.id.in_(assigned_ids))

    # OFFICER: filter by jurisdiction
    elif current_user.role == UserRole.DISTRICT_OFFICER:
        if current_user.district:
            base_query = base_query.where(Project.district == current_user.district)
        if current_user.state:
            base_query = base_query.where(Project.state == current_user.state)

    # Filters
    if district:
        base_query = base_query.where(Project.district == district)
    if status_filter:
        base_query = base_query.where(Project.status == status_filter)
    if search:
        base_query = base_query.where(
            Project.name.ilike(f"%{search}%") | Project.project_code.ilike(f"%{search}%")
        )

    # Count
    count_q = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    # Paginate
    query = base_query.order_by(Project.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    projects = result.scalars().all()

    items = [await _build_project_response(p, db) for p in projects]
    return ProjectListResponse(projects=items, total=total, page=page, page_size=page_size)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.is_deleted == False))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Server-side authorization for inspectors
    await verify_inspector_project_access(project_id, current_user, db)

    return await _build_project_response(project, db)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    # Check unique project_code
    existing = await db.execute(select(Project).where(Project.project_code == body.project_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Project code already exists")

    project = Project(
        project_code=body.project_code,
        name=body.name,
        description=body.description,
        project_type=body.project_type,
        state=body.state,
        district=body.district,
        constituency=body.constituency,
        village_locality=body.village_locality,
        latitude=body.latitude,
        longitude=body.longitude,
        inspection_radius_m=body.inspection_radius_m,
        sanction_amount=body.sanction_amount,
        released_amount=body.released_amount,
        expenditure=body.expenditure,
        physical_progress=body.physical_progress,
        financial_progress=body.financial_progress,
        contractor_id=body.contractor_id,
        start_date=body.start_date,
        expected_completion_date=body.expected_completion_date,
        status=body.status,
        created_by=admin.id,
    )
    db.add(project)
    await db.flush()

    # Project event
    event = ProjectEvent(
        project_id=project.id,
        event_type="project_created",
        title="Project Created",
        description=f"Project {project.project_code} created by {admin.full_name}",
        actor_id=admin.id,
    )
    db.add(event)

    # Optional: assign inspector during creation
    if body.inspector_user_id:
        inspector_result = await db.execute(
            select(User).where(User.id == body.inspector_user_id, User.role == UserRole.FIELD_INSPECTOR)
        )
        inspector = inspector_result.scalar_one_or_none()
        if inspector:
            assignment = ProjectInspector(
                project_id=project.id,
                inspector_user_id=inspector.id,
                assigned_by=admin.id,
            )
            db.add(assignment)
            project.status = ProjectStatus.INSPECTOR_ASSIGNED

            db.add(ProjectEvent(
                project_id=project.id,
                event_type="inspector_assigned",
                title="Inspector Assigned",
                description=f"Inspector {inspector.inspector_id} ({inspector.full_name}) assigned",
                actor_id=admin.id,
            ))

    await log_audit(
        db, actor=admin, action="create_project",
        entity_type="project", entity_id=str(project.id),
        new_value={"project_code": project.project_code, "name": project.name},
    )

    return await _build_project_response(project, db)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.is_deleted == False))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    updates = body.model_dump(exclude_unset=True)
    prev_status = project.status.value if project.status else None

    for field, value in updates.items():
        setattr(project, field, value)

    # Track status change
    if "status" in updates and updates["status"] != prev_status:
        db.add(ProjectEvent(
            project_id=project.id,
            event_type="status_changed",
            title="Status Changed",
            description=f"Status changed from {prev_status} to {updates['status']}",
            actor_id=admin.id,
            metadata_={"previous": prev_status, "new": updates["status"]},
        ))

    await log_audit(
        db, actor=admin, action="update_project",
        entity_type="project", entity_id=str(project.id),
        new_value=updates,
    )

    return await _build_project_response(project, db)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.is_deleted = True

    await log_audit(
        db, actor=admin, action="delete_project",
        entity_type="project", entity_id=str(project.id),
    )


@router.post("/{project_id}/request-completion", response_model=ProjectResponse)
async def request_project_completion(
    project_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Inspector marks project as ready for completion.
    Moves status to COMPLETION_REQUESTED, requires District Officer approval.
    """
    # Verify inspector access
    await verify_inspector_project_access(project_id, current_user, db)

    result = await db.execute(select(Project).where(Project.id == project_id, Project.is_deleted == False))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Only inspectors can request completion
    if current_user.role != UserRole.FIELD_INSPECTOR:
        raise HTTPException(status_code=403, detail="Only field inspectors can request project completion")

    # Check if inspector is assigned to this project
    assignment = await db.execute(
        select(ProjectInspector).where(
            ProjectInspector.project_id == project_id,
            ProjectInspector.inspector_user_id == current_user.id,
            ProjectInspector.status == AssignmentStatus.ACTIVE,
        )
    )
    if not assignment.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="You are not assigned to this project")

    # Enforce: Check if any evidence requires peer acceptance and has not been approved
    from app.models.models import EvidenceAnalysis, Evidence
    peer_check = await db.execute(
        select(Evidence, EvidenceAnalysis)
        .join(EvidenceAnalysis, Evidence.id == EvidenceAnalysis.evidence_id)
        .where(
            Evidence.project_id == project.id,
            EvidenceAnalysis.requires_peer_acceptance == True,
            (EvidenceAnalysis.peer_accepted == None) | (EvidenceAnalysis.peer_accepted == False)
        )
    )
    unaccepted_item = peer_check.first()
    if unaccepted_item:
        ev, an = unaccepted_item
        cat = an.detected_category or "selfie / non-work photo"
        raise HTTPException(
            status_code=400,
            detail=f"Cannot mark project as completed: Evidence '{ev.evidence_code}' was flagged by AI as {cat} instead of project work. It requires acceptance from another field inspector before completion can proceed."
        )

    prev_status = project.status.value
    project.status = ProjectStatus.COMPLETION_REQUESTED

    # Log event
    db.add(ProjectEvent(
        project_id=project.id,
        event_type="completion_requested",
        title="Completion Requested by Inspector",
        description=f"{current_user.full_name} ({current_user.inspector_id}) marked project as ready for completion",
        actor_id=current_user.id,
        metadata_={"previous_status": prev_status, "requested_by": current_user.inspector_id},
    ))

    await log_audit(
        db, actor=current_user, action="request_completion",
        entity_type="project", entity_id=str(project.id),
        previous_value={"status": prev_status},
        new_value={"status": ProjectStatus.COMPLETION_REQUESTED.value},
    )

    return await _build_project_response(project, db)


@router.post("/{project_id}/approve-completion", response_model=ProjectResponse)
async def approve_project_completion(
    project_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    District Officer or Admin approves completion request.
    Moves status to COMPLETED.
    """
    result = await db.execute(select(Project).where(Project.id == project_id, Project.is_deleted == False))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Only district officer or admin can approve
    if current_user.role not in (UserRole.DISTRICT_OFFICER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only district officers or admins can approve completion")

    # District officer can only approve projects in their district
    if current_user.role == UserRole.DISTRICT_OFFICER and project.district != current_user.district:
        raise HTTPException(status_code=403, detail="You can only approve projects in your district")

    if project.status != ProjectStatus.COMPLETION_REQUESTED:
        raise HTTPException(status_code=400, detail="Project is not in completion requested status")

    prev_status = project.status.value
    project.status = ProjectStatus.COMPLETED

    # Update assignment status
    assignment = await db.execute(
        select(ProjectInspector).where(
            ProjectInspector.project_id == project_id,
            ProjectInspector.status == AssignmentStatus.ACTIVE,
        )
    )
    active_assignment = assignment.scalar_one_or_none()
    if active_assignment:
        active_assignment.status = AssignmentStatus.COMPLETED

    # Log event
    db.add(ProjectEvent(
        project_id=project.id,
        event_type="completion_approved",
        title="Completion Approved",
        description=f"Completion approved by {current_user.full_name} ({current_user.role.value})",
        actor_id=current_user.id,
        metadata_={"previous_status": prev_status, "approved_by": current_user.role.value},
    ))

    await log_audit(
        db, actor=current_user, action="approve_completion",
        entity_type="project", entity_id=str(project.id),
        previous_value={"status": prev_status},
        new_value={"status": ProjectStatus.COMPLETED.value},
    )

    return await _build_project_response(project, db)


@router.post("/{project_id}/reject-completion", response_model=ProjectResponse)
async def reject_project_completion(
    project_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    District Officer or Admin rejects completion request.
    Returns project to UNDER_REVIEW status.
    """
    result = await db.execute(select(Project).where(Project.id == project_id, Project.is_deleted == False))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Only district officer or admin can reject
    if current_user.role not in (UserRole.DISTRICT_OFFICER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Only district officers or admins can reject completion")

    # District officer can only reject projects in their district
    if current_user.role == UserRole.DISTRICT_OFFICER and project.district != current_user.district:
        raise HTTPException(status_code=403, detail="You can only reject projects in your district")

    if project.status != ProjectStatus.COMPLETION_REQUESTED:
        raise HTTPException(status_code=400, detail="Project is not in completion requested status")

    prev_status = project.status.value
    project.status = ProjectStatus.UNDER_REVIEW

    # Log event
    db.add(ProjectEvent(
        project_id=project.id,
        event_type="completion_rejected",
        title="Completion Request Rejected",
        description=f"Completion rejected by {current_user.full_name} ({current_user.role.value})",
        actor_id=current_user.id,
        metadata_={"previous_status": prev_status, "rejected_by": current_user.role.value},
    ))

    await log_audit(
        db, actor=current_user, action="reject_completion",
        entity_type="project", entity_id=str(project.id),
        previous_value={"status": prev_status},
        new_value={"status": ProjectStatus.UNDER_REVIEW.value},
    )

    return await _build_project_response(project, db)
