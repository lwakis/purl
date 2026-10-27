"""Async SQLAlchemy engine, session, and ORM models."""

import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, inspect, text
from sqlalchemy.engine import Connection
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
    """Create all tables on startup, then apply lightweight schema migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # create_all never alters an existing table, so additive columns such as
        # ``projects.preset`` need an explicit, inspector-based migration.
        await conn.run_sync(migrate_projects_table)


def migrate_projects_table(sync_conn: Connection) -> None:
    """Add post-initial columns to ``projects`` on already-existing databases.

    Dialect-safe: relies on SQLAlchemy's inspector rather than SQLite PRAGMA.
    No-op when the table is missing (fresh DB handled by ``create_all``) or the
    column already exists.
    """
    inspector = inspect(sync_conn)
    if 'projects' not in inspector.get_table_names():
        return
    columns = {column['name'] for column in inspector.get_columns('projects')}
    if 'preset' not in columns:
        sync_conn.execute(text('ALTER TABLE projects ADD COLUMN preset VARCHAR(32)'))


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
    preset = Column(String(32), nullable=True)
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


# ── CacheEntry ───────────────────────────────────────────────────────────────


class CacheEntry(Base):
    """Persistent generated-HTML cache row.

    ``expires_at`` / ``created_at`` are epoch seconds (floats) so TTL math stays
    simple and free of timezone pitfalls across SQLite and Python.
    """

    __tablename__ = 'cache_entries'

    key = Column(String(128), primary_key=True)
    value = Column(Text, nullable=False)
    expires_at = Column(Float, nullable=False, index=True)
    created_at = Column(Float, nullable=False)

    def __repr__(self) -> str:
        return f'<CacheEntry key={self.key!r} expires_at={self.expires_at}>'
