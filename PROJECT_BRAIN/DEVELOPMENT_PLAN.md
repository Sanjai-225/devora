# Development Plan — Devora

## Phase Overview

| Phase | Name | Status | Dependencies |
|-------|------|--------|-------------|
| 0 | Architecture & Feasibility | ✅ COMPLETE | None |
| 1 | Application Foundation | 🔲 NEXT | Phase 0 |
| 2 | Requirement Analysis | 🔲 | Phase 1 |
| 3 | Optional Design System | 🔲 | Phase 2 |
| 4 | Configuration & Planning | 🔲 | Phase 2 |
| 5 | Workspace & Execution | 🔲 | Phase 1 |
| 6 | Code Generation & Editing | 🔲 | Phase 4, 5 |
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

## Phase 1 — Application Foundation 🔲

**Deliverable:** User can register, log in, create a project, and see it in their dashboard.

### Frontend
- [ ] Initialize Next.js 16 project with TypeScript + Tailwind CSS
- [ ] Configure Obsidian Cyan Precision design system (colors, fonts, spacing)
- [ ] Implement design system primitives (Button, Input, Card, Badge, StatusChip, Sidebar)
- [ ] Implement auth pages (Sign In, Create Account, Password Recovery) matching Stitch designs
- [ ] Configure Firebase Auth client SDK (email/password + Google OAuth)
- [ ] Implement AuthContext provider
- [ ] Implement protected route layout
- [ ] Implement Dashboard page matching Stitch design
- [ ] Implement sidebar navigation (Dashboard, Create Website, My Projects, Design Studio, Workspace, Integrations, Settings)
- [ ] Implement project creation page matching Stitch design
- [ ] Implement My Projects listing
- [ ] Implement Settings page (profile tab)
- [ ] Responsive layout (desktop first, then tablet/mobile)

### Backend
- [ ] Initialize FastAPI project structure
- [ ] Configure Firebase Admin SDK
- [ ] Implement auth middleware (token verification)
- [ ] Implement user endpoints (GET/PUT /users/me)
- [ ] Implement project CRUD endpoints
- [ ] Implement Firestore service layer
- [ ] Configure CORS, rate limiting
- [ ] Input validation with Pydantic models
- [ ] Error handling middleware
- [ ] Health check endpoint
- [ ] Environment variable configuration

### Shared
- [ ] Define API contract types
- [ ] Define project status enum
- [ ] Define error codes

### Testing
- [ ] Backend: auth middleware tests
- [ ] Backend: project CRUD tests
- [ ] Frontend: smoke test (pages render)

---

## Phase 2 — Requirement Analysis 🔲

**Deliverable:** User can describe a website and receive a structured requirement specification.

- [ ] Install and configure LangGraph
- [ ] Install and configure Gemini provider (google-genai)
- [ ] Implement LLMProvider abstraction
- [ ] Implement GeminiProvider adapter
- [ ] Define StructuredRequirements Pydantic model
- [ ] Implement requirement analysis LangGraph node
- [ ] Implement clarification detection node
- [ ] Implement clarification question generation
- [ ] Implement answer processing node
- [ ] Implement technology stack confirmation node
- [ ] Implement WebSocket agent gateway (backend)
- [ ] Implement agent chat UI in project workspace
- [ ] Implement conversation persistence (Firestore)
- [ ] Implement SQLite checkpointer for LangGraph
- [ ] Implement requirement analysis display page (matching Stitch design)
- [ ] Test: requirement analysis from natural language input
- [ ] Test: clarification flow round-trip

---

## Phase 3 — Optional Design System 🔲

**Deliverable:** User can preview a working prototype, request modifications, and approve it.

- [ ] Implement design choice node (design_first vs direct_code)
- [ ] Implement workflow decision page (matching Stitch design)
- [ ] Implement design specification generation (Gemini)
- [ ] Implement prototype code generation (React/TypeScript)
- [ ] Implement Sandpack preview component
- [ ] Implement Design Studio page (matching Stitch design)
- [ ] Implement desktop/tablet/mobile viewport switching
- [ ] Implement design chat (natural-language modifications)
- [ ] Implement design version history
- [ ] Implement design approval flow
- [ ] Implement design token display panel
- [ ] Test: design generation and preview
- [ ] Test: design modification and versioning
- [ ] Test: skip design workflow

---

## Phase 4 — Configuration & Planning 🔲

**Deliverable:** Devora requests only the credentials and configuration actually needed.

- [ ] Implement configuration requirement detection from requirements
- [ ] Implement dynamic configuration form generation
- [ ] Implement configuration page (matching Stitch design)
- [ ] Implement secure secret handling (server-side storage)
- [ ] Implement configuration validation
- [ ] Implement implementation plan generation (Gemini)
- [ ] Implement plan display and approval UI
- [ ] Test: configuration detection for different project types
- [ ] Test: secret storage and masking

---

## Phase 5 — Workspace & Execution 🔲

**Deliverable:** Devora can create an isolated project environment and run a generated website.

- [ ] Implement ExecutionProvider interface
- [ ] Implement LocalProcessManager
- [ ] Implement workspace creation (directory structure)
- [ ] Implement workspace lifecycle (start/stop/restart)
- [ ] Implement process management with PID tracking
- [ ] Implement port allocation
- [ ] Implement file read/write with path validation
- [ ] Implement command execution with timeout
- [ ] Implement log capture
- [ ] Implement preview URL routing
- [ ] Implement workspace cleanup
- [ ] Implement workspace status API endpoints
- [ ] Test: workspace creation and isolation
- [ ] Test: process lifecycle
- [ ] Test: path traversal prevention

---

## Phase 6 — Code Generation & Editing 🔲

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
