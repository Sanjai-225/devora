# AI Agent — Start Here

## Quick Onboarding

**Devora** = AI-powered website development platform.

Users describe websites in natural language → Devora's agent analyzes requirements → optionally designs a visual prototype → generates the full website → tests it → provides a live preview → allows surgical modifications → packages for download/deployment.

> **IMPORTANT FOR ANY NEW AI AGENT (ChatGPT, Claude, Gemini, Cursor, Copilot):**
> 1. Read `PROJECT_BRAIN/PROJECT_CURRENT_STATUS.md` and `PROJECT_BRAIN/COMMIT_AND_CHANGE_LOG.md` first to understand the exact state of the repository and where the previous agent left off.
> 2. After completing any phase, feature, or code modification, you **MUST** update `PROJECT_BRAIN/PROJECT_CURRENT_STATUS.md`, `PROJECT_BRAIN/COMMIT_AND_CHANGE_LOG.md`, and `PROJECT_BRAIN/DEVELOPMENT_PLAN.md` before committing.

## Current Development Phase

- **Phase 0 — Architecture & Feasibility** ✅ COMPLETE
- **Phase 1 — Application Foundation** ✅ COMPLETE
- **Phase 2 — Requirement Analysis** ✅ COMPLETE
- **Phase 3 — Optional Design System** ✅ COMPLETE
- **Phase 4 — Configuration & Planning** ✅ COMPLETE
- **Phase 5 — Workspace & Execution + Free-Tier Hosting** ✅ COMPLETE
- **Phase 6 — Code Generation & Surgical Editing** ✅ COMPLETE
- **Phase 7 — Testing & Verification** 🔄 NEXT

See `PROJECT_BRAIN/DEVELOPMENT_PLAN.md` and `PROJECT_BRAIN/PROJECT_CURRENT_STATUS.md` for the full roadmap and handoff report.

## Tech Stack Summary (100% Free-Tier Compatible)

| Layer | Technology | Free Hosting Target |
|-------|-----------|---------------------|
| Frontend | Next.js 16, TypeScript, React 19, Tailwind CSS 4 | Vercel Hobby Plan (`frontend/vercel.json`) |
| Backend | Python 3.13, FastAPI, Pydantic | Render Free Web Service (`render.yaml`) |
| AI Agent | LangGraph, Gemini (`google-genai`) | Google AI Studio Free Tier |
| Auth | Firebase Authentication | Firebase Spark Plan (`rapid-shift-r8chg`) |
| Database | Cloud Firestore | Firebase Spark Plan (`rapid-shift-r8chg`) |
| Design Preview | Sandpack (frontend prototypes) | Client-side in-browser bundler |
| Testing | Playwright, Vitest, pytest | Local & CI verification |
| Version Control | Git (`testing` active branch, `main` stable) | GitHub (`Sanjai-225/devora`) |

## Key Architecture Decisions

1. **No Docker** — Uses `LocalProcessManager` (`ExecutionProvider`) with OS process groups, strict path traversal protection, and ephemeral `/tmp/devora/workspaces`
2. **Single agent, multiple stages** — LangGraph workflow with conditional routing
3. **Provider abstraction** — All external services behind replaceable adapters
4. **Surgical Incremental Editing** — Never regenerates the entire project for small edits; modifies only targeted files, generates unified diffs, and records Git checkpoints
5. **SQLite / MemorySaver for LangGraph checkpoints** — Simple, reliable, zero paid infrastructure

## Commands

```bash
# Run all automated backend & agent phase tests (Phases 2-6)
PYTHONPATH=.:./backend pytest tests/ -v

# Frontend production build verification (from /frontend)
NODE_ENV=production npm --prefix frontend run build

# Firestore security rules lint verification
npx eslint firestore.rules
```

## Required Reading

Before modifying code, read:
- `PROJECT_BRAIN/PROJECT_CURRENT_STATUS.md` — **Start here for multi-agent handoff**
- `PROJECT_BRAIN/COMMIT_AND_CHANGE_LOG.md` — **Chronological commit & feature log**
- `PROJECT_BRAIN/DEVELOPMENT_PLAN.md` — Phase checklist and progress table
- `PROJECT_BRAIN/ARCHITECTURE.md` — System architecture
- `PROJECT_BRAIN/API_CONTRACTS.md` — Backend API endpoints
- `PROJECT_BRAIN/DATABASE_SCHEMA.md` — Firestore collections
- `PROJECT_BRAIN/SECURITY.md` — Security requirements
- `PROJECT_BRAIN/DECISIONS.md` — Why decisions were made
