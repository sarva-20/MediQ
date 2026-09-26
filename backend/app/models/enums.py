from enum import StrEnum


class DepartmentKind(StrEnum):
    CLINIC = "clinic"
    RADIOLOGY = "radiology"


class ProviderKind(StrEnum):
    DOCTOR = "doctor"
    SCANNER = "scanner"


class VisitSource(StrEnum):
    APPOINTMENT = "appointment"
    WALKIN = "walkin"


class VisitStatus(StrEnum):
    BOOKED = "booked"
    CHECKED_IN = "checked_in"
    IN_SERVICE = "in_service"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class UserRole(StrEnum):
    PATIENT = "patient"
    RECEPTIONIST = "receptionist"
    PROVIDER = "provider"
    ADMIN = "admin"


class QueueEventType(StrEnum):
    """Fixed event vocabulary — every one of these, and only these, may mutate a Visit
    and must be followed by engine.recompute(provider, now). See docs/architecture.md."""

    BOOK = "book"
    WALK_IN = "walk_in"
    CHECK_IN = "check_in"
    START = "start"
    DELAY = "delay"
    COMPLETE = "complete"
    CANCEL = "cancel"
    NO_SHOW = "no_show"
    PRIORITY_SET = "priority_set"
    RECOMPUTE = "recompute"
