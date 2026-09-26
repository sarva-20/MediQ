"""Plain-English cause attribution for an ETA change. Each branch is checked in
a fixed priority order and is truthful when it fires (it never lies about
what's happening) — with multiple simultaneous causes it picks the most
informative one rather than trying to list every contributing factor.
See docs/architecture.md § Queue engine for the full rule table."""

from dataclasses import dataclass
from datetime import datetime

from app.engine.models import PlacementCause, WaitingVisit


@dataclass(frozen=True)
class ReasonContext:
    in_service_delay_minutes: int
    in_service_overrun: bool
    has_priority_ahead: bool
    expired_count: int
    freed_at: datetime | None  # scheduled_start of a visit that just no-showed


def _delta_minutes(new_start: datetime, previous_start: datetime | None) -> int | None:
    if previous_start is None:
        return None
    delta = round((new_start - previous_start).total_seconds() / 60)
    return delta if delta != 0 else 0


def _prefixed(base: str, delta_minutes: int | None) -> str:
    if not delta_minutes:  # None or 0 — nothing to compare against, or no real change
        return base
    sign = "+" if delta_minutes > 0 else "-"
    return f"{sign}{abs(delta_minutes)} min: {base}"


def generate_reason(
    visit: WaitingVisit,
    new_start: datetime,
    cause: PlacementCause,
    expected_delay_min: int,
    ctx: ReasonContext,
) -> str:
    delta = _delta_minutes(new_start, visit.previous_estimated_start)

    if cause is PlacementCause.PRIORITY:
        return _prefixed("Priority patient placed ahead (set by staff)", delta)

    # A real drop (not "no previous estimate") is attributed to whatever freed
    # time up ahead; every other case (first-ever estimate, no change, or a
    # rise) is attributed to whatever is currently holding the queue up.
    if delta is not None and delta < 0:
        if ctx.expired_count > 0:
            if cause is PlacementCause.GAP_FILL:
                base = "Filled a gap left by an earlier no-show"
            elif ctx.freed_at is not None:
                base = f"no-show at {ctx.freed_at:%H:%M} freed the slot"
            else:
                base = "no-show freed the slot"
        else:
            base = "an earlier slot became available"
        return _prefixed(base, delta)

    if ctx.in_service_delay_minutes > 0:
        return _prefixed("delay logged by provider", delta)
    if ctx.in_service_overrun:
        return _prefixed("consultation ahead overran", delta)
    if visit.delay_minutes > 0:
        base = "delay logged" + (f" ({visit.delay_reason})" if visit.delay_reason else "")
        return _prefixed(base, delta)
    if ctx.has_priority_ahead:
        return _prefixed("priority patient placed ahead of you", delta)

    # No specific cause applies — a delta here (e.g. "+2 min") would just be
    # clock drift against whatever baseline happened to be stored last, not a
    # real queue event, so describe the current state instead of a delta.
    if expected_delay_min > 0:
        return f"Running {expected_delay_min} min behind schedule"
    return "On schedule"
