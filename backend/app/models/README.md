# Models

SQLModel table classes (persistence layer): `Department`, `Service`, `Provider`, `Slot`, `Patient`, `User`, `Visit`, `QueueEvent`, `ServiceDurationStat`, `ClinicSettings`, `SimClock`. These map 1:1 to database tables and carry no business logic — no relationships are declared between them; callers query by foreign-key id explicitly, kept simple on purpose for a hackathon-scale codebase.

Priority (`Visit.priority_flag`/`priority_reason`) may only be set by an authorized staff user or the demo simulator — there are no symptom or clinical fields anywhere in this package, by design (see `docs/architecture.md`).

Importing `app.models` registers every table on `SQLModel.metadata`; anything that calls `create_all` must import the package, not an individual module.
