"""API endpoints for sharing projects via short links."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Project, ShareLink, get_db
from app.models import ShareCreateRequest, ShareCreateResponse, ShareGetResponse
from app.utils import generate_short_code

router = APIRouter(prefix='/api/share', tags=['share'])


@router.post('', response_model=ShareCreateResponse, status_code=201)
@router.post('/', response_model=ShareCreateResponse, status_code=201)
async def create_share_link(
    req: ShareCreateRequest,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Create a share link for a project.

    Returns a short code and a full URL.
    The share endpoint is public (no auth required to view).
    """
    # Verify project exists
    result = await db.execute(select(Project).where(Project.id == req.project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail='Project not found')

    # Generate unique short code
    short_code = generate_short_code()

    share = ShareLink(project_id=req.project_id, short_code=short_code)
    db.add(share)
    await db.flush()

    return ShareCreateResponse(
        short_code=short_code,
        url=f'/api/share/{short_code}',
    )


@router.get('/{code}', response_model=ShareGetResponse)
async def get_shared_project(
    code: str,
    db: AsyncSession = Depends(get_db),  # noqa: B008
):
    """Get a shared project by its short code.

    This endpoint is intentionally public — no authentication required.
    """
    result = await db.execute(select(ShareLink).where(ShareLink.short_code == code))
    share = result.scalar_one_or_none()
    if share is None:
        raise HTTPException(status_code=404, detail='Share link not found or expired')

    # Fetch the project
    proj_result = await db.execute(select(Project).where(Project.id == share.project_id))
    project = proj_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail='Shared project not found')

    return ShareGetResponse(
        name=project.name,
        code=project.current_code,
        prompt=project.prompt,
    )
