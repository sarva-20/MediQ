from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import ensure_provider_scope, not_found, require_roles
from app.core.db import get_session
from app.models.department import Department
from app.models.enums import UserRole, VisitStatus
from app.models.patient import Patient
from app.models.provider import Provider
from app.models.user import User
from app.models.visit import Visit
from app.schemas.queue import (
    ProviderQueueSummaryOut,
    PublicStatusOut,
    QueueOverviewOut,
    QueueSnapshotOut,
    QueueVisitOut,
)
from app.services import queue_service
from app.services.queue_service import QueueSnapshot

router = APIRouter(tags=["queue"])

require_queue_viewer = require_roles(UserRole.RECEPTIONIST, UserRole.PROVIDER, UserRole.ADMIN)
require_staff = require_roles(UserRole.RECEPTIONIST, UserRole.ADMIN)

NEXT_TOKENS_PREVIEW_SIZE = 3


def _mask_patient_name(full_name: str) -> str:
    """First name + last initial, for a shared queue-board display — see
    docs/architecture.md § Privacy."""
    parts = full_name.split()
    if len(parts) < 2:
        return full_name
    return f"{parts[0]} {parts[-1][0]}."


def _department_code(session: Session, provider: Provider) -> str:
    department = session.get(Department, provider.department_id)
    return department.code if department else ""


def _build_snapshot_out(session: Session, snapshot: QueueSnapshot) -> QueueSnapshotOut:
    queue: list[QueueVisitOut] = []
    for placement in snapshot.placements:
        visit = snapshot.visits_by_id[placement.visit_id]
        patient = session.get(Patient, visit.patient_id)
        queue.append(
            QueueVisitOut(
                visit_id=visit.id,
                token_no=visit.token_no,
                patient_name=_mask_patient_name(patient.full_name) if patient else "Unknown",
                status=visit.status,
                source=visit.source,
                position=placement.position,
                estimated_start=placement.estimated_start,
                estimated_wait_min=placement.estimated_wait_min,
                expected_delay_min=placement.expected_delay_min,
                eta_reason=placement.eta_reason,
                priority_flag=visit.priority_flag,
            )
        )

    return QueueSnapshotOut(
        provider_id=snapshot.provider.id,
        provider_name=snapshot.provider.name,
        department_code=_department_code(session, snapshot.provider),
        current_token=snapshot.in_service_visit.token_no if snapshot.in_service_visit else None,
        next_tokens=[v.token_no for v in queue[:NEXT_TOKENS_PREVIEW_SIZE]],
        load=queue_service.load(snapshot),
        delayed_count=queue_service.delayed_count(snapshot),
        queue=queue,
    )


@router.get("/queue/providers/{provider_id}", response_model=QueueSnapshotOut)
def get_provider_queue(
    provider_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_queue_viewer),
) -> QueueSnapshotOut:
    ensure_provider_scope(current_user, provider_id)
    try:
        snapshot = queue_service.recompute_provider(session, provider_id)
    except ValueError as exc:
        raise not_found("Provider not found.") from exc
    return _build_snapshot_out(session, snapshot)


@router.get("/queue/overview", response_model=QueueOverviewOut)
def get_queue_overview(
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff),
) -> QueueOverviewOut:
    providers = session.exec(select(Provider).where(Provider.is_active.is_(True))).all()
    summaries = []
    for provider in providers:
        snapshot = queue_service.recompute_provider(session, provider.id)
        summaries.append(
            ProviderQueueSummaryOut(
                provider_id=provider.id,
                provider_name=provider.name,
                department_code=_department_code(session, provider),
                current_token=(
                    snapshot.in_service_visit.token_no if snapshot.in_service_visit else None
                ),
                load=queue_service.load(snapshot),
                delayed_count=queue_service.delayed_count(snapshot),
            )
        )
    return QueueOverviewOut(providers=summaries)


_TERMINAL_STATUS_REASON = {
    VisitStatus.COMPLETED: "Visit completed.",
    VisitStatus.CANCELLED: "Visit cancelled.",
    VisitStatus.NO_SHOW: "Marked as a no-show.",
}


@router.get("/status/{token_no}", response_model=PublicStatusOut)
def get_public_status(token_no: str, session: Session = Depends(get_session)) -> PublicStatusOut:
    """Public, no login required — this is the token board patients check."""
    visit = session.exec(select(Visit).where(Visit.token_no == token_no)).first()
    if visit is None:
        raise not_found("No visit found for that token.")

    snapshot = queue_service.recompute_provider(session, visit.provider_id)
    department_code = _department_code(session, snapshot.provider)
    now_serving = snapshot.in_service_visit.token_no if snapshot.in_service_visit else None

    if visit.status is VisitStatus.IN_SERVICE:
        return PublicStatusOut(
            token_no=visit.token_no,
            department_code=department_code,
            provider_name=snapshot.provider.name,
            room_label=snapshot.provider.room_label,
            status=visit.status,
            position=None,
            patients_ahead=None,
            now_serving_token=now_serving,
            estimated_start=visit.started_at,
            estimated_wait_min=0,
            eta_reason="Now being served",
        )

    placement = next((p for p in snapshot.placements if p.visit_id == visit.id), None)
    if placement is None:
        return PublicStatusOut(
            token_no=visit.token_no,
            department_code=department_code,
            provider_name=snapshot.provider.name,
            room_label=snapshot.provider.room_label,
            status=visit.status,
            position=None,
            patients_ahead=None,
            now_serving_token=now_serving,
            estimated_start=None,
            estimated_wait_min=None,
            eta_reason=_TERMINAL_STATUS_REASON.get(visit.status),
        )

    return PublicStatusOut(
        token_no=visit.token_no,
        department_code=department_code,
        provider_name=snapshot.provider.name,
        room_label=snapshot.provider.room_label,
        status=visit.status,
        position=placement.position,
        patients_ahead=placement.position - 1,
        now_serving_token=now_serving,
        estimated_start=placement.estimated_start,
        estimated_wait_min=placement.estimated_wait_min,
        eta_reason=placement.eta_reason,
    )
