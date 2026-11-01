# Devora

AI-powered website development platform. Describe a website in natural language — Devora plans, designs, builds, tests, and packages it.

## Overview

Devora is a SaaS platform where users create complete websites through natural-language instructions. An AI development agent handles:

- **Requirement Analysis** — Understands what you want to build
- **Interactive Design** — Optional visual prototyping before development
- **Code Generation** — Generates real, production-quality source code
- **Automated Testing** — Verifies the generated website works
- **Live Preview** — Preview the website in your browser
- **Incremental Editing** — Modify specific parts without regenerating everything
- **Export & Deploy** — Download source code or deploy to your hosting

## Tech Stack

- **Frontend:** Next.js, TypeScript, React, Tailwind CSS
- **Backend:** Python, FastAPI, Pydantic
- **AI Agent:** LangGraph, Gemini
- **Auth:** Firebase Authentication
- **Database:** Cloud Firestore
- **Design Preview:** Sandpack

## Getting Started

### Prerequisites

- Node.js 24+
- Python 3.13+
- npm 11+
- Git

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
uvicorn main:app --reload
```

### Environment Variables

Copy `.env.example` files in both `frontend/` and `backend/` directories and fill in the required values. See `PROJECT_BRAIN/SECURITY.md` for guidance on secret management.

## Documentation

See `PROJECT_BRAIN/` for comprehensive architecture documentation:

- [Project Overview](PROJECT_BRAIN/PROJECT_OVERVIEW.md)
- [Architecture](PROJECT_BRAIN/ARCHITECTURE.md)
- [Tech Stack](PROJECT_BRAIN/TECH_STACK.md)
- [Features](PROJECT_BRAIN/FEATURES.md)
- [Database Schema](PROJECT_BRAIN/DATABASE_SCHEMA.md)
- [Agent Workflow](PROJECT_BRAIN/AGENT_WORKFLOW.md)
- [Security](PROJECT_BRAIN/SECURITY.md)
- [API Contracts](PROJECT_BRAIN/API_CONTRACTS.md)
- [Development Plan](PROJECT_BRAIN/DEVELOPMENT_PLAN.md)

## License

Proprietary. All rights reserved.

