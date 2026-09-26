from collections.abc import Generator

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  # registers all tables on SQLModel.metadata


@pytest.fixture
def session() -> Generator[Session, None, None]:
    """A fresh in-memory SQLite database per test, isolated from the dev database."""
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
