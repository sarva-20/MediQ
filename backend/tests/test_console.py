from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_console_root_returns_200() -> None:
    # StaticFiles(html=True) 307-redirects the bare mount path to "/console/";
    # TestClient (like a browser) follows that transparently.
    response = client.get("/console")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "MediQ Console" in response.text


def test_console_static_assets_load() -> None:
    js = client.get("/console/console.js")
    css = client.get("/console/console.css")

    assert js.status_code == 200
    assert "javascript" in js.headers["content-type"]
    assert css.status_code == 200
    assert "text/css" in css.headers["content-type"]
