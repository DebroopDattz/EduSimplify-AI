# EduSimplify AI

[![CI/CD](https://github.com/your-org/edusimplify/actions/workflows/deploy.yml/badge.svg)](https://github.com/your-org/edusimplify/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Powered by IBM watsonx](https://img.shields.io/badge/Powered%20by-IBM%20watsonx-052FAD.svg)](https://www.ibm.com/watsonx)

> **AI-powered study companion** that transforms dense academic PDFs into personalised explanations, interactive Q&A, and auto-generated quizzes — in the learner's own language.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Environment Setup](#environment-setup)
7. [Running Locally](#running-locally)
8. [Deployment](#deployment)
9. [API Documentation](#api-documentation)
10. [IBM Services Setup](#ibm-services-setup)
11. [Screenshots](#screenshots)
12. [Contributing](#contributing)
13. [License](#license)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Users (Browser)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                 ┌───────────▼────────────┐
                 │   Next.js Frontend     │  ← Vercel CDN
                 │   (React + Tailwind)   │
                 └───────────┬────────────┘
                             │ REST / JSON
                 ┌───────────▼────────────┐
                 │   FastAPI Backend      │  ← Render (Python 3.11)
                 │   + Uvicorn workers    │
                 └──┬──────┬──────┬───────┘
                    │      │      │
          ┌─────────▼─┐ ┌──▼───┐ ┌▼──────────────┐
          │ watsonx.ai│ │ COS  │ │  Cloudant DB   │
          │ (LLM +    │ │ (PDF │ │  (sessions +   │
          │  Embedder)│ │store)│ │   chat history)│
          └─────────┬─┘ └──────┘ └────────────────┘
                    │
          ┌─────────▼──────────┐
          │  ChromaDB          │
          │  (vector store)    │
          └────────────────────┘
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full component breakdown and data-flow walkthrough.

---

## Features

- 📄 **PDF Upload & Parsing** — upload lecture notes, textbooks, or research papers (up to 50 MB)
- 🤖 **RAG-powered Q&A** — ask any question; answers are grounded in your document via Retrieval-Augmented Generation
- 🎓 **Adaptive Explanations** — choose Beginner / Intermediate / Advanced to tune the vocabulary and depth
- 🌐 **Multilingual** — responds in English, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, or Gujarati
- 📝 **Auto Quiz Generation** — generate multiple-choice quizzes on any topic within the document
- 🔐 **Secure Auth** — IBM App ID handles OAuth 2.0 / OIDC login
- 📊 **Session History** — past chats and quiz scores saved to IBM Cloudant
- ⚡ **Redis Caching** — repeated queries served from cache for low latency

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Uvicorn, Python 3.11 |
| LLM | IBM watsonx.ai – `ibm/granite-13b-chat-v2` |
| Embeddings | IBM watsonx.ai – `ibm/slate-30m-english-rtrvr` |
| Vector Store | ChromaDB (persistent) |
| Object Storage | IBM Cloud Object Storage |
| Database | IBM Cloudant (NoSQL) |
| Auth | IBM App ID (OAuth 2.0 / OIDC) |
| Cache | Redis 7 |
| CI/CD | GitHub Actions |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Containers | Docker / Docker Compose |

---

## Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 18.x |
| npm | 9.x |
| Python | 3.11 |
| Docker Desktop | 24.x (optional, for containerised run) |
| IBM Cloud account | — |
| Git | 2.x |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-org/edusimplify.git
cd edusimplify
```

### 2. Automated setup (recommended)

**macOS / Linux / WSL:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Windows (PowerShell):**
```powershell
.\scripts\setup.ps1
```

The script will:
- Verify Node.js and Python versions
- Install frontend npm packages
- Create a Python virtual environment and install backend packages
- Copy `.env.example` → `.env` files
- Initialise the ChromaDB collection

### 3. Manual setup

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows:
.\.venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install -r requirements.txt
```

---

## Environment Setup

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=EduSimplify AI
NEXT_PUBLIC_IBM_APPID_CLIENT_ID=your_appid_client_id
NEXT_PUBLIC_IBM_APPID_DISCOVERY_ENDPOINT=https://<region>.appid.cloud.ibm.com/oauth/v4/<tenant-id>/.well-known/openid-configuration
NEXT_PUBLIC_IBM_APPID_REDIRECT_URI=http://localhost:3000/callback
NEXT_PUBLIC_MAX_UPLOAD_MB=50
NEXT_PUBLIC_SUPPORTED_LANGUAGES=English,Hindi,Tamil,Telugu,Bengali,Marathi,Kannada,Gujarati
```

### Backend — `backend/.env`

```env
# Application
APP_ENV=development
APP_SECRET_KEY=change_me_in_production

# IBM watsonx.ai
IBM_WATSONX_API_KEY=your_watsonx_api_key
IBM_WATSONX_PROJECT_ID=your_project_id
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
IBM_WATSONX_MODEL_ID=ibm/granite-13b-chat-v2
IBM_WATSONX_EMBED_MODEL_ID=ibm/slate-30m-english-rtrvr

# IBM Cloud Object Storage
IBM_COS_API_KEY=your_cos_api_key
IBM_COS_INSTANCE_CRN=crn:v1:bluemix:public:cloud-object-storage:...
IBM_COS_ENDPOINT=https://s3.us-south.cloud-object-storage.appdomain.cloud
IBM_COS_BUCKET_NAME=edusimplify-documents

# IBM Cloudant
IBM_CLOUDANT_URL=https://your-instance.cloudantnosqldb.appdomain.cloud
IBM_CLOUDANT_API_KEY=your_cloudant_api_key
IBM_CLOUDANT_DB_NAME=edusimplify-sessions

# IBM App ID
IBM_APPID_TENANT_ID=your_tenant_id
IBM_APPID_CLIENT_ID=your_client_id
IBM_APPID_CLIENT_SECRET=your_client_secret
IBM_APPID_OAUTH_SERVER_URL=https://<region>.appid.cloud.ibm.com/oauth/v4/<tenant-id>

# Redis
REDIS_URL=redis://localhost:6379/0

# ChromaDB
CHROMA_PERSIST_DIRECTORY=./chroma_db
CHROMA_COLLECTION_NAME=edusimplify_docs
```

> ⚠️ Never commit `.env` or `.env.local` to version control. Both files are listed in `.gitignore`.

---

## Running Locally

### Option A — Separate terminals

**Terminal 1 – Backend:**
```bash
cd backend
source .venv/bin/activate        # Windows: .\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
The API is available at [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI).

### Option B — Docker Compose

```bash
# Backend + Redis only
docker compose up --build

# Full stack (includes Next.js container)
docker compose --profile fullstack up --build
```

---

## Deployment

### Frontend → Vercel

1. Push the repository to GitHub.
2. Import the project on [vercel.com](https://vercel.com) and set the **Root Directory** to `frontend`.
3. Add all `NEXT_PUBLIC_*` environment variables in the Vercel dashboard.
4. Deploy. Subsequent pushes to `main` trigger automatic deployments via GitHub Actions.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the complete step-by-step guide.

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com) pointing to the `backend/` directory.
2. Set **Build Command** to `pip install -r requirements.txt` and **Start Command** to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
3. Add all backend environment variables in the Render dashboard.
4. Add your Render deploy hook URL as `RENDER_DEPLOY_HOOK_URL` in GitHub Secrets to enable auto-deploy on push.

---

## API Documentation

Full endpoint reference: [`docs/API.md`](docs/API.md)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `POST` | `/upload` | Upload and index a PDF document |
| `POST` | `/chat` | Send a message and receive an RAG-grounded answer |
| `POST` | `/quiz` | Generate a multiple-choice quiz from a document |
| `GET` | `/documents` | List all documents uploaded by the current user |
| `DELETE` | `/documents/{doc_id}` | Delete a document and its embeddings |
| `GET` | `/sessions` | Retrieve past chat sessions |
| `DELETE` | `/sessions/{session_id}` | Delete a chat session |

---

## IBM Services Setup

See [`docs/DEPLOYMENT.md#ibm-cloud-setup`](docs/DEPLOYMENT.md) for the full walkthrough. Quick reference:

| Service | Purpose | Free Tier |
|---|---|---|
| **watsonx.ai** | LLM inference + embeddings | Lite plan (limited tokens) |
| **Cloud Object Storage** | PDF document storage | 25 GB/month |
| **Cloudant** | Session & chat history | 1 GB storage |
| **App ID** | OAuth 2.0 authentication | 1,000 events/month |

---

## Screenshots

> _Screenshots will be added after the UI is finalised._

| Feature | Preview |
|---|---|
| Upload & Chat | _(coming soon)_ |
| Quiz Mode | _(coming soon)_ |
| Multilingual Q&A | _(coming soon)_ |

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feat/your-feature`
2. Make changes, add tests, and ensure all checks pass: `pytest backend/tests/ && cd frontend && npm test`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `git commit -m "feat: add summary endpoint"`
4. Open a Pull Request against `main`. The CI pipeline must be green before merging.

Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full code style and review guidelines.

---

## License

This project is licensed under the **MIT License** — see the [`LICENSE`](LICENSE) file for details.

---

<p align="center">Built with ❤️ using <strong>IBM watsonx.ai</strong></p>
