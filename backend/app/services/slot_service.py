"""Slot generation from a provider's shift — idempotent per (provider, date).
`Slot.capacity` stores the provider's base slot_capacity only; overbook room
is always computed at read/booking time from the *current* overbook_limit
(provider's, or the clinic default), never baked into the row, so changing
overbook_limit later doesn't require regenerating slots."""

from datetime import UTC, datetime, time, timedelta
from datetime import date as date_type

from sqlmodel import Session, select

from app.models.provider import Provider
from app.models.slot import Slot


def ensure_slots_for_date(
    session: Session, provider: Provider, target_date: date_type, default_overbook_limit: int
) -> list[Slot]:
    day_start = datetime.combine(target_date, time.min, tzinfo=UTC)
    day_end = day_start + timedelta(days=1)
    existing = list(
        session.exec(
            select(Slot)
            .where(
                Slot.provider_id == provider.id,
                Slot.start_at >= day_start,
                Slot.start_at < day_end,
            )
            .order_by(Slot.start_at)
        ).all()
    )
    if existing:
        return existing

    shift_start = datetime.combine(target_date, provider.shift_start, tzinfo=UTC)
    shift_end = datetime.combine(target_date, provider.shift_end, tzinfo=UTC)
    step = timedelta(minutes=provider.slot_length_min)

    created: list[Slot] = []
    cursor = shift_start
    while cursor + step <= shift_end:
        slot = Slot(
            provider_id=provider.id,
            start_at=cursor,
            end_at=cursor + step,
            capacity=provider.slot_capacity,
        )
        session.add(slot)
        created.append(slot)
        cursor += step
    session.commit()
    for slot in created:
        session.refresh(slot)
    return created


def effective_overbook_limit(provider: Provider, default_overbook_limit: int) -> int:
    return (
        provider.overbook_limit if provider.overbook_limit is not None else default_overbook_limit
    )
