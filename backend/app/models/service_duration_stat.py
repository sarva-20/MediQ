from sqlmodel import Field, SQLModel


class ServiceDurationStat(SQLModel, table=True):
    """Exponentially-weighted moving average of actual service duration per
    (provider, service), updated as visits complete. Lets the wait-time estimator
    use learned durations instead of only the static Service.default_duration_min
    once enough samples exist (see ClinicSettings.ewma_alpha)."""

    __tablename__ = "service_duration_stats"

    provider_id: int = Field(foreign_key="providers.id", primary_key=True)
    service_id: int = Field(foreign_key="services.id", primary_key=True)
    ewma_minutes: float = 0.0
    sample_count: int = 0
