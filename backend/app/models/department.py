from datetime import datetime

from sqlmodel import Field, SQLModel

from app.models.enums import DepartmentKind
from app.models.timestamps import utcnow


class Department(SQLModel, table=True):
    __tablename__ = "departments"

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True, max_length=16)
    name: str = Field(max_length=120)
    kind: DepartmentKind
    created_at: datetime = Field(default_factory=utcnow)
