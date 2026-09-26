"""Shared exception vocabulary for the services layer. The API layer catches
these and maps them onto the standard error envelope (404 / 409 / 422) —
services never import FastAPI or know about HTTP status codes."""


class NotFoundError(Exception):
    pass


class ConflictError(Exception):
    pass


class BusinessValidationError(Exception):
    pass
