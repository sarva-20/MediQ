from fastapi.testclient import TestClient

from tests.conftest import TEST_PASSWORD, AuthFixture

INVALID_CREDENTIALS_MESSAGE = "Invalid username or password."


def test_login_success_returns_token_and_identity(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": auth_fixture.provider_user.username, "password": TEST_PASSWORD},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["role"] == "provider"
    assert body["user_id"] == auth_fixture.provider_user.id
    assert body["provider_id"] == auth_fixture.provider.id
    assert body["patient_id"] is None


def test_login_wrong_password_is_rejected(client: TestClient, auth_fixture: AuthFixture) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": auth_fixture.admin.username, "password": "not-the-password"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == INVALID_CREDENTIALS_MESSAGE


def test_login_unknown_user_gets_same_error_as_wrong_password(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login", json={"username": "no-such-user", "password": "irrelevant"}
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == INVALID_CREDENTIALS_MESSAGE
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_login_inactive_user_is_rejected_with_same_generic_error(
    client: TestClient, auth_fixture: AuthFixture
) -> None:
    response = client.post(
        "/api/auth/login",
        json={"username": auth_fixture.inactive_user.username, "password": TEST_PASSWORD},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == INVALID_CREDENTIALS_MESSAGE
