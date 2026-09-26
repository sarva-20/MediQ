# Core

Cross-cutting infrastructure: settings (`config.py`, via `pydantic-settings`), the SQLModel database session/engine, and shared utilities (logging, RBAC dependencies, the simulated clock). Nothing department- or queue-specific belongs here.
