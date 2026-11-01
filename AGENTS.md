# AGENTS.md — Devora AI Agent Instructions

## Project Identity

**Devora** is an AI-powered website development platform. Users describe a website in natural language, and Devora's AI agent plans, designs, builds, tests, previews, modifies, and packages the resulting website.

## Before Every Session

Read these files before making any changes:

1. `AGENTS.md` (this file)
2. `AI_AGENT_START_HERE.md`
3. All files in `PROJECT_BRAIN/`

## Repository Structure

```
devora/
├── frontend/          # Next.js + TypeScript + Tailwind CSS
├── backend/           # Python + FastAPI
├── agent/             # LangGraph agent workflow
├── shared/            # Shared contracts, types, constants
├── design/            # Stitch design reference (read-only)
│   └── stitch/        # Screen designs and design system
├── docs/              # Documentation
├── scripts/           # Build, deploy, dev scripts
├── tests/             # Integration and E2E tests
├── PROJECT_BRAIN/     # Architecture decisions and specs
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

### Architecture
- Keep frontend, backend, and agent clearly separated
- Use typed interfaces/contracts between components
- Keep all providers behind replaceable adapter interfaces
- Do not use Docker or require Docker installation
- Do not introduce mandatory paid dependencies without approval

### Code Quality
- Use TypeScript with strict mode in frontend
- Use Python type hints throughout backend and agent
- Validate all inputs with Pydantic (backend) and Zod (frontend)
- Handle errors explicitly — never silently swallow exceptions
- Add logging for important operations
- Write tests for critical functionality
- Maintain consistent naming conventions

### Design System
- Follow the Obsidian Cyan Precision design system from `design/stitch/`
- Primary accent: `#00F0FF` (Electric Cyan)
- Background: `#0B0D10` / `#0F1217` / `#151921`
- Font: Geist (UI), JetBrains Mono (code)
- See `design/stitch/obsidian_cyan_precision/DESIGN.md` for full spec

### Git Workflow
- `main` branch: stable, verified work only
- `testing` branch: active development
- Never merge to `main` without user confirmation
- Write meaningful commit messages

### What NOT To Do
- Do not regenerate entire projects for small modifications
- Do not claim code works without running verification
- Do not fabricate test results or deployment statuses
- Do not remove working features to make new features easier
- Do not silently change user-selected technology stacks
- Do not deploy publicly without explicit user approval
