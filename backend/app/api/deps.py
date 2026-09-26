from fastapi import HTTPException


def not_implemented(module: str) -> HTTPException:
    """Raised by every business endpoint until its owning module lands. Keeps the
    full API surface visible in /docs (Swagger) from Module M1 onward, per
    docs/api-contract.md, without pretending any of it works yet."""

    return HTTPException(
        status_code=501,
        detail={
            "error": {
                "code": "not_implemented",
                "message": f"Not implemented yet — planned for {module}. "
                "See docs/requirements-traceability.md.",
                "details": None,
            }
        },
    )


# RBAC enforcement (role-checking FastAPI dependencies) lands with Module M2 - Auth
# and roles. Role permissions are documented per-endpoint in docs/api-contract.md
# ahead of that so the frontend can build against the intended contract now.
