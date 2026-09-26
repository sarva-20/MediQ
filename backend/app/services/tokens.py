"""Race-safe, per (department, source, day) token numbering — e.g. "GM-A013".
Numbering resets each day, matching a physical token board."""

from collections.abc import Callable
from datetime import UTC, datetime, time, timedelta

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, func, select

from app.models.department import Department
from app.models.enums import VisitSource
from app.models.provider import Provider
from app.models.visit import Visit

MAX_TOKEN_RETRIES = 5
_SOURCE_LETTER = {VisitSource.APPOINTMENT: "A", VisitSource.WALKIN: "W"}


def _day_bounds(day: datetime) -> tuple[datetime, datetime]:
    start = datetime.combine(day.date(), time.min, tzinfo=UTC)
    return start, start + timedelta(days=1)


def _count_for_day(
    session: Session, department_code: str, source: VisitSource, day: datetime
) -> int:
    day_start, day_end = _day_bounds(day)
    date_column = Visit.scheduled_start if source is VisitSource.APPOINTMENT else Visit.created_at
    return session.exec(
        select(func.count())
        .select_from(Visit)
        .join(Provider, Provider.id == Visit.provider_id)
        .join(Department, Department.id == Provider.department_id)
        .where(
            Department.code == department_code,
            Visit.source == source,
            date_column >= day_start,
            date_column < day_end,
        )
    ).one()


def _format_token(department_code: str, source: VisitSource, number: int) -> str:
    return f"{department_code}-{_SOURCE_LETTER[source]}{number:03d}"


def generate_token_no(
    session: Session, department_code: str, source: VisitSource, day: datetime
) -> str:
    count = _count_for_day(session, department_code, source, day)
    return _format_token(department_code, source, count + 1)


def create_visit_with_token(
    session: Session,
    build_visit: Callable[[str], Visit],
    department_code: str,
    source: VisitSource,
    day: datetime,
    max_retries: int = MAX_TOKEN_RETRIES,
) -> Visit:
    """Builds and inserts a Visit with a freshly generated token, retrying (via
    a savepoint, so only the failed insert is undone) if a concurrent request
    just took the same number. Does not commit — the caller commits once,
    atomically with whatever else (e.g. a slot capacity claim) belongs in the
    same transaction.

    Each retry tries the *next* number rather than re-querying the count: the
    failed attempt was rolled back before it could be counted, so re-querying
    would just hand back the identical, already-taken candidate again."""
    base_count = _count_for_day(session, department_code, source, day)
    last_error: IntegrityError | None = None
    for attempt in range(max_retries):
        token_no = _format_token(department_code, source, base_count + 1 + attempt)
        visit = build_visit(token_no)
        try:
            with session.begin_nested():
                session.add(visit)
                session.flush()
        except IntegrityError as exc:
            last_error = exc
            continue
        return visit
    raise RuntimeError(
        f"Could not allocate a unique token after {max_retries} attempts"
    ) from last_error
