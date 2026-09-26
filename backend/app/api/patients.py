from fastapi import APIRouter, Depends
from sqlmodel import Session, or_, select

from app.api.deps import require_roles
from app.core.db import get_session
from app.models.enums import UserRole
from app.models.patient import Patient
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientOut

router = APIRouter(tags=["patients"])

require_staff = require_roles(UserRole.RECEPTIONIST, UserRole.ADMIN)

SEARCH_LIMIT = 20


@router.post("/patients", response_model=PatientOut, status_code=201)
def create_patient(
    body: PatientCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff),
) -> PatientOut:
    patient = Patient(full_name=body.full_name, phone=body.phone, is_simulated=True)
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return PatientOut.model_validate(patient)


@router.get("/patients", response_model=list[PatientOut])
def search_patients(
    q: str | None = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_staff),
) -> list[PatientOut]:
    query = select(Patient)
    if q:
        pattern = f"%{q}%"
        query = query.where(or_(Patient.full_name.ilike(pattern), Patient.phone.ilike(pattern)))
    patients = session.exec(query.limit(SEARCH_LIMIT)).all()
    return [PatientOut.model_validate(p) for p in patients]
