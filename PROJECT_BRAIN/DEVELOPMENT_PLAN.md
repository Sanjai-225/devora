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
| 6 | Code Generation & Editing | 🔄 NEXT | Phase 4, 5 |
| 7 | Testing & Verification | 🔲 | Phase 6 |
| 8 | Download & Project Mgmt | 🔲 | Phase 6 |
| 9 | GitHub & Deployment | 🔲 | Phase 8 |
| 10 | Security, Polish & Release | 🔲 | All |

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

## Phase 6 — Code Generation & Editing 🔄 NEXT

**Deliverable:** Devora can generate a real website and modify it through follow-up instructions.

- [ ] Implement workspace tool registry
- [ ] Implement file tools (create, read, write, delete, list, search)
- [ ] Implement command tools (run, install deps, build)
- [ ] Implement code generation LangGraph node
- [ ] Implement incremental editing node
- [ ] Implement dependency installation
- [ ] Implement Git checkpoint creation
- [ ] Implement project workspace page (matching Stitch design)
- [ ] Implement file explorer panel
- [ ] Implement code diff view
- [ ] Test: full project generation (simple portfolio site)
- [ ] Test: incremental modification
- [ ] Test: Git checkpoint and restore

---

## Phase 7 — Testing & Verification 🔲

**Deliverable:** Devora can test the generated website and report genuine results.

- [ ] Implement build check tool
- [ ] Implement Playwright test runner integration
- [ ] Implement console error inspection
- [ ] Implement error analysis node
- [ ] Implement bounded repair loop (max 3 attempts)
- [ ] Implement test results display
- [ ] Implement verification report generation
- [ ] Test: error detection and repair
- [ ] Test: repair loop termination

---

## Phase 8 — Download & Project Management 🔲

**Deliverable:** User can download an independent copy of the generated project.

- [ ] Implement ZIP archive creation
- [ ] Implement secret exclusion from ZIP
- [ ] Implement .env.example generation
- [ ] Implement README generation for exported projects
- [ ] Implement ZIP download endpoint
- [ ] Implement project version history UI
- [ ] Implement project restore/rollback
- [ ] Test: ZIP contents verification
- [ ] Test: exported project runs independently

---

## Phase 9 — GitHub & Deployment 🔲

**Deliverable:** User can optionally publish their project through their own connected account.

- [ ] Implement GitHub OAuth flow
- [ ] Implement repository creation/selection
- [ ] Implement Git push to GitHub
- [ ] Implement Vercel deployment adapter
- [ ] Implement Render deployment adapter
- [ ] Implement deployment confirmation UI
- [ ] Implement deployment status tracking
- [ ] Implement integrations page
- [ ] Test: GitHub push flow
- [ ] Test: Vercel deployment

---

## Phase 10 — Security, Polish & Release 🔲

**Deliverable:** Documented, tested, deployable Devora MVP.

- [ ] Cross-project isolation tests
- [ ] Authentication and authorization tests
- [ ] Rate limiting verification
- [ ] End-to-end scenario testing (Scenarios A-F)
- [ ] Performance optimization
- [ ] Error handling review
- [ ] Logging review
- [ ] Documentation review
- [ ] Final Stitch design compliance check
- [ ] Known limitations documented

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



