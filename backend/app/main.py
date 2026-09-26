from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.booking import router as booking_router
from app.api.catalog import router as catalog_router
from app.api.health import router as health_router
from app.api.lifecycle import router as lifecycle_router
from app.api.metrics import router as metrics_router
from app.api.queue import router as queue_router
from app.api.sim import router as sim_router
from app.api.stream import router as stream_router
from app.api.walkin import router as walkin_router
from app.core.config import get_settings
from app.core.db import create_db_and_tables

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Normalizes every HTTPException onto the {"error": {...}} envelope documented
    in docs/api-contract.md § Error format, whether or not the raising code already
    used that shape (see app.api.deps.not_implemented)."""

    if isinstance(exc.detail, dict) and "error" in exc.detail:
        payload = exc.detail
    else:
        payload = {"error": {"code": "http_error", "message": str(exc.detail), "details": None}}
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    payload = {
        "error": {
            "code": "validation_error",
            "message": "Request validation failed.",
            "details": {"errors": jsonable_encoder(exc.errors())},
        }
    }
    return JSONResponse(status_code=422, content=payload)


app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(catalog_router, prefix="/api")
app.include_router(booking_router, prefix="/api")
app.include_router(walkin_router, prefix="/api")
app.include_router(queue_router, prefix="/api")
app.include_router(lifecycle_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")
app.include_router(stream_router, prefix="/api")
app.include_router(sim_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {"service": settings.app_name, "status": "ok"}
