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


# ── User ─────────────────────────────────────────────────────────────────────


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=True)
    name = Column(String(255), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    auth_provider = Column(String(50), nullable=True)  # "email" | "google" | "anon"
    password_hash = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    projects = relationship('Project', back_populates='user')

    def __repr__(self) -> str:
        return f'<User id={self.id} email={self.email!r}>'


# ── Project ──────────────────────────────────────────────────────────────────


class Project(Base):
    __tablename__ = 'projects'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), default='Untitled')
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    session_id = Column(String(50), nullable=True, index=True)
    prompt = Column(Text, nullable=True)
    current_code = Column(Text, nullable=True)
    theme = Column(String(20), default='auto')
    style = Column(String(20), default='minimal')
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    user = relationship('User', back_populates='projects')
    versions = relationship(
        'ProjectVersion', back_populates='project', cascade='all, delete-orphan'
    )
    share_links = relationship('ShareLink', back_populates='project', cascade='all, delete-orphan')

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


# ── ShareLink ────────────────────────────────────────────────────────────────


class ShareLink(Base):
    __tablename__ = 'share_links'

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False)
    short_code = Column(String(20), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    project = relationship('Project', back_populates='share_links')

    def __repr__(self) -> str:
        return f'<ShareLink code={self.short_code!r}>'


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
