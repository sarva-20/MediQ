from sqlmodel import Session, select

from app.models.department import Department
from app.models.enums import VisitStatus
from app.models.visit import Visit
from app.seed.run import seed


def test_seed_populates_expected_data(session: Session) -> None:
    summary = seed(session)

    assert not summary.skipped
    assert summary.departments == 4
    assert summary.patients == 40
    assert summary.visits == 15


def test_seed_recomputes_so_estimates_are_not_stale_on_first_read(session: Session) -> None:
    # Without a post-seed recompute, every waiting visit's estimated_start/
    # eta_reason is None until whatever client happens to ask first — and that
    # client then becomes the arbitrary "previous estimate" baseline.
    seed(session)

    waiting = session.exec(
        select(Visit).where(Visit.status.in_((VisitStatus.BOOKED, VisitStatus.CHECKED_IN)))
    ).all()
    assert waiting
    for visit in waiting:
        assert visit.estimated_start is not None
        assert visit.eta_reason is not None


def test_seed_is_idempotent(session: Session) -> None:
    first = seed(session)
    second = seed(session)

    assert not first.skipped
    assert second.skipped
    assert len(session.exec(select(Department)).all()) == 4
    assert len(session.exec(select(Visit)).all()) == first.visits


def test_seed_reset_rebuilds_same_counts(session: Session) -> None:
    first = seed(session)
    second = seed(session, reset=True)

    assert not second.skipped
    assert second.departments == first.departments
    assert second.providers == first.providers
    assert second.patients == first.patients
    assert second.visits == first.visits
