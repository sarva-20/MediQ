from datetime import UTC, datetime


def utcnow() -> datetime:
    """Wall-clock UTC time. Business/engine code must use app.core.clock.now(session)
    instead, so demos can run against the simulated clock; this helper is only for
    row bookkeeping timestamps (created_at, etc.) that must reflect real time."""
    return datetime.now(UTC)
