# AI Agent — Start Here

## Quick Onboarding

**Devora** = AI-powered website development platform.

Users describe websites in natural language → Devora's agent analyzes requirements → optionally designs a visual prototype → generates the full website → tests it → provides a live preview → allows modifications → packages for download/deployment.

## Current Development Phase

**Phase 0 — Architecture & Feasibility** ✅ COMPLETE

**Phase 1 — Application Foundation** ✅ COMPLETE

**Phase 2 — Requirement Analysis** ✅ COMPLETE

**Phase 3 — Optional Design System** ✅ COMPLETE

**Phase 4 — Configuration & Planning** ✅ COMPLETE

**Phase 5 — Workspace & Execution** ✅ COMPLETE

**Phase 6 — Code Generation & Editing** 🔄 NEXT

See `PROJECT_BRAIN/DEVELOPMENT_PLAN.md` for full roadmap.

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, React 19, Tailwind CSS 4 |
| Backend | Python 3.13, FastAPI, Pydantic |
| AI Agent | LangGraph, Gemini (via google-genai) |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Design Preview | Sandpack (frontend prototypes) |
| Testing | Playwright, Vitest, pytest |
| Version Control | Git |

## Key Architecture Decisions

1. **No Docker** — Use managed execution providers for generated website isolation
2. **Single agent, multiple stages** — LangGraph workflow with conditional routing
3. **Provider abstraction** — All external services behind replaceable adapters
4. **Firestore for metadata** — Project files stored separately (S3-compatible/local)
5. **SQLite for LangGraph checkpoints** — Simple, reliable, no additional infrastructure

## Commands

```bash
# Frontend (from /frontend)
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Lint check
npm run type-check   # TypeScript check

# Backend (from /backend)  
uvicorn main:app --reload    # Start dev server
pytest                       # Run tests

# Agent (from /agent)
pytest                       # Run agent tests
```

## Required Reading

Before modifying code, read:
- `PROJECT_BRAIN/ARCHITECTURE.md` — System architecture
- `PROJECT_BRAIN/TECH_STACK.md` — Technology versions and rationale
- `PROJECT_BRAIN/API_CONTRACTS.md` — Backend API endpoints
- `PROJECT_BRAIN/DATABASE_SCHEMA.md` — Firestore collections
- `PROJECT_BRAIN/SECURITY.md` — Security requirements
- `PROJECT_BRAIN/DECISIONS.md` — Why decisions were made

