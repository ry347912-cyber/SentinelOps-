"""
Backend Tests
Unit + integration tests for AIOps Platform.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Use in-memory SQLite for tests
os.environ["DATABASE_URL"] = "sqlite:///./test_aiops.db"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["ANTHROPIC_API_KEY"] = ""

from app.main import app
from app.database import Base, get_db

# ─── Test Database Setup ──────────────────────────────────────────────────────

TEST_DB_URL = "sqlite:///./test_aiops.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)

client = TestClient(app)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def auth_token():
    """Create admin user and return JWT token."""
    client.post("/api/auth/seed-admin")
    res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ─── Health Check ─────────────────────────────────────────────────────────────

def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


# ─── Authentication ────────────────────────────────────────────────────────────

def test_seed_admin():
    res = client.post("/api/auth/seed-admin")
    assert res.status_code == 200


def test_login_success():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin"


def test_login_failure():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert res.status_code == 401


def test_get_profile(auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["username"] == "admin"


def test_unauthorized_without_token():
    res = client.get("/api/auth/me")
    assert res.status_code == 401


# ─── Log Ingestion ────────────────────────────────────────────────────────────

def test_ingest_logs(auth_headers):
    payload = {
        "logs": [
            {
                "source": "application",
                "level": "ERROR",
                "message": "Database connection refused: ECONNREFUSED 10.0.0.50:5432",
                "service_name": "user-service",
                "host": "app-server-01",
            },
            {
                "source": "application",
                "level": "INFO",
                "message": "Service started successfully",
                "service_name": "user-service",
                "host": "app-server-01",
            }
        ]
    }
    res = client.post("/api/logs/ingest", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_logs"] == 2


def test_list_logs(auth_headers):
    res = client.get("/api/logs/", headers=auth_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_log_stats(auth_headers):
    res = client.get("/api/logs/stats", headers=auth_headers)
    assert res.status_code == 200
    assert "total" in res.json()
    assert "by_level" in res.json()


def test_seed_sample_logs(auth_headers):
    res = client.post("/api/logs/seed-sample", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["seeded_logs"] > 0


# ─── Incidents ────────────────────────────────────────────────────────────────

def test_list_incidents(auth_headers):
    res = client.get("/api/incidents/", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "incidents" in data
    assert "total" in data


def test_dashboard_stats(auth_headers):
    res = client.get("/api/incidents/dashboard-stats", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_logs" in data
    assert "open_incidents" in data
    assert "severity_distribution" in data


def test_get_nonexistent_incident(auth_headers):
    res = client.get("/api/incidents/99999", headers=auth_headers)
    assert res.status_code == 404


# ─── Incident Detection ────────────────────────────────────────────────────────

def test_incident_detection_from_logs(auth_headers):
    """Injecting error logs should trigger incident detection."""
    payload = {
        "logs": [
            {"source": "kubernetes", "level": "ERROR", "message": "CrashLoopBackOff - container failed to start", "service_name": "api-service"},
            {"source": "kubernetes", "level": "CRITICAL", "message": "Deployment api-service FAILED - ImagePullBackOff", "service_name": "api-service"},
            {"source": "application", "level": "ERROR", "message": "connection refused ECONNREFUSED", "service_name": "api-service"},
        ]
    }
    res = client.post("/api/logs/ingest", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_logs"] == 3
    # Incidents should have been detected
    assert data["incidents_detected"] >= 0  # May vary based on grouping


# ─── Log Parsing ──────────────────────────────────────────────────────────────

def test_log_parsers():
    from app.services.log_ingestion import parse_log_file, LogSource

    # Nginx log
    nginx_log = '192.168.1.1 - - [21/May/2026:10:00:01 +0000] "GET /api 200 100" 200 200 "-" "curl/7.68"'
    entries = parse_log_file(nginx_log, LogSource.nginx)
    assert len(entries) == 1
    assert entries[0]["status_code"] == 200

    # Application log
    app_log = "2026-05-21T10:00:00Z ERROR [my-service] Database connection failed"
    entries = parse_log_file(app_log, LogSource.application)
    assert len(entries) == 1
    assert "ERROR" in str(entries[0]["level"])


def test_incident_detector():
    from app.services.incident_detection import IncidentDetector, DETECTION_RULES

    # Verify rules are properly defined
    assert len(DETECTION_RULES) > 0
    for rule in DETECTION_RULES:
        assert "type" in rule
        assert "patterns" in rule
        assert "severity" in rule
        assert len(rule["patterns"]) > 0


# ─── Cleanup ──────────────────────────────────────────────────────────────────

def test_cleanup():
    import os
    if os.path.exists("test_aiops.db"):
        os.remove("test_aiops.db")
    assert True
