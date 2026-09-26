from fastapi.testclient import TestClient

from app.main import app

# Mirrors docs/api-contract.md — every endpoint documented there must be
# registered on the app (even as a Module M1 placeholder) so /docs already
# shows the whole surface to the frontend team.
DOCUMENTED_ENDPOINTS = [
    ("get", "/api/health"),
    ("post", "/api/auth/login"),
    ("get", "/api/auth/me"),
    ("get", "/api/departments"),
    ("get", "/api/departments/{department_id}/providers"),
    ("get", "/api/providers/{provider_id}"),
    ("get", "/api/services"),
    ("get", "/api/providers/{provider_id}/slots"),
    ("post", "/api/appointments"),
    ("get", "/api/appointments"),
    ("post", "/api/appointments/{visit_id}/cancel"),
    ("post", "/api/visits/{visit_id}/check-in"),
    ("post", "/api/walk-ins"),
    ("post", "/api/patients"),
    ("get", "/api/patients"),
    ("get", "/api/queue/providers/{provider_id}"),
    ("get", "/api/queue/overview"),
    ("get", "/api/status/{token_no}"),
    ("post", "/api/visits/{visit_id}/start"),
    ("post", "/api/visits/{visit_id}/delay"),
    ("post", "/api/visits/{visit_id}/complete"),
    ("post", "/api/visits/{visit_id}/no-show"),
    ("post", "/api/visits/{visit_id}/priority"),
    ("get", "/api/metrics"),
    ("get", "/api/events"),
    ("get", "/api/stream"),
    ("get", "/api/sim/clock"),
    ("post", "/api/sim/advance"),
    ("post", "/api/sim/freeze"),
    ("post", "/api/sim/resume"),
    ("post", "/api/sim/reset"),
    ("post", "/api/sim/seed"),
    ("get", "/api/admin/settings"),
    ("put", "/api/admin/settings"),
    ("put", "/api/admin/services/{service_id}"),
    ("get", "/api/admin/providers"),
    ("post", "/api/admin/providers"),
    ("put", "/api/admin/providers/{provider_id}"),
]


def test_every_documented_endpoint_is_in_openapi_schema() -> None:
    client = TestClient(app)
    schema = client.get("/openapi.json").json()
    paths = schema["paths"]

    for method, path in DOCUMENTED_ENDPOINTS:
        assert path in paths, f"{path} missing from OpenAPI schema"
        assert method in paths[path], f"{method.upper()} {path} missing from OpenAPI schema"
