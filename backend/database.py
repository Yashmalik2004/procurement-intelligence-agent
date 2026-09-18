from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from .config import settings


engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    """Create all tables (database-agnostic) and stamp the migration log."""
    # Import models so their metadata is registered before create_all
    from . import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Stamp migration log (idempotent)
    from sqlalchemy import select, text
    from .models import MigrationLog
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(MigrationLog).where(MigrationLog.version == "001"))
        if not result.scalar_one_or_none():
            db.add(MigrationLog(
                version="001",
                description="Initial schema: all core tables",
                executed_by="system",
            ))
            await db.commit()

    # ── Migration 002: add score_id + category to supplier_scores ────────────
    # create_all does not ALTER existing tables, so we handle new columns with
    # raw DDL. ALTER TABLE ADD COLUMN is a no-op if the column already exists
    # in SQLite — we simply swallow the "duplicate column" error.
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(MigrationLog).where(MigrationLog.version == "002"))
        if not result.scalar_one_or_none():
            for stmt in [
                "ALTER TABLE supplier_scores ADD COLUMN score_id TEXT",
                "ALTER TABLE supplier_scores ADD COLUMN category TEXT",
            ]:
                try:
                    await db.execute(text(stmt))
                except Exception:
                    pass  # column already exists on a fresh DB created by create_all
            await db.commit()
            db.add(MigrationLog(
                version="002",
                description="supplier_scores: add score_id (job correlation key) and category columns",
                executed_by="system",
            ))
            await db.commit()
