"""Usage (from backend/, with the venv active): `python -m app.seed [--reset]`."""

import argparse

from sqlmodel import Session

from app.core.db import create_db_and_tables, engine
from app.seed.run import seed


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed MediQ demo data.")
    parser.add_argument(
        "--reset", action="store_true", help="Wipe existing seed data before reseeding."
    )
    args = parser.parse_args()

    create_db_and_tables()
    with Session(engine) as session:
        summary = seed(session, reset=args.reset)

    if summary.skipped:
        print("Database already seeded; skipped. Use --reset to reseed from scratch.")
        return

    print("Seed complete:")
    print(f"  departments: {summary.departments}")
    print(f"  services:    {summary.services}")
    print(f"  providers:   {summary.providers}")
    print(f"  slots:       {summary.slots}")
    print(f"  patients:    {summary.patients}")
    print(f"  users:       {summary.users}")
    print(f"  visits:      {summary.visits}")


if __name__ == "__main__":
    main()
