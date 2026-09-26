# API

FastAPI routers. Each module defines one `APIRouter` (e.g. health, appointments, queue, providers) and is mounted in `app/main.py`. Routers should stay thin: validate the request via `schemas/`, delegate to `services/`, and return a schema — no business logic here.
