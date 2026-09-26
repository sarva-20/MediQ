"""Importing this package registers every table on SQLModel.metadata, which
app.core.db.create_db_and_tables() relies on. Anything that calls create_all must
import app.models (not an individual model module) first."""

from app.models.clinic_settings import ClinicSettings
from app.models.department import Department
from app.models.patient import Patient
from app.models.provider import Provider
from app.models.queue_event import QueueEvent
from app.models.service import Service
from app.models.service_duration_stat import ServiceDurationStat
from app.models.sim_clock import SimClock
from app.models.slot import Slot
from app.models.user import User
from app.models.visit import Visit

__all__ = [
    "ClinicSettings",
    "Department",
    "Patient",
    "Provider",
    "QueueEvent",
    "Service",
    "ServiceDurationStat",
    "SimClock",
    "Slot",
    "User",
    "Visit",
]
