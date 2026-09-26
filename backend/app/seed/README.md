# Seed

Idempotent demo-data seeding: departments (General Medicine, Ophthalmology, Paediatrics, Radiology), services, providers/scanners, generated slots, 40 synthetic patients, demo users (one per role plus one per provider — see `demo/README.md` for credentials), and a starting scenario of ~15 appointments in mixed lifecycle states.

Run from `backend/` with the venv active:

```bash
python -m app.seed          # seeds once; no-ops if already seeded
python -m app.seed --reset  # wipes seed-managed tables and reseeds from scratch
```
