PYTHON := $(CURDIR)/backend/.venv/bin/python

.PHONY: install run test lint smoke

install:
	uv venv backend/.venv --python 3.12
	uv pip install --python $(PYTHON) -r backend/requirements-dev.txt

run:
	cd backend && $(PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	cd backend && $(PYTHON) -m pytest

lint:
	cd backend && $(PYTHON) -m ruff check .

smoke:
	cd backend && $(PYTHON) scripts/smoke_e2e.py
