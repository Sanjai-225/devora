# Architecture — Devora

## System Overview

Devora has three runtime components plus a shared contracts layer:

```
┌─────────────────────────────────────────────────────────────────┐
│                        USERS / BROWSER                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────┐
│                     FRONTEND (Next.js)                          │
│  Authentication │ Dashboard │ Project Workspace │ Design Studio │
│  Firestore SDK (client-side reads) │ REST/WS to Backend        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST + WebSocket
┌──────────────────────────────▼──────────────────────────────────┐
│                     BACKEND (FastAPI)                            │
│  Auth Middleware │ Project API │ Agent Gateway │ File API        │
│  Workspace Manager │ Provider Adapters │ Export/Deploy           │
└───────┬──────────────────────┬──────────────────┬───────────────┘
        │                      │                  │
   ┌────▼────┐          ┌──────▼──────┐    ┌──────▼──────┐
   │  Agent  │          │  Firestore  │    │   Storage   │
   │LangGraph│          │  (metadata) │    │  (files)    │
   │Workflow │          └─────────────┘    └─────────────┘
   └────┬────┘
        │ Tool calls
   ┌────▼─────────────────────────┐
   │  Execution Provider          │
   │  (workspace isolation)       │
   │  create/start/stop/execute   │
   └──────────────────────────────┘
```

## Component Responsibilities

### Frontend (Next.js)

**Location:** `frontend/`

- Server-side rendered pages and client components
- Firebase Authentication (client SDK)
- Dashboard, project listing, project creation
- Project workspace UI (agent chat, preview, files, logs)
- Design Studio (Sandpack prototype preview)
- Settings and integrations management
- Responsive layout following Obsidian Cyan Precision design system
- Communicates with backend via REST API and WebSocket

**Does NOT:**
- Call LLM APIs directly
- Access Firestore admin SDK
- Execute generated project code
- Store secrets

### Backend (FastAPI)

**Location:** `backend/`

- Firebase token verification middleware
- Project CRUD operations
- Agent session management and gateway
- WebSocket proxy for real-time agent updates
- File storage operations (upload/download/ZIP)
- Workspace lifecycle management
- Provider adapter orchestration
- GitHub OAuth and integration
- Deployment orchestration
- Rate limiting, input validation, authorization

### Agent (LangGraph)

**Location:** `agent/`

- LangGraph workflow graph definition
- Workflow state model
- Stage-specific node implementations
- Tool registry and validation
- LLM provider abstraction (Gemini primary)
- Requirement analysis and structuring
- Design specification generation
- Code generation and editing
- Testing orchestration
- Error analysis and repair
- Checkpointing and state persistence

### Shared Contracts

**Location:** `shared/`

- TypeScript types (for frontend)
- Pydantic models (for backend/agent)
- API endpoint definitions
- Project status enums
- Error codes
- Shared constants

## Key Architectural Patterns

### Provider Abstraction

Every external service is accessed through an abstract interface:

```python
# Example pattern
class LLMProvider(ABC):
    async def generate(self, prompt, config) -> LLMResponse: ...
    async def stream(self, prompt, config) -> AsyncIterator[str]: ...

class GeminiProvider(LLMProvider): ...
class OpenAIProvider(LLMProvider): ...  # future
```

Providers include:
- **LLM Provider** — Gemini (default), future: OpenAI, Anthropic
- **Execution Provider** — Local process (MVP), future: managed sandboxes
- **Storage Provider** — Local filesystem (MVP), future: S3-compatible
- **Design Provider** — Gemini-based (default), future: Stitch adapter
- **Deployment Provider** — Vercel, Render adapters
- **VCS Provider** — GitHub adapter

### Authentication Flow

```
Browser → Firebase Auth (client SDK) → ID Token
Browser → Backend API (ID Token in Authorization header)
Backend → Firebase Admin SDK → Verify token → Extract user_id
Backend → Check project ownership → Process request
```

### Agent Communication

```
Frontend ←WebSocket→ Backend ←Direct call→ LangGraph Agent
                                              ↓
                                         Tool execution
                                              ↓
                                      Execution Provider
```

The backend acts as a gateway:
1. Frontend sends user message via WebSocket
2. Backend authenticates and authorizes
3. Backend invokes the LangGraph agent
4. Agent streams updates back through the WebSocket
5. Agent tool calls execute through the backend's provider layer

### Project Isolation

Each generated website project has:
- Unique project ID
- Dedicated filesystem directory (workspace)
- Isolated process space
- Separate environment variables
- Independent Git history
- Own preview URL binding

## Data Flow

### Project Creation Flow
```
User → Create Project form → Backend API → Firestore (project doc)
                                         → Storage (workspace dir)
                                         → Git init
```

### Agent Workflow Flow
```
User message → Backend → LangGraph invoke/resume
LangGraph → [Analyze] → [Clarify] → [Stack] → [Design?]
         → [Configure] → [Plan] → [Approve]
         → [Generate] → [Install] → [Build] → [Test]
         → [Preview] → Complete
```

### File Storage Strategy

| Data Type | Storage | Reason |
|-----------|---------|--------|
| User profiles | Firestore | Structured, small |
| Project metadata | Firestore | Structured, queryable |
| Conversation history | Firestore | Structured, resumable |
| Agent state checkpoints | SQLite | LangGraph compatibility |
| Project source files | Local filesystem / S3 | Large, file-oriented |
| ZIP archives | Local filesystem / S3 | Binary blobs |
| Design assets | Local filesystem / S3 | Binary blobs |
| Preview screenshots | Local filesystem / S3 | Binary blobs |
