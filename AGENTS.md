# AGENTS.md — Devora AI Agent Instructions

## Project Identity

**Devora** is an AI-powered website development platform. Users describe a website in natural language, and Devora's AI agent plans, designs, builds, tests, previews, modifies, and packages the resulting website.

## Before Every Session (Mandatory for ALL AI Agents: Claude, ChatGPT, Gemini, Cursor, Copilot)

Read these files before making any changes:

1. `AGENTS.md` (this file)
2. `AI_AGENT_START_HERE.md`
3. `PROJECT_BRAIN/PROJECT_CURRENT_STATUS.md` (exact handoff state, active branch, completed phases, and next steps)
4. `PROJECT_BRAIN/COMMIT_AND_CHANGE_LOG.md` (chronological commit & feature log)
5. All remaining specification files in `PROJECT_BRAIN/` (`DEVELOPMENT_PLAN.md`, `ARCHITECTURE.md`, `API_CONTRACTS.md`, `DATABASE_SCHEMA.md`, `AGENT_WORKFLOW.md`, `EXECUTION_INFRASTRUCTURE.md`, `SECURITY.md`, `DECISIONS.md`)

## Mandatory Project Brain & Multi-Agent Continuity Protocol

**CRITICAL RULE FOR ALL AI AGENTS & LLMs:**
This repository is designed to be seamlessly handed off between different AI agents (ChatGPT, Claude, Gemini, Cursor, Windsurf, etc.) at any time without losing context. Therefore, **every time you complete a phase, implement a feature, fix a bug, or modify any code**, you **MUST** update the following markdown files before committing:

1. **`PROJECT_BRAIN/PROJECT_CURRENT_STATUS.md`** — Update the current phase status, completed deliverables, test counts, active endpoints/pages, and exact instructions for the next phase so the next AI agent can resume immediately.
2. **`PROJECT_BRAIN/COMMIT_AND_CHANGE_LOG.md`** — Append a new entry documenting the date, phase/feature name, Git branch, commit summary, all files created/modified, and verification test results.
3. **`PROJECT_BRAIN/DEVELOPMENT_PLAN.md`** — Check off (`[x]`) completed tasks, update the Phase Overview table, and append a row to the `Progress Log` table.
4. **Relevant Spec Files in `PROJECT_BRAIN/`** — Whenever you add or modify API routes, database collections, or workflow nodes, update `API_CONTRACTS.md`, `DATABASE_SCHEMA.md`, or `AGENT_WORKFLOW.md` to stay 100% synchronized with the codebase.

Never leave `PROJECT_BRAIN/` out of sync with the code.

## Repository Structure

```
devora/
├── frontend/          # Next.js 16 + TypeScript + Tailwind CSS 4 (Vercel Free Tier ready)
├── backend/           # Python 3.13 + FastAPI (Render Free Web Service ready)
├── agent/             # LangGraph agent workflow, tools, and providers
├── shared/            # Shared contracts, types, constants
├── design/            # Stitch design reference (read-only)
│   └── stitch/        # Screen designs and design system
├── docs/              # Documentation & Free-Tier Hosting Guide
├── scripts/           # Build, deploy, dev scripts
├── tests/             # Integration and E2E pytest suites (Phases 2–6+)
├── PROJECT_BRAIN/     # Architecture decisions, specs, current status & change log
├── render.yaml        # Render Free Web Service blueprint ($0/month)
├── AGENTS.md          # This file
├── AI_AGENT_START_HERE.md
└── README.md
```

## Critical Rules

### Security
- Never hardcode API keys, passwords, tokens, or secrets
- Never expose platform credentials to generated projects
- Never allow cross-user or cross-project data access
- Never include real secrets in ZIP exports or git commits
- Never place secrets in LLM prompts unnecessarily
- All backend endpoints must verify user authentication and project ownership

### Architecture & Free-Tier Hosting ($0/Month Constraint)
- Keep frontend, backend, and agent clearly separated
- Use typed interfaces/contracts between components
- Keep all providers behind replaceable adapter interfaces
- Do not use Docker or require Docker installation
- Do not introduce mandatory paid dependencies without approval — maintain 100% compatibility with **Vercel Hobby (Free)**, **Render Free Web Service** (ephemeral `/tmp/devora/workspaces` + Firestore sync), and **Firebase Spark (Free)**

### Code Quality
- Use TypeScript with strict mode in frontend
- Use Python type hints throughout backend and agent
- Validate all inputs with Pydantic (backend) and Zod (frontend)
- Handle errors explicitly — never silently swallow exceptions
- Add logging for important operations
- Write tests for critical functionality
- Maintain consistent naming conventions (keep database, collection, and column/field names human-readable and meaningful)

### Design System
- Follow the Obsidian Cyan Precision design system from `design/stitch/`
- Primary accent: `#00F0FF` (Electric Cyan)
- Background: `#0B0D10` / `#0F1217` / `#151921`
- Font: Geist (UI), JetBrains Mono (code)
- See `design/stitch/obsidian_cyan_precision/DESIGN.md` for full spec

### Git Workflow & Deployment Confirmation
- `main` branch: stable, verified work only
- `testing` branch: active development
- Never merge to `main` without explicit user confirmation
- Never deploy publicly without explicit user confirmation
- Write meaningful commit messages and push verified work to `testing`

### What NOT To Do
- Do not regenerate entire projects for small modifications (use surgical incremental file edits and unified diffs)
- Do not claim code works without running verification (`pytest` + `npm run build`)
- Do not fabricate test results or deployment statuses
- Do not remove working features to make new features easier
- Do not silently change user-selected technology stacks
- Do not deploy publicly without explicit user approval
- Do not forget to update `PROJECT_BRAIN/PROJECT_CURRENT_STATUS.md` and `PROJECT_BRAIN/COMMIT_AND_CHANGE_LOG.md` after every change
