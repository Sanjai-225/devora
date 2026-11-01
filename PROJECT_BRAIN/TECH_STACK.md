# Technology Stack — Devora

## Confirmed Versions (Development Environment)

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 24.19.0 | Frontend runtime |
| npm | 11.17.0 | Package manager |
| Next.js | 16.4.3 | Frontend framework |
| React | 19.x | UI library |
| TypeScript | 5.x | Frontend type safety |
| Tailwind CSS | 4.x | Utility-first CSS |
| Python | 3.13.14 | Backend runtime |
| FastAPI | 0.111.0 | Backend framework |
| Pydantic | 2.13.5 | Data validation |
| Firebase Admin | 6.5.0 | Server-side auth + Firestore |
| Firestore | 2.28.1 | Application database |
| Git | 2.55.0 | Version control |

## To Install

| Technology | Version | Purpose |
|-----------|---------|---------|
| LangGraph | latest | Agent workflow orchestration |
| langchain-google-genai | latest | Gemini LLM provider |
| google-genai | latest | Gemini API SDK |
| Playwright | latest | Browser testing |
| Vitest | latest | Frontend unit testing |
| pytest | latest | Backend/agent testing |
| uvicorn | latest | ASGI server |
| Sandpack (React) | latest | Browser-based code preview |
| Geist Font | latest | Primary UI font |
| JetBrains Mono | latest | Monospace code font |

## Frontend Stack Details

### Next.js 16 (App Router)
- Server Components for initial page loads
- Client Components for interactive UI
- API Routes for BFF (Backend-For-Frontend) patterns where needed
- Server Actions are NOT used for backend logic (separate FastAPI backend)

### Tailwind CSS 4
- Custom theme extending Obsidian Cyan Precision design tokens
- Dark mode only (design system is dark-first)
- Custom color palette matching Stitch designs

### Component Strategy
- Custom components built to match Stitch designs exactly
- No external component library (Radix/shadcn) — designs are specific enough
- Reusable primitives: Button, Input, Card, Badge, StatusChip, etc.
- Compound components: Sidebar, ProjectCard, WorkspacePanel, etc.

### State Management
- React Context for auth state and theme
- React Query (TanStack Query) for server state
- URL state for navigation and filters
- Local state for form and UI interactions

### Real-time Communication
- WebSocket connection to backend for agent streaming
- Reconnection logic with exponential backoff

## Backend Stack Details

### FastAPI
- Async request handlers
- Pydantic v2 models for all request/response validation
- Dependency injection for auth, database, providers
- CORS configured for frontend origin
- Rate limiting middleware

### Firebase Admin SDK
- Token verification for authentication
- Firestore client for database operations
- No Firebase client SDK on backend

### Uvicorn
- ASGI server for FastAPI
- Development: `--reload` mode
- Production: multiple workers

## Agent Stack Details

### LangGraph
- StateGraph for workflow definition
- Conditional edges for branching (design yes/no)
- Human-in-the-loop breakpoints for approvals
- SQLite-based checkpointer for state persistence
- Tool nodes for code generation and workspace operations

### Gemini (via google-genai)
- Primary LLM for all agent operations
- Structured output for requirement specs, plans, design specs
- Code generation with full file contents
- Used behind LLMProvider abstraction for future provider swaps

## Database

### Cloud Firestore
- NoSQL document database
- Real-time listeners for project status updates
- Security rules for client-side access control
- Server-side access via Admin SDK

### SQLite (Agent Checkpoints)
- LangGraph checkpoint persistence
- Per-project checkpoint database
- File-based, no additional infrastructure

## Testing Stack

| Tool | Scope |
|------|-------|
| Vitest | Frontend unit/component tests |
| Playwright | E2E browser tests (Devora UI + generated websites) |
| pytest | Backend API tests, agent workflow tests |
| TypeScript compiler | Frontend type checking |
| ESLint | Frontend linting |
| Ruff | Python linting |

## Design System

### Obsidian Cyan Precision
- **Source:** `design/stitch/obsidian_cyan_precision/DESIGN.md`
- **Primary Font:** Geist (sans-serif)
- **Code Font:** JetBrains Mono
- **Primary Color:** `#00F0FF` (Electric Cyan)
- **Surface Colors:** `#0B0D10`, `#0F1217`, `#151921`, `#1C222D`
- **Border Colors:** `#232B38`, `#2E3848`
- **Text Colors:** `#F1F5F9`, `#94A3B8`, `#64748B`
- **Success:** `#10B981`
- **Warning:** `#F59E0B`
- **Error:** `#EF4444`
- **Indigo accent:** `#6366F1`

