"""Async SQLAlchemy engine, session, and ORM models."""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, relationship

from app.config import settings

# ── Engine & Session ─────────────────────────────────────────────────────────

engine = create_async_engine(settings.database_url, echo=False)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession]:  # type: ignore[misc]
    """FastAPI dependency yielding an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ── Base ─────────────────────────────────────────────────────────────────────


class Base(DeclarativeBase):
    pass


# ── Helpers ──────────────────────────────────────────────────────────────────


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _uuid() -> str:
    return uuid.uuid4().hex[:12]


# ── Project ──────────────────────────────────────────────────────────────────


class Project(Base):
    __tablename__ = 'projects'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), default='Untitled')
    session_id = Column(String(50), nullable=True, index=True)
    prompt = Column(Text, nullable=True)
    current_code = Column(Text, nullable=True)
    theme = Column(String(20), default='auto')
    style = Column(String(20), default='minimal')
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    versions = relationship(
        'ProjectVersion', back_populates='project', cascade='all, delete-orphan'
    )

    def __repr__(self) -> str:
        return f'<Project id={self.id} name={self.name!r}>'


# ── ProjectVersion ───────────────────────────────────────────────────────────


class ProjectVersion(Base):
    __tablename__ = 'project_versions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    version_num = Column(Integer, nullable=False)
    code = Column(Text, nullable=True)
    message = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    project = relationship('Project', back_populates='versions')

    def __repr__(self) -> str:
        return f'<ProjectVersion id={self.id} project={self.project_id} v{self.version_num}>'


# ── PromptTemplate ───────────────────────────────────────────────────────────


class PromptTemplate(Base):
    __tablename__ = 'prompt_templates'

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    prompt_text = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)
    icon = Column(String(50), nullable=True)
    sort_order = Column(Integer, default=0)

    def __repr__(self) -> str:
        return f'<PromptTemplate id={self.id} title={self.title!r}>'
