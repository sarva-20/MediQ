"""Idempotent demo-data seeding. Business logic lives here so both the CLI
(app/seed/__main__.py) and tests (backend/tests/test_seed.py) can call seed()
directly against any Session.

Idempotency: a fresh database has no departments. If departments already exist,
seed() treats the database as already seeded and no-ops unless reset=True, in
which case every seed-managed table is cleared first and rebuilt from scratch.
This keeps `python -m app.seed` safe to run more than once."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlmodel import Session, select

from app.core.security import hash_password
from app.models.clinic_settings import ClinicSettings
from app.models.department import Department
from app.models.enums import UserRole, VisitSource, VisitStatus
from app.models.patient import Patient
from app.models.provider import Provider
from app.models.queue_event import QueueEvent
from app.models.service import Service
from app.models.service_duration_stat import ServiceDurationStat
from app.models.sim_clock import SimClock
from app.models.slot import Slot
from app.models.user import User
from app.models.visit import Visit
from app.seed.data import (
    DEMO_PASSWORD,
    DEPARTMENTS,
    PATIENT_FIRST_NAMES,
    PATIENT_LAST_NAMES,
    PROVIDER_SLOT_CONFIG,
    PROVIDERS,
    SERVICES,
)
from app.seed.tokens import TokenSequencer
from app.services.queue_service import recompute_all

PATIENT_COUNT = 40

# (offset_minutes_from_now, status, delay_minutes, delay_reason) — a realistic
# starting scenario mixing every visit lifecycle state, timed relative to "now"
# so the demo makes sense whenever it's actually run.
VISIT_PLAN: list[tuple[int, VisitStatus, int, str | None]] = [
    (-120, VisitStatus.COMPLETED, 0, None),
    (-100, VisitStatus.COMPLETED, 0, None),
    (-80, VisitStatus.COMPLETED, 0, None),
    (-60, VisitStatus.CHECKED_IN, 0, None),
    (-45, VisitStatus.IN_SERVICE, 0, None),
    (-30, VisitStatus.IN_SERVICE, 15, "Provider running behind schedule"),
    (-20, VisitStatus.CHECKED_IN, 0, None),
    (-10, VisitStatus.CHECKED_IN, 0, None),
    (-5, VisitStatus.CANCELLED, 0, None),
    (0, VisitStatus.NO_SHOW, 0, None),
    (15, VisitStatus.BOOKED, 0, None),
    (30, VisitStatus.BOOKED, 0, None),
    (45, VisitStatus.BOOKED, 0, None),
    (60, VisitStatus.BOOKED, 0, None),
    (90, VisitStatus.BOOKED, 0, None),
]


@dataclass
class SeedSummary:
    departments: int = 0
    services: int = 0
    providers: int = 0
    slots: int = 0
    patients: int = 0
    users: int = 0
    visits: int = 0
    skipped: bool = False


def _already_seeded(session: Session) -> bool:
    return session.exec(select(Department)).first() is not None


def reset_all(session: Session) -> None:
    """Deletes every seed-managed row, in FK-safe (children-first) order."""
    for model in (
        QueueEvent,
        Visit,
        ServiceDurationStat,
        Slot,
        User,
        Patient,
        Service,
        Provider,
        Department,
        ClinicSettings,
        SimClock,
    ):
        for row in session.exec(select(model)).all():
            session.delete(row)
    session.commit()


def _seed_singletons(session: Session) -> None:
    if session.get(ClinicSettings, 1) is None:
        session.add(ClinicSettings())
    if session.get(SimClock, 1) is None:
        session.add(SimClock())
    session.commit()


def _seed_departments(session: Session) -> dict[str, Department]:
    departments: dict[str, Department] = {}
    for entry in DEPARTMENTS:
        dept = Department(code=entry["code"], name=entry["name"], kind=entry["kind"])
        session.add(dept)
        departments[entry["code"]] = dept
    session.commit()
    for dept in departments.values():
        session.refresh(dept)
    return departments


def _seed_services(session: Session, departments: dict[str, Department]) -> dict[str, Service]:
    services: dict[str, Service] = {}
    for entry in SERVICES:
        dept = departments[entry["department"]]
        service = Service(
            department_id=dept.id,
            name=entry["name"],
            default_duration_min=entry["default_duration_min"],
            prep_time_min=entry["prep_time_min"],
        )
        session.add(service)
        services[entry["key"]] = service
    session.commit()
    for service in services.values():
        session.refresh(service)
    return services


def _seed_providers(session: Session, departments: dict[str, Department]) -> dict[str, Provider]:
    providers: dict[str, Provider] = {}
    for entry in PROVIDERS:
        dept = departments[entry["department"]]
        config = PROVIDER_SLOT_CONFIG[entry["kind"]]
        provider = Provider(
            department_id=dept.id,
            name=entry["name"],
            kind=entry["kind"],
            room_label=entry["room_label"],
            **config,
        )
        session.add(provider)
        providers[entry["key"]] = provider
    session.commit()
    for provider in providers.values():
        session.refresh(provider)
    return providers


def _generate_slots_for_day(session: Session, provider: Provider, day: datetime) -> int:
    start_at = datetime.combine(day.date(), provider.shift_start, tzinfo=UTC)
    end_at = datetime.combine(day.date(), provider.shift_end, tzinfo=UTC)
    capacity = provider.slot_capacity + provider.overbook_limit
    step = timedelta(minutes=provider.slot_length_min)

    count = 0
    cursor = start_at
    while cursor + step <= end_at:
        session.add(
            Slot(provider_id=provider.id, start_at=cursor, end_at=cursor + step, capacity=capacity)
        )
        cursor += step
        count += 1
    return count


def _seed_slots(session: Session, providers: dict[str, Provider], now: datetime) -> int:
    total = 0
    for provider in providers.values():
        for day_offset in (0, 1):
            total += _generate_slots_for_day(session, provider, now + timedelta(days=day_offset))
    session.commit()
    return total


def _seed_patients(session: Session) -> list[Patient]:
    patients = []
    for i in range(PATIENT_COUNT):
        first = PATIENT_FIRST_NAMES[i % len(PATIENT_FIRST_NAMES)]
        last = PATIENT_LAST_NAMES[(i * 7) % len(PATIENT_LAST_NAMES)]
        phone = f"9{700000000 + i:09d}"
        patient = Patient(full_name=f"{first} {last}", phone=phone, is_simulated=True)
        session.add(patient)
        patients.append(patient)
    session.commit()
    for patient in patients:
        session.refresh(patient)
    return patients


def _seed_users(session: Session, providers: dict[str, Provider], demo_patient: Patient) -> int:
    password_hash = hash_password(DEMO_PASSWORD)
    users = [
        User(username="admin", password_hash=password_hash, role=UserRole.ADMIN),
        User(username="receptionist", password_hash=password_hash, role=UserRole.RECEPTIONIST),
        User(
            username="patient",
            password_hash=password_hash,
            role=UserRole.PATIENT,
            patient_id=demo_patient.id,
        ),
    ]
    for key, provider in providers.items():
        users.append(
            User(
                username=key,
                password_hash=password_hash,
                role=UserRole.PROVIDER,
                provider_id=provider.id,
            )
        )
    session.add_all(users)
    session.commit()
    return len(users)


def _seed_visits(
    session: Session,
    providers: dict[str, Provider],
    services: dict[str, Service],
    patients: list[Patient],
    now: datetime,
) -> int:
    sequencer = TokenSequencer()
    provider_items = list(providers.items())
    default_service_for = {entry["key"]: entry["default_service"] for entry in PROVIDERS}
    department_code_for = {entry["key"]: entry["department"] for entry in PROVIDERS}

    for i, (offset, status, delay_minutes, delay_reason) in enumerate(VISIT_PLAN):
        key, provider = provider_items[i % len(provider_items)]
        service = services[default_service_for[key]]
        patient = patients[i % len(patients)]
        scheduled_start = now + timedelta(minutes=offset)

        checked_in_at = started_at = completed_at = None
        if status in (VisitStatus.CHECKED_IN, VisitStatus.IN_SERVICE, VisitStatus.COMPLETED):
            checked_in_at = scheduled_start
        if status in (VisitStatus.IN_SERVICE, VisitStatus.COMPLETED):
            started_at = scheduled_start
        if status is VisitStatus.COMPLETED:
            completed_at = scheduled_start + timedelta(minutes=service.default_duration_min)

        token_no = sequencer.next(department_code_for[key], "A")
        session.add(
            Visit(
                patient_id=patient.id,
                provider_id=provider.id,
                service_id=service.id,
                slot_id=None,  # seeded visits aren't tied to a generated Slot row;
                # exact slot allocation is wired up by the booking service (M3).
                source=VisitSource.APPOINTMENT,
                token_no=token_no,
                status=status,
                scheduled_start=scheduled_start,
                checked_in_at=checked_in_at,
                started_at=started_at,
                completed_at=completed_at,
                delay_minutes=delay_minutes,
                delay_reason=delay_reason,
            )
        )
    session.commit()
    return len(VISIT_PLAN)


def seed(session: Session, reset: bool = False) -> SeedSummary:
    if reset:
        reset_all(session)
    elif _already_seeded(session):
        return SeedSummary(skipped=True)

    now = datetime.now(UTC)

    _seed_singletons(session)
    departments = _seed_departments(session)
    services = _seed_services(session, departments)
    providers = _seed_providers(session, departments)
    slot_count = _seed_slots(session, providers, now)
    patients = _seed_patients(session)
    user_count = _seed_users(session, providers, demo_patient=patients[0])
    visit_count = _seed_visits(session, providers, services, patients, now)

    # Without this, every visit's estimated_start/eta_reason is None until
    # whatever client happens to trigger the first recompute — and that
    # client then sees a "first-ever estimate" baseline that's arbitrary
    # (whatever `now` happened to be when they asked), not the seed's intent.
    recompute_all(session)

    return SeedSummary(
        departments=len(departments),
        services=len(services),
        providers=len(providers),
        slots=slot_count,
        patients=len(patients),
        users=user_count,
        visits=visit_count,
    )
