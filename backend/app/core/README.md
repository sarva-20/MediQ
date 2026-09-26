# Core

Cross-cutting infrastructure: settings (`config.py`, via `pydantic-settings`), the SQLModel database session/engine (`db.py`), password hashing and JWT issuing/verification (`security.py`), and the simulated clock (`clock.py`). RBAC dependencies live in `app/api/deps.py` since they're FastAPI-specific, not framework-agnostic core logic. Nothing department- or queue-specific belongs here.
