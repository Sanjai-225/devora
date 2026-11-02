# Development Plan — Devora

## Phase Overview

| Phase | Name | Status | Dependencies |
|-------|------|--------|-------------|
| 0 | Architecture & Feasibility | ✅ COMPLETE | None |
| 1 | Application Foundation | ✅ COMPLETE | Phase 0 |
| 2 | Requirement Analysis | ✅ COMPLETE | Phase 1 |
| 3 | Optional Design System | ✅ COMPLETE | Phase 2 |
| 4 | Configuration & Planning | ✅ COMPLETE | Phase 2 |
| 5 | Workspace & Execution | ✅ COMPLETE | Phase 1 |
| 6 | Code Generation & Editing | ✅ COMPLETE | Phase 4, 5 |
| 7 | Testing & Verification | ✅ COMPLETE | Phase 6 |
| 8 | Download & Project Mgmt | ✅ COMPLETE | Phase 6 |
| 9 | GitHub & Deployment | ✅ COMPLETE | Phase 8 |
| 10 | Security, Polish & Release | ✅ COMPLETE | All |

---

## Phase 0 — Architecture & Feasibility ✅

**Deliverable:** Reviewed technical architecture and implementation plan.

- [x] Inspect development environment
- [x] Confirm available runtimes and versions
- [x] Create repository structure
- [x] Review Stitch design files
- [x] Evaluate execution-provider options (no Docker)
- [x] Evaluate LangGraph persistence options
- [x] Define security boundaries and threat model
- [x] Document architecture decisions
- [x] Create all PROJECT_BRAIN documentation
- [x] Create development roadmap

---

## Phase 1 — Application Foundation ✅

**Deliverable:** User can register, log in, create a project, and see it in their dashboard.

### Frontend
- [x] Initialize Next.js 16 project with TypeScript + Tailwind CSS
- [x] Configure Obsidian Cyan Precision design system (colors, fonts, spacing)
- [x] Implement design system primitives (Button, Input, Card, Badge, StatusChip, Sidebar)
- [x] Implement auth pages (Sign In, Create Account, Password Recovery) matching Stitch designs
- [x] Configure Firebase Auth client SDK (email/password + Google OAuth)
- [x] Implement AuthContext provider
- [x] Implement protected route layout
- [x] Implement Dashboard page matching Stitch design
- [x] Implement sidebar navigation (Dashboard, Create Website, My Projects, Design Studio, Workspace, Integrations, Settings)
- [x] Implement project creation page matching Stitch design
- [x] Implement My Projects listing
- [x] Implement Settings page (profile tab)
- [x] Responsive layout (desktop first, then tablet/mobile)

### Backend
- [x] Initialize FastAPI project structure
- [x] Configure Firebase Admin SDK
- [x] Implement auth middleware (token verification)
- [x] Implement user endpoints (GET/PUT /users/me)
- [x] Implement project CRUD endpoints
- [x] Implement Firestore service layer
- [x] Configure CORS, rate limiting
- [x] Input validation with Pydantic models
- [x] Error handling middleware
- [x] Health check endpoint
- [x] Environment variable configuration

### Shared
- [x] Define API contract types
- [x] Define project status enum
- [x] Define error codes

### Testing
- [x] Backend: auth middleware tests
- [x] Backend: project CRUD tests
- [x] Frontend: smoke test (pages render)

---

## Phase 2 — Requirement Analysis ✅

**Deliverable:** User can describe a website and receive a structured requirement specification.

- [x] Install and configure LangGraph
- [x] Install and configure Gemini provider (google-genai)
- [x] Implement LLMProvider abstraction
- [x] Implement GeminiProvider adapter
- [x] Define StructuredRequirements Pydantic model
- [x] Implement requirement analysis LangGraph node
- [x] Implement clarification detection node
- [x] Implement clarification question generation
- [x] Implement answer processing node
- [x] Implement technology stack confirmation node
- [x] Implement WebSocket agent gateway (backend)
- [x] Implement agent chat UI in project workspace
- [x] Implement conversation persistence (Firestore)
- [x] Implement SQLite checkpointer for LangGraph
- [x] Implement requirement analysis display page (matching Stitch design)
- [x] Test: requirement analysis from natural language input
- [x] Test: clarification flow round-trip

---

## Phase 3 — Optional Design System ✅

**Deliverable:** User can preview a working prototype, request modifications, and approve it.

