from app.engine.models import ServiceDurationInput

MIN_SAMPLES_FOR_LEARNED_DURATION = 3


def expected_duration_minutes(duration: ServiceDurationInput) -> float:
    """Learned EWMA once there are enough samples, else the service default —
    plus prep time either way. Radiology services use this same function; the
    only difference is the numbers configured on the Service row."""

    base = (
        duration.ewma_minutes
        if duration.ewma_minutes is not None
        and duration.sample_count >= MIN_SAMPLES_FOR_LEARNED_DURATION
        else duration.default_duration_min
    )
    return base + duration.prep_time_min


def ewma_update(old: float, actual: float, alpha: float) -> float:
    """Exponentially-weighted moving average: weight `actual` by `alpha`, the
    existing estimate by the remainder."""
    return alpha * actual + (1 - alpha) * old
