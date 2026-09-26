from typing import Any

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    """Every non-2xx JSON response from the API uses this envelope. See
    docs/api-contract.md § Error format."""

    error: ErrorDetail


class Page[T](BaseModel):
    """Standard pagination envelope. See docs/api-contract.md § Pagination."""

    items: list[T]
    total: int
    page: int
    page_size: int