- [x] Implement design choice node (design_first vs direct_code)
- [x] Implement workflow decision page (matching Stitch design)
- [x] Implement design specification generation (Gemini)
- [x] Implement prototype code generation (React/TypeScript)
- [x] Implement Sandpack preview component
- [x] Implement Design Studio page (matching Stitch design)
- [x] Implement desktop/tablet/mobile viewport switching
- [x] Implement design chat (natural-language modifications)
- [x] Implement design version history
- [x] Implement design approval flow
- [x] Implement design token display panel
- [x] Test: design generation and preview
- [x] Test: design modification and versioning
- [x] Test: skip design workflow

---

## Phase 4 — Configuration & Planning ✅

**Deliverable:** Devora requests only the credentials and configuration actually needed.

- [x] Implement configuration requirement detection from requirements
- [x] Implement dynamic configuration form generation
- [x] Implement configuration page (matching Stitch design)
- [x] Implement secure secret handling (server-side storage)
- [x] Implement configuration validation
- [x] Implement implementation plan generation (Gemini)
- [x] Implement plan display and approval UI
- [x] Test: configuration detection for different project types
- [x] Test: secret storage and masking

---

## Phase 5 — Workspace & Execution ✅

**Deliverable:** Devora can create an isolated project environment and run a generated website.

- [x] Implement ExecutionProvider interface
- [x] Implement LocalProcessManager
- [x] Implement workspace creation (directory structure)
- [x] Implement workspace lifecycle (start/stop/restart)
- [x] Implement process management with PID tracking
- [x] Implement port allocation
- [x] Implement file read/write with path validation
- [x] Implement command execution with timeout
- [x] Implement log capture
- [x] Implement preview URL routing
- [x] Implement workspace cleanup
- [x] Implement workspace status API endpoints
- [x] Test: workspace creation and isolation
- [x] Test: process lifecycle
- [x] Test: path traversal prevention

---

## Phase 6 — Code Generation & Editing ✅

**Deliverable:** Devora can generate a real website and modify it through follow-up instructions.

- [x] Implement workspace tool registry
- [x] Implement file tools (create, read, write, delete, list, search)
- [x] Implement command tools (run, install deps, build)
- [x] Implement code generation LangGraph node
- [x] Implement incremental editing node
- [x] Implement dependency installation
- [x] Implement Git checkpoint creation
- [x] Implement project workspace page (matching Stitch design)
- [x] Implement file explorer panel
- [x] Implement code diff view
- [x] Test: full project generation (simple portfolio site)
- [x] Test: incremental modification
- [x] Test: Git checkpoint and restore

---

## Phase 7 — Testing & Verification ✅

**Deliverable:** Devora can test the generated website and report genuine results.

- [x] Implement build check tool
- [x] Implement Playwright test runner integration
- [x] Implement console error inspection
- [x] Implement error analysis node
- [x] Implement bounded repair loop (max 3 attempts)
- [x] Implement test results display
- [x] Implement verification report generation
- [x] Test: error detection and repair
- [x] Test: repair loop termination

---

## Phase 8 — Download & Project Management ✅ (Agent 2)

**Deliverable:** User can download an independent copy of the generated project.

- [x] Implement ZIP archive creation
- [x] Implement secret exclusion from ZIP
- [x] Implement .env.example generation
- [x] Implement README generation for exported projects
- [x] Implement ZIP download endpoint
- [x] Implement project version history UI
- [x] Implement project restore/rollback
- [x] Test: ZIP contents verification
- [x] Test: exported project runs independently

---

## Phase 9 — GitHub & Deployment ✅ (Agent 2)

**Deliverable:** User can optionally publish their project through their own connected account.

- [x] Implement GitHub OAuth flow
- [x] Implement repository creation/selection
- [x] Implement Git push to GitHub
- [x] Implement Vercel deployment adapter
- [x] Implement Render deployment adapter
- [x] Implement deployment confirmation UI
- [x] Implement deployment status tracking
- [x] Implement integrations page
- [x] Test: GitHub push flow
- [x] Test: Vercel deployment

---

## Phase 10 — Security, Polish & Release ✅ (Agent 2)

**Deliverable:** Documented, tested, deployable Devora MVP.

- [x] Cross-project isolation tests
- [x] Authentication and authorization tests
- [x] Rate limiting verification
- [x] End-to-end scenario testing (Scenarios A-F)
- [x] Performance optimization
- [x] Error handling review
- [x] Logging review
- [x] Documentation review
- [x] Final Stitch design compliance check
- [x] Known limitations documented

---

## Progress Log

