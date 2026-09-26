from datetime import UTC, datetime, time

import pytest
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.models.department import Department
from app.models.enums import DepartmentKind, ProviderKind, UserRole, VisitSource, VisitStatus
from app.models.patient import Patient
from app.models.provider import Provider
from app.models.service import Service
from app.models.slot import Slot
from app.models.user import User
from app.models.visit import Visit


def _base_catalog(session: Session) -> tuple[Department, Provider, Service, Patient]:
    dept = Department(code="GM", name="General Medicine", kind=DepartmentKind.CLINIC)
    session.add(dept)
    session.commit()
    session.refresh(dept)

    provider = Provider(
        department_id=dept.id,
        name="Dr. Test",
        kind=ProviderKind.DOCTOR,
        room_label="GM-1",
        shift_start=time(9, 0),
        shift_end=time(17, 0),
        slot_length_min=15,
    )
    service = Service(department_id=dept.id, name="Consultation", default_duration_min=15)
    patient = Patient(full_name="Test Patient", phone="9700000000")
    session.add_all([provider, service, patient])
    session.commit()
    session.refresh(provider)
    session.refresh(service)
    session.refresh(patient)
    return dept, provider, service, patient


def test_department_code_is_unique(session: Session) -> None:
    session.add(Department(code="GM", name="General Medicine", kind=DepartmentKind.CLINIC))
    session.commit()

    session.add(Department(code="GM", name="Duplicate", kind=DepartmentKind.CLINIC))
    with pytest.raises(IntegrityError):
        session.commit()


def test_user_username_is_unique(session: Session) -> None:
    session.add(User(username="admin", password_hash="x", role=UserRole.ADMIN))
    session.commit()

    session.add(User(username="admin", password_hash="y", role=UserRole.ADMIN))
    with pytest.raises(IntegrityError):
        session.commit()


def test_visit_token_no_is_unique(session: Session) -> None:
    _, provider, service, patient = _base_catalog(session)

    session.add(
        Visit(
            patient_id=patient.id,
            provider_id=provider.id,
            service_id=service.id,
            source=VisitSource.APPOINTMENT,
            token_no="GM-A001",
            status=VisitStatus.BOOKED,
        )
    )
    session.commit()

    session.add(
        Visit(
            patient_id=patient.id,
            provider_id=provider.id,
            service_id=service.id,
            source=VisitSource.APPOINTMENT,
            token_no="GM-A001",
            status=VisitStatus.BOOKED,
        )
    )
    with pytest.raises(IntegrityError):
        session.commit()


def test_slot_start_at_is_unique_per_provider(session: Session) -> None:
    _, provider, _, _ = _base_catalog(session)
    start_at = datetime(2026, 9, 26, 9, 0, tzinfo=UTC)
    end_at = datetime(2026, 9, 26, 9, 15, tzinfo=UTC)

    session.add(Slot(provider_id=provider.id, start_at=start_at, end_at=end_at, capacity=1))
    session.commit()

    session.add(Slot(provider_id=provider.id, start_at=start_at, end_at=end_at, capacity=1))
    with pytest.raises(IntegrityError):
        session.commit()


def test_service_name_is_unique_per_department(session: Session) -> None:
    dept, _, _, _ = _base_catalog(session)

    session.add(Service(department_id=dept.id, name="Consultation", default_duration_min=10))
    with pytest.raises(IntegrityError):
        session.commit()
