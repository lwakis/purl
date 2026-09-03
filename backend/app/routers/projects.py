"""CRUD API endpoints for projects and project versions."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Project, ProjectVersion, get_db
from app.models import (
    PaginatedProjects,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    ProjectVersionCreate,
    ProjectVersionResponse,
)
from app.utils import generate_session_id

router = APIRouter(prefix='/api/projects', tags=['projects'])


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _get_project_or_404(db: AsyncSession, project_id: int) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail='Project not found')
    return project


def _project_to_response(p: Project) -> ProjectResponse:
    return ProjectResponse(
        id=p.id,
        name=p.name,
        prompt=p.prompt,
        current_code=p.current_code,
        theme=p.theme or 'auto',
        style=p.style or 'minimal',
        session_id=p.session_id,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


def _version_to_response(v: ProjectVersion) -> ProjectVersionResponse:
    return ProjectVersionResponse(
        id=v.id,
        project_id=v.project_id,
        version_num=v.version_num,
        code=v.code,
        message=v.message,
        created_at=v.created_at,
    )


# ── Projects ─────────────────────────────────────────────────────────────────


DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 100


@router.get('', response_model=PaginatedProjects)
@router.get('/', response_model=PaginatedProjects)
async def list_projects(
    session_id: str | None = Query(None),
    q: str | None = Query(None, description='Case-insensitive name/prompt search'),
    page: int = Query(1, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """List projects, optionally filtered by session_id and search query, paginated."""
    # Build a single filtered query shared by the count and the page slice.
    base = select(Project)
    if session_id is not None:
        base = base.where(Project.session_id == session_id)
    if q:
        pattern = f'%{q.strip()}%'
        base = base.where(
            func.lower(Project.name).like(pattern)
            | func.lower(Project.prompt).like(pattern)
        )

    total = await db.scalar(select(func.count()).select_from(base.subquery()))

    stmt = base.order_by(Project.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    projects = result.scalars().all()

    return PaginatedProjects(
        items=[_project_to_response(p) for p in projects],
        total=total or 0,
        page=page,
        page_size=page_size,
    )


@router.post('', response_model=ProjectResponse, status_code=201)
@router.post('/', response_model=ProjectResponse, status_code=201)
async def create_project(
    req: ProjectCreate,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Create a new project."""
    project = Project(
        name=req.name or 'Untitled',
        prompt=req.prompt,
        current_code=req.current_code,
        session_id=req.session_id or generate_session_id(),
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return _project_to_response(project)


@router.get('/{project_id}', response_model=ProjectResponse)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Get a single project by ID."""
    project = await _get_project_or_404(db, project_id)
    return _project_to_response(project)


@router.put('/{project_id}', response_model=ProjectResponse)
async def update_project(
    project_id: int,
    req: ProjectUpdate,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Update project metadata and/or code."""
    project = await _get_project_or_404(db, project_id)
    if req.name is not None:
        project.name = req.name
    if req.prompt is not None:
        project.prompt = req.prompt
    if req.current_code is not None:
        project.current_code = req.current_code
    if req.theme is not None:
        project.theme = req.theme
    if req.style is not None:
        project.style = req.style
    await db.flush()
    await db.refresh(project)
    return _project_to_response(project)


@router.delete('/{project_id}', status_code=204)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Delete a project and all its versions."""
    project = await _get_project_or_404(db, project_id)
    await db.delete(project)
    await db.flush()
    return None


# ── Versions ─────────────────────────────────────────────────────────────────


@router.get('/{project_id}/versions', response_model=list[ProjectVersionResponse])
async def list_versions(
    project_id: int,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """List all versions for a project, newest first."""
    # Verify project exists
    await _get_project_or_404(db, project_id)
    stmt = (
        select(ProjectVersion)
        .where(ProjectVersion.project_id == project_id)
        .order_by(ProjectVersion.version_num.desc())
    )
    result = await db.execute(stmt)
    versions = result.scalars().all()
    return [_version_to_response(v) for v in versions]


@router.post('/{project_id}/versions', response_model=ProjectVersionResponse, status_code=201)
async def save_version(
    project_id: int,
    req: ProjectVersionCreate,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Save a new version of a project."""
    await _get_project_or_404(db, project_id)

    # Determine next version number
    stmt = select(func.max(ProjectVersion.version_num)).where(
        ProjectVersion.project_id == project_id
    )
    result = await db.execute(stmt)
    max_ver = result.scalar() or 0

    version = ProjectVersion(
        project_id=project_id,
        version_num=max_ver + 1,
        code=req.code,
        message=req.message,
    )
    db.add(version)
    await db.flush()
    await db.refresh(version)
    return _version_to_response(version)


@router.get('/{project_id}/versions/{version_id}', response_model=ProjectVersionResponse)
async def get_version(
    project_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Get a specific version by ID."""
    stmt = select(ProjectVersion).where(
        ProjectVersion.id == version_id,
        ProjectVersion.project_id == project_id,
    )
    result = await db.execute(stmt)
    version = result.scalar_one_or_none()
    if version is None:
        raise HTTPException(status_code=404, detail='Version not found')
    return _version_to_response(version)
