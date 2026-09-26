from collections.abc import Generator
from dataclasses import dataclass
from datetime import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import app.models  # noqa: F401  # registers all tables on SQLModel.metadata
from app.core.db import get_session
from app.core.security import hash_password
from app.main import app as fastapi_app
from app.models.department import Department
from app.models.enums import DepartmentKind, ProviderKind, UserRole, VisitSource, VisitStatus
from app.models.patient import Patient
from app.models.provider import Provider
from app.models.service import Service
from app.models.user import User
from app.models.visit import Visit

TEST_PASSWORD = "Test@Password123"


@pytest.fixture
def session() -> Generator[Session, None, None]:
    """A fresh in-memory SQLite database per test, isolated from the dev database."""
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(session: Session) -> Generator[TestClient, None, None]:
    """A TestClient wired to the `session` fixture's in-memory database instead of
    the real dev database, via FastAPI's dependency_overrides. No `with` block, so
    the app's lifespan (which would touch the real DB file) never runs."""
    fastapi_app.dependency_overrides[get_session] = lambda: session
    yield TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()


@dataclass
class AuthFixture:
    admin: User
    receptionist: User
    provider_user: User
    other_provider_user: User
    patient_user: User
    other_patient_user: User
    inactive_user: User
    provider: Provider
    other_provider: Provider
    patient: Patient
    visit: Visit  # belongs to `provider` and `patient`


@pytest.fixture
def auth_fixture(session: Session) -> AuthFixture:
    dept = Department(code="GM", name="General Medicine", kind=DepartmentKind.CLINIC)
    session.add(dept)
    session.commit()
    session.refresh(dept)

    shift = {"shift_start": time(9, 0), "shift_end": time(17, 0), "slot_length_min": 15}
    provider = Provider(
        department_id=dept.id, name="Dr. A", kind=ProviderKind.DOCTOR, room_label="GM-1", **shift
    )
    other_provider = Provider(
        department_id=dept.id, name="Dr. B", kind=ProviderKind.DOCTOR, room_label="GM-2", **shift
    )
    service = Service(department_id=dept.id, name="Consultation", default_duration_min=15)
    patient = Patient(full_name="Test Patient", phone="9700000000")
    other_patient = Patient(full_name="Other Patient", phone="9700000001")
    session.add_all([provider, other_provider, service, patient, other_patient])
    session.commit()
    for row in (provider, other_provider, service, patient, other_patient):
        session.refresh(row)

    visit = Visit(
        patient_id=patient.id,
        provider_id=provider.id,
        service_id=service.id,
        source=VisitSource.APPOINTMENT,
        token_no="GM-A001",
        status=VisitStatus.BOOKED,
    )
    session.add(visit)
    session.commit()
    session.refresh(visit)

    password_hash = hash_password(TEST_PASSWORD)
    users = {
        "admin": User(username="test_admin", password_hash=password_hash, role=UserRole.ADMIN),
        "receptionist": User(
            username="test_receptionist", password_hash=password_hash, role=UserRole.RECEPTIONIST
        ),
        "provider_user": User(
            username="test_provider",
            password_hash=password_hash,
            role=UserRole.PROVIDER,
            provider_id=provider.id,
        ),
        "other_provider_user": User(
            username="test_other_provider",
            password_hash=password_hash,
            role=UserRole.PROVIDER,
            provider_id=other_provider.id,
        ),
        "patient_user": User(
            username="test_patient",
            password_hash=password_hash,
            role=UserRole.PATIENT,
            patient_id=patient.id,
        ),
        "other_patient_user": User(
            username="test_other_patient",
            password_hash=password_hash,
            role=UserRole.PATIENT,
            patient_id=other_patient.id,
        ),
        "inactive_user": User(
            username="test_inactive",
            password_hash=password_hash,
            role=UserRole.RECEPTIONIST,
            is_active=False,
        ),
    }
    session.add_all(users.values())
    session.commit()
    for user in users.values():
        session.refresh(user)

    return AuthFixture(
        admin=users["admin"],
        receptionist=users["receptionist"],
        provider_user=users["provider_user"],
        other_provider_user=users["other_provider_user"],
        patient_user=users["patient_user"],
        other_patient_user=users["other_patient_user"],
        inactive_user=users["inactive_user"],
        provider=provider,
        other_provider=other_provider,
        patient=patient,
        visit=visit,
    )
