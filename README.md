# ⚡ AIOps Incident Root Cause & Remediation Platform

> Enterprise-grade AI-powered incident detection, root cause analysis, and automated remediation — built with FastAPI, React, and Claude AI.

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue?logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Claude AI](https://img.shields.io/badge/Claude-Sonnet_4-orange?logo=anthropic)](https://anthropic.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)

---

## 🖼️ Screenshots

| Dashboard | Incident Detail | AI Analysis | Chatbot |
|-----------|----------------|-------------|---------|
| Live metrics, charts, KPIs | Root cause + remediation | Bulk AI runner | Claude-powered Q&A |

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/aiops-platform.git
cd aiops-platform

# 2. Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Launch everything
docker-compose up -d

# 4. Open browser
open http://localhost:3000       # Dashboard
open index.html                  # Landing page
open http://localhost:8000/api/docs  # API docs
```

### Option 2: Local Development

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate         # Linux/Mac
# venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env with your settings

# Start the backend
uvicorn app.main:app --reload --port 8000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# Opens at http://localhost:5173
```

---

## 🔑 Default Credentials

After first launch, create demo users:

```bash
curl -X POST http://localhost:8000/api/auth/seed-admin
```

| Username | Password    | Role  |
|----------|-------------|-------|
| `admin`  | `Admin@123` | Admin |
| `demo`   | `Demo@123`  | User  |

Or use the **"Launch Demo"** button on the login page.

---

## 📂 Project Structure

```
aiops-platform/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings via env vars
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   └── __init__.py      # User, LogEntry, Incident, Alert models
│   │   ├── schemas/
│   │   │   └── __init__.py      # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── auth.py          # JWT login, register, profile
│   │   │   ├── logs.py          # Log ingestion (file + API)
│   │   │   ├── incidents.py     # Incident CRUD + dashboard stats
│   │   │   ├── analysis.py      # AI root cause + remediation
│   │   │   ├── chatbot.py       # AI chatbot endpoint
│   │   │   └── websocket.py     # Real-time WebSocket events
│   │   ├── services/
│   │   │   ├── log_ingestion.py     # Multi-format log parsers
│   │   │   ├── incident_detection.py # Rule-based + AI detection
│   │   │   ├── ai_analysis.py       # Claude API integration
│   │   │   └── background_tasks.py  # Periodic scanning
│   │   ├── utils/
│   │   │   └── auth.py          # JWT utilities
│   │   └── sample_data.py       # Demo log data
│   ├── sample_logs/             # Sample log files for testing
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Routes + providers
│   │   ├── main.jsx             # React entry point
│   │   ├── index.css            # Global styles + Tailwind
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # JWT auth state
│   │   ├── hooks/
│   │   │   └── useWebSocket.js  # Real-time WS connection
│   │   ├── services/
│   │   │   └── api.js           # Axios API client
│   │   ├── components/
│   │   │   └── common/
│   │   │       └── Layout.jsx   # Sidebar + nav
│   │   └── pages/
│   │       ├── LoginPage.jsx         # Auth
│   │       ├── DashboardPage.jsx     # Overview + charts
│   │       ├── IncidentsPage.jsx     # Incident list
│   │       ├── IncidentDetailPage.jsx # AI analysis view
│   │       ├── LogsPage.jsx          # Log viewer + upload
│   │       ├── AnalysisPage.jsx      # Bulk AI analysis
│   │       ├── ChatbotPage.jsx       # AI assistant
│   │       └── SettingsPage.jsx      # Configuration
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── nginx.conf
│   └── Dockerfile
│
├── index.html                   # Landing page (open directly)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | JWT login |
| POST | `/api/auth/register` | Register user |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/logs/upload` | Upload log file |
| POST | `/api/logs/ingest` | Batch API ingest |
| GET | `/api/logs/` | List logs with filters |
| GET | `/api/incidents/` | List incidents |
| GET | `/api/incidents/{id}` | Incident details |
| POST | `/api/analysis/analyze/{id}` | Run full AI analysis |
| GET | `/api/analysis/root-cause/{id}` | Get root cause |
| GET | `/api/analysis/remediation/{id}` | Get remediation steps |
| GET | `/api/analysis/export/{id}/json` | Export report |
| POST | `/api/chatbot/` | Chat with AI |
| WS | `/ws/events` | Real-time event stream |

Full interactive docs: `http://localhost:8000/api/docs`

---

## 🔍 Incident Types Detected

| Type | Detection Method | Default Severity |
|------|-----------------|-----------------|
| Failed Deployment | CrashLoopBackOff, ImagePullBackOff, exit codes | High |
| Memory Spike | OOM killer, heap overflow, memory limit | High |
| CPU Overload | CPU ≥90%, load average spikes | High |
| Service Downtime | Connection refused, 503, health check fail | Critical |
| Auth Failures | 401/403 floods, brute force patterns | Medium |
| Traffic Spike | Rate limit exceeded, 429, DDoS patterns | High |
| Database Error | Deadlock, connection pool exhausted | Critical |
| Disk Full | No space left, filesystem 100% | Critical |

---

## 🤖 AI Features (Requires Anthropic API Key)

Set `ANTHROPIC_API_KEY` in `.env` to enable:

- **Root Cause Analysis** — Claude analyzes logs, identifies root cause, provides reasoning trace with confidence score
- **Remediation Generator** — Step-by-step commands (kubectl, docker, systemctl, nginx)
- **Technical Summary** — Detailed incident report for engineers
- **Management Summary** — Business impact summary for stakeholders
- **AI Chatbot** — Natural language incident queries and operational guidance

Without an API key, rule-based fallback analysis is used automatically.

---

## 📊 Log Sources & Formats

### File Upload (UI or API)

```bash
# Upload via API
curl -X POST http://localhost:8000/api/logs/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/app.log" \
  -F "source=application" \
  -F "service_name=my-service"
```

### Supported Formats

- **Nginx**: Standard access log + error log format
- **Docker**: JSON structured logs + plaintext
- **Kubernetes**: Pod logs with K8s severity prefixes (I/W/E/F)
- **Application**: Python/Java/Node.js log formats + JSON
- **Server**: Syslog format

### API Batch Ingest

```python
import requests

logs = {
  "logs": [
    {
      "source": "application",
      "level": "ERROR",
      "message": "Database connection refused",
      "service_name": "user-service",
      "host": "app-server-01"
    }
  ]
}

requests.post(
  "http://localhost:8000/api/logs/ingest",
  json=logs,
  headers={"Authorization": f"Bearer {token}"}
)
```

---

## 🐳 Docker Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | `` | Required for AI features |
| `SECRET_KEY` | dev-key | JWT signing secret |
| `DATABASE_URL` | sqlite:///./aiops.db | Database connection string |
| `DEBUG` | false | Enable debug logging |
| `CPU_THRESHOLD` | 85.0 | CPU % alert threshold |
| `MEMORY_THRESHOLD` | 90.0 | Memory % alert threshold |
| `INCIDENT_SCAN_INTERVAL` | 60 | Seconds between scans |

### Production with PostgreSQL

```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: aiops
      POSTGRES_USER: aiops
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    environment:
      DATABASE_URL: postgresql://aiops:${DB_PASSWORD}@postgres/aiops
```

---

## 🔧 Development

### Running Tests

```bash
cd backend
pip install pytest httpx
pytest tests/ -v
```

### Linting

```bash
# Backend
pip install ruff black
ruff check app/
black app/

# Frontend
npm run lint
```

### Building for Production

```bash
# Frontend build
cd frontend && npm run build

# Docker production build
docker-compose -f docker-compose.yml build --no-cache
```

---

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────────────────────────────────────┐
│   Browser   │    │              Backend (FastAPI)                │
│  React SPA  │◄──►│  ┌──────────┐  ┌─────────────┐  ┌────────┐ │
│  Tailwind   │    │  │  Routers │  │  Services   │  │  DB    │ │
│  Recharts   │    │  │  /auth   │  │  detection  │  │SQLite/ │ │
│  WebSocket  │    │  │  /logs   │  │  ingestion  │  │Postgres│ │
└─────────────┘    │  │  /inc.   │  │  ai_analysis│  └────────┘ │
                   │  │  /anal.  │  └──────┬──────┘             │
                   │  │  /chat   │         │                     │
                   │  │  /ws     │         ▼                     │
                   │  └──────────┘  ┌─────────────┐             │
                   │                │ Anthropic   │             │
                   │                │ Claude API  │             │
                   │                └─────────────┘             │
                   └──────────────────────────────────────────────┘
```

---

## 📝 License

MIT License — free to use, modify, and distribute.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## ⭐ Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com) — Modern Python web framework
- [Anthropic Claude](https://anthropic.com) — AI analysis and reasoning
- [React](https://react.dev) — Frontend UI framework
- [Tailwind CSS](https://tailwindcss.com) — Utility-first CSS
- [Recharts](https://recharts.org) — React charting library
- [SQLAlchemy](https://sqlalchemy.org) — Python ORM

---

*AIOps Platform — Making incident response intelligent* ⚡
