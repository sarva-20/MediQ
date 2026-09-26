from datetime import UTC, datetime, timedelta

import jwt
from fastapi.testclient import TestClient

from app.core.config import get_settings
from tests.conftest import AuthFixture
from tests.helpers import auth_header


def _expired_token(user_id: int) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "iat": now - timedelta(hours=2),
        "exp": now - timedelta(hours=1),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def test_me_with_valid_token_returns_current_user(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.get("/api/auth/me", headers=auth_header(auth_fixture.admin.id))

    assert response.status_code == 200
    assert response.json()["username"] == auth_fixture.admin.username


def test_me_without_token_is_rejected(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "missing_token"


def test_me_with_expired_token_is_rejected(client: TestClient, auth_fixture: AuthFixture) -> None:
    token = _expired_token(auth_fixture.admin.id)
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "token_expired"


def test_me_with_tampered_token_is_rejected(client: TestClient, auth_fixture: AuthFixture) -> None:
    valid_token = auth_header(auth_fixture.admin.id)["Authorization"].removeprefix("Bearer ")
    tampered = valid_token[:-1] + ("A" if valid_token[-1] != "A" else "B")

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered}"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_token"


def test_me_with_token_for_deleted_or_unknown_user_is_rejected(client: TestClient) -> None:
    token = auth_header(999999)["Authorization"]
    response = client.get("/api/auth/me", headers={"Authorization": token})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_token"