| Date | Phase | Work Done |
|------|-------|-----------|
| 2026-11-01 | 0 | Environment inspection, architecture documentation, design system review, execution provider evaluation, project structure creation |
| 2026-11-01 | 1 | FastAPI backend foundation (auth, user/project CRUD, Firestore + dev fallback) and Next.js 16 frontend (Obsidian Cyan Precision theme, auth pages, Dashboard, Create Website, My Projects, Settings) |
| 2026-11-01 | 2 | LangGraph requirement analysis workflow, Gemini & Mock LLM providers, SQLite checkpointing, WebSocket & REST agent gateway, conversation persistence, Requirement Synthesis page matching Stitch design, Agent Chat UI, and Phase 2 automated test suite |
| 2026-11-01 | 3 | Optional Design System: DesignSpecification & prototype models, design workflow nodes (select_design_workflow, generate_initial_design, modify_design_version), backend design service & REST endpoints, Workflow Decision page, 3-pane Design Studio with SandpackPreview (Desktop/Tablet/Mobile viewports, live token editor, version history rollback, approval flow), and Phase 3 automated test suite |
| 2026-11-01 | 4 | Configuration & Planning: ConfigurationDetectionResult & ImplementationPlan models, config_nodes (detect_configuration_requirements, mask_secret_value, validate_and_apply_configuration, generate_implementation_plan, approve_implementation_plan), server-side secret vault & Firestore metadata persistence, Configuration & Implementation Plan page matching Stitch design, and Phase 4 automated test suite |
| 2026-11-01 | 5 | Workspace & Execution + Free-Tier Hosting: ExecutionProvider & LocalProcessManager (isolated workspaces in `/tmp/devora/workspaces`, strict path traversal guard, port allocation `4100-4999`, PID-tracked process lifecycle, timeout-bounded command execution with secret redaction), Workspace REST API + 3-column Workspace UI, Vercel (`frontend/vercel.json`) & Render Free-Tier Blueprint (`render.yaml`), and Phase 5 automated test suite |
| 2026-11-01 | 6 | Code Generation, Surgical Incremental Editing & Multi-Agent Continuity: WorkspaceToolRegistry (`create_file`, `read_file`, `write_file`, `delete_file`, `list_files`, `search_files`, `run_command`, `install_dependencies`, `run_build`), `codegen_nodes.py` (`generate_project_code`, `apply_incremental_edit` preserving untouched files with unified diffs, real Git checkpoint creation/listing/rollback), Workspace Diff Viewer & Deployment Confirmation Gate UI, `PROJECT_CURRENT_STATUS.md` + `COMMIT_AND_CHANGE_LOG.md`, and Phase 6 automated test suite |
| 2026-11-01 | 7 | Testing, Build Verification & Bounded Self-Repair Loop: `agent/models/verification.py`, `check_build`, `inspect_errors`, and `run_tests` in `WorkspaceToolRegistry` (12 tools), `verification_nodes.py` (`analyze_workspace_errors`, `repair_single_attempt`, `run_verification_and_repair_loop` strictly capped at max 3 attempts), `POST /verify` and `POST /repair` endpoints, Workspace Tests & Auto-Repair UI tab, and Phase 7 automated test suite (`20/20 passed`) |
| 2026-11-01 | 8 | **Agent 2 (`feature/agent-2`)**: Secret-Safe ZIP Export & Standalone Project Management (`backend/app/services/export_service.py`, `.env.example` & standalone `README.md` generation, `.env`/`.git`/`node_modules` exclusion + inline secret token scrubbing, `GET /export/metadata` & `GET /export` endpoints, Workspace Export ZIP & Version History Rollback UI tab, and Phase 8 automated test suite — `23/23 passed`) |
| 2026-11-01 | 9 | **Agent 2 (`feature/agent-2`)**: GitHub Integrations & $0/Month Cloud Deployment (`backend/app/services/deployment_service.py`, `backend/app/api/routes/integrations.py`, popup-compatible GitHub OAuth URL & masked credential vault, secret-safe GitHub repository push, user-confirmed Vercel Hobby & Render Free Web Service deployment adapters, `/integrations` Next.js page, and `tests/test_phase9_deployment.py` — `27/27 passed`) |
| 2026-11-01 | 10 | **Agent 2 (`feature/agent-2`)**: Security Hardening, Rate Limiting, Cross-Project Isolation & v1.0.0 MVP Release (`backend/app/middleware/rate_limit.py`, router-level ownership enforcement across `/projects/{id}/workspace/*`, `X-Content-Type-Options: nosniff` + sliding-window rate-limiting headers, End-to-End Scenarios A–F in `tests/test_phase10_security_and_e2e.py` — `31/31 passed`, `22/22` Next.js 16 routes compiled) |



