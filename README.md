<div align="center">

<img src="docs/screenshots/01_landing_hero.png" alt="AIOps Platform Hero" width="100%" />

# ⚡ AIOps Platform — SentinelOps

### AI-Powered Incident Root Cause & Remediation Platform

*Detect. Analyze. Remediate — in seconds, not hours.*

[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Claude AI](https://img.shields.io/badge/Claude-Sonnet_4-FF6B35?style=for-the-badge&logo=anthropic&logoColor=white)](https://anthropic.com)
[![License MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[🚀 Launch App](#-quick-start) · [📖 API Docs](http://localhost:8000/api/docs) · [⭐ Star on GitHub](#)

</div>

---

## 📸 Screenshots

<details open>
<summary><strong>🏠 Landing Page — Hero Section</strong></summary>
<br/>

![Hero Section](docs/screenshots/01_landing_hero.png)

> **Enterprise AIOps landing page** — Dark-themed, animated hero with live dashboard preview, real-time stats, and one-click app launch.

</details>

---

<details open>
<summary><strong>⚙️ Core Features Section</strong></summary>
<br/>

![Core Features](docs/screenshots/02_features.png)

> **6 core feature cards** — Multi-source log ingestion, intelligent incident detection, AI root cause analysis, auto remediation, dual summary generation, and AI chatbot.

</details>

---

<details open>
<summary><strong>🔄 How It Works + Live Demo</strong></summary>
<br/>

![How It Works](docs/screenshots/03_how_it_works.png)

> **4-step automated pipeline** — Ingest → Detect → Analyze → Remediate. Includes live demo of a real Failed Deployment incident with AI root cause output and kubectl remediation commands.

</details>

---

<details open>
<summary><strong>🛠️ Tech Stack</strong></summary>
<br/>

![Tech Stack](docs/screenshots/04_tech_stack.png)

> **10 best-in-class technologies** — Python 3.12, FastAPI, React 18, Tailwind CSS, Claude AI, SQLAlchemy, Recharts, JWT Auth, Docker, WebSockets.

</details>

---

<details open>
<summary><strong>🎯 CTA + Quick Start</strong></summary>
<br/>

![CTA Section](docs/screenshots/05_cta.png)

> **Ready to deploy** — One-command Docker setup, default credentials, and Anthropic API key configuration guide.

</details>

---

## 🚀 Quick Start

### ⚡ Option 1 — One Command (Python + Node.js)

```bash
# Windows — Double click this file:
START_WINDOWS.bat

# Mac / Linux:
./START_MAC_LINUX.sh
```

**Then open:** `http://localhost:8000`

---

### 🐳 Option 2 — Docker

```bash
git clone https://github.com/your-org/aiops-platform.git
cd aiops-platform
cp .env.example .env          # Add ANTHROPIC_API_KEY here
docker-compose up -d
```

**Then open:** `http://localhost:3000`

---

### 🔑 Default Login

| Username | Password    | Role  |
|----------|-------------|-------|
| `admin`  | `Admin@123` | Admin |
| `demo`   | `Demo@123`  | User  |

> 💡 Use the **"Launch Demo"** button on the login page to auto-seed 27 sample logs and 6 pre-detected incidents!

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📥 **Multi-Source Log Ingestion** | Server, Docker, Kubernetes, Nginx, Application logs via file upload or REST API |
| 🚨 **Incident Detection** | Rule-based + AI anomaly detection for 8 incident types |
| 🧠 **AI Root Cause Analysis** | Claude AI analyzes logs with confidence scores & reasoning traces |
| 🔧 **Auto Remediation** | kubectl, docker, systemctl commands tailored to each incident |
| 📊 **Dual Summaries** | Technical (engineers) + Management (stakeholders) summaries |
| 💬 **AI Chatbot** | Natural language interface for querying incidents |
| ⚡ **Real-time WebSocket** | Live incident alerts pushed to dashboard |
| 🔒 **JWT Authentication** | Admin/User roles with secure token auth |
| 📤 **Export Reports** | JSON incident reports for downstream tools |
| 🌐 **REST API** | 25 endpoints with full OpenAPI documentation |

---

## 🔍 Incident Types Auto-Detected

```
🔴 CRITICAL  →  Service Downtime      (93% confidence)
🔴 CRITICAL  →  Database Error        (89% confidence)
🔴 CRITICAL  →  Disk Full             (95% confidence)
🟠 HIGH      →  Failed Deployment     (88% confidence)
🟠 HIGH      →  Memory Spike / OOM    (91% confidence)
🟠 HIGH      →  CPU Overload          (85% confidence)
🟠 HIGH      →  Traffic Spike / DDoS  (82% confidence)
🟡 MEDIUM    →  Auth Failures         (87% confidence)
```

---

## 📂 Project Structure

```
aiops-platform/
├── 🗂️  backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Environment settings
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models/              # DB models (User, Log, Incident)
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API endpoints (auth, logs, incidents, analysis, chatbot, ws)
│   │   ├── services/            # Business logic (detection, AI analysis, parsing)
│   │   └── utils/               # JWT auth helpers
│   ├── sample_logs/             # Nginx, K8s, App sample log files
│   ├── tests/                   # 17 unit + integration tests
│   └── requirements.txt
│
├── 🎨  frontend/
│   ├── src/
│   │   ├── pages/               # Dashboard, Incidents, Logs, Analysis, Chatbot, Settings
│   │   ├── components/          # Layout, Sidebar, Nav
│   │   ├── context/             # Auth context
│   │   ├── hooks/               # WebSocket hook
│   │   └── services/            # Axios API client
│   └── dist/                    # Production build (pre-built)
│
├── 📸  docs/screenshots/         # Platform screenshots
├── 🐳  docker-compose.yml
├── 📋  Makefile
├── 🌐  index.html               # Landing page
├── 🪟  START_WINDOWS.bat        # Windows launcher
├── 🐧  START_MAC_LINUX.sh       # Mac/Linux launcher
└── 📖  README.md
```

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | JWT login |
| `POST` | `/api/auth/register` | Register user |
| `POST` | `/api/logs/upload` | Upload log file (TXT/JSON) |
| `POST` | `/api/logs/ingest` | Batch API ingest |
| `GET`  | `/api/logs/` | List logs with filters |
| `GET`  | `/api/incidents/` | List incidents |
| `GET`  | `/api/incidents/{id}` | Incident details |
| `POST` | `/api/analysis/analyze/{id}` | Run full AI analysis |
| `GET`  | `/api/analysis/root-cause/{id}` | Get root cause |
| `GET`  | `/api/analysis/remediation/{id}` | Get remediation steps |
| `GET`  | `/api/analysis/export/{id}/json` | Export JSON report |
| `POST` | `/api/chatbot/` | Chat with Claude AI |
| `WS`   | `/ws/events` | Real-time WebSocket stream |

📄 Full interactive docs: `http://localhost:8000/api/docs`

---

## 🤖 AI Features (Anthropic Claude)

Set `ANTHROPIC_API_KEY` in `.env` to unlock:

- ✅ **Root Cause Analysis** — Claude reads logs, builds reasoning trace, gives confidence score
- ✅ **Remediation Generator** — Actual kubectl/docker/systemctl commands per incident
- ✅ **Technical Summary** — Detailed engineer-facing report
- ✅ **Management Summary** — Business impact summary for stakeholders
- ✅ **AI Chatbot** — "Why did api-gateway fail?" — ask in plain English

> Without API key, rule-based fallback analysis still works automatically.

---

## 🧪 Tests

```bash
cd backend
python -m pytest tests/ -v
# ✅ 17 passed
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy, Uvicorn |
| **Frontend** | React 18, Tailwind CSS, Recharts, Framer Motion |
| **AI** | Anthropic Claude (claude-sonnet-4-20250514) |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **Auth** | JWT + bcrypt |
| **Realtime** | WebSockets |
| **Deploy** | Docker, Docker Compose, Nginx |

---

## ⚙️ Environment Variables

```env
# Required for AI features
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Security
SECRET_KEY=your-secret-key-here

# Database (SQLite default, PostgreSQL for prod)
DATABASE_URL=sqlite:///./aiops.db

# App
DEBUG=false
```

---

## 🤝 Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<div align="center">

**Built with ❤️ using FastAPI · React · Claude AI · Docker**

⚡ *AIOps Platform — Making incident response intelligent*

</div>
