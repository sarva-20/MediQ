from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.api.deps import ensure_visit_provider_scope, forbidden, get_visit_or_404, require_roles
from app.core.db import get_session
from app.models.enums import UserRole
from app.models.prescription import Prescription
from app.models.provider import Provider
from app.models.user import User
from app.schemas.prescription import PrescriptionCreate, PrescriptionOut

router = APIRouter(tags=["prescriptions"])

require_prescriber = require_roles(UserRole.PROVIDER, UserRole.ADMIN)
require_viewer = require_roles(
    UserRole.PATIENT, UserRole.RECEPTIONIST, UserRole.PROVIDER, UserRole.ADMIN
)


def _out(session: Session, p: Prescription) -> PrescriptionOut:
    provider = session.get(Provider, p.provider_id)
    out = PrescriptionOut.model_validate(p)
    out.provider_name = provider.name if provider else None
    return out


@router.post(
    "/visits/{visit_id}/prescriptions", response_model=PrescriptionOut, status_code=201
)
def create_prescription(
    visit_id: int,
    body: PrescriptionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_prescriber),
) -> PrescriptionOut:
    visit = get_visit_or_404(visit_id, session)
    ensure_visit_provider_scope(current_user, visit)

    prescription = Prescription(
        visit_id=visit.id,
        patient_id=visit.patient_id,
        provider_id=visit.provider_id,
        medications=body.medications,
        notes=body.notes,
    )
    session.add(prescription)
    session.commit()
    session.refresh(prescription)
    return _out(session, prescription)


@router.get("/visits/{visit_id}/prescriptions", response_model=list[PrescriptionOut])
def list_visit_prescriptions(
    visit_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_viewer),
) -> list[PrescriptionOut]:
    visit = get_visit_or_404(visit_id, session)
    if current_user.role is UserRole.PATIENT and current_user.patient_id != visit.patient_id:
        raise forbidden("You may only view your own prescriptions.")
    if current_user.role is UserRole.PROVIDER and current_user.provider_id != visit.provider_id:
        raise forbidden("You may only view your own patients' prescriptions.")

    items = session.exec(
        select(Prescription)
        .where(Prescription.visit_id == visit_id)
        .order_by(Prescription.id.desc())
    ).all()
    return [_out(session, p) for p in items]


@router.get("/patients/{patient_id}/prescriptions", response_model=list[PrescriptionOut])
def list_patient_prescriptions(
    patient_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_viewer),
) -> list[PrescriptionOut]:
    if current_user.role is UserRole.PATIENT and current_user.patient_id != patient_id:
        raise forbidden("You may only view your own prescriptions.")

    items = session.exec(
        select(Prescription)
        .where(Prescription.patient_id == patient_id)
        .order_by(Prescription.id.desc())
    ).all()
    return [_out(session, p) for p in items]
