# Security — Devora

## Threat Model

### Actors
1. **Authenticated user** — Legitimate user with an account
2. **Other authenticated user** — Another legitimate user (cross-tenant threat)
3. **Generated code** — Untrusted code produced by the AI agent
4. **External attacker** — Unauthenticated actor

### Critical Assets
1. Platform secrets (Firebase keys, Gemini API key, OAuth secrets)
2. User credentials and tokens
3. User project source code
4. User-provided API keys for generated websites
5. Platform infrastructure integrity

### Threat Categories

#### T1: Cross-Project Data Access
**Risk:** User A accesses User B's project files or configuration.
**Mitigations:**
- Every API endpoint checks `project.userId == request.userId`
- Workspace paths are scoped: `workspaces/{userId}/{projectId}/`
- Firestore security rules enforce owner-only access
- Preview URLs include project-scoped tokens

#### T2: Secret Leakage
**Risk:** API keys, passwords, or tokens are exposed.
**Mitigations:**
- Secrets stored server-side only, never in Firestore documents
- Frontend receives masked display values only
- Secrets excluded from ZIP exports
- Secrets excluded from Git commits
- Secrets redacted from log output
- LLM prompts avoid including raw secrets
- Generated `.env` files use placeholder values in exports

#### T3: Generated Code Escape
**Risk:** AI-generated code accesses platform resources or other projects.
**Mitigations:**
- Each workspace runs in a separate process
- Workspace processes have no access to platform environment variables
- File operations are scoped to the project directory
- Command execution is restricted to the workspace directory
- Network access is limited (MVP: local-only binding)
- CPU/memory limits where the execution provider supports them
- Execution timeouts prevent runaway processes

#### T4: Prompt Injection
**Risk:** User crafts input that makes the agent perform unauthorized actions.
**Mitigations:**
- Tool registry is explicit — agent cannot invent tools
- All tool inputs are validated with Pydantic
- File paths are validated to prevent directory traversal
- Commands are restricted to an allowlist of safe operations
- Workspace scope is enforced at the tool level, not just the prompt level

#### T5: Authentication Bypass
**Risk:** Unauthenticated access to protected resources.
**Mitigations:**
- Firebase ID token verification on every backend request
- Token expiration enforcement
- No anonymous access to project APIs
- CORS restricted to frontend origin

#### T6: Resource Exhaustion
**Risk:** User or generated code consumes excessive resources.
**Mitigations:**
- Rate limiting on API endpoints
- Per-user project count limits
- Execution timeouts on all commands
- Process cleanup on timeout/failure
- Build output size limits

## Authentication Architecture

```
┌──────────┐    Firebase Auth    ┌──────────┐
│ Browser  │◄───────────────────►│ Firebase │
│ (Client) │    (ID tokens)      │ Auth     │
└────┬─────┘                     └──────────┘
     │ Authorization: Bearer <id_token>
┌────▼─────┐    Verify token     ┌──────────┐
│ Backend  │────────────────────►│ Firebase │
│ (FastAPI)│    (Admin SDK)      │ Admin    │
└────┬─────┘                     └──────────┘
     │ user_id from verified token
     ▼
  Business logic with user_id context
```

## Authorization Rules

| Resource | Rule |
|----------|------|
| User profile | Owner only |
| Project CRUD | Owner only |
| Project files | Owner only |
| Workspace operations | Owner only |
| Agent sessions | Owner only |
| Integrations | Owner only |
| Settings | Owner only |
| Preview access | Owner only (MVP) |
| ZIP download | Owner only |
| Deployment | Owner only + explicit approval |
| GitHub push | Owner only + explicit approval |

## Secret Management

### Platform Secrets (Devora's own)
- Stored in environment variables on the server
- Never sent to frontend
- Never included in generated project code
- Loaded via `.env` files (gitignored)

### User-Provided Secrets (for generated websites)
- Received via HTTPS POST
- Stored server-side in encrypted format
- Referenced by key in project configuration
- Injected into workspace environment at runtime
- Never stored in Firestore
- Never included in ZIP exports
- Masked in UI display (`sk_live_51M•••••••••`)

### Two API Key Categories

| Category | Used By | Purpose |
|----------|---------|---------|
| **Devora Agent Key** | Devora platform | Powers the AI agent (requirement analysis, code generation) |
| **Generated Website Keys** | Generated website | Powers features in the user's website (chatbot, payments, etc.) |

These are **strictly separate**. The Devora Agent Key is never exposed to generated projects.

## Input Validation

- All backend endpoints use Pydantic models for request validation
- File paths validated against directory traversal (`../`, absolute paths)
- Command inputs validated against allowlist
- Project names sanitized for filesystem safety
- Content size limits on all uploads

## Rate Limiting

| Endpoint Category | Limit |
|-------------------|-------|
| Authentication | 10/min per IP |
| Project creation | 5/min per user |
| Agent interactions | 30/min per user |
| File operations | 60/min per user |
| ZIP download | 5/min per user |

## Logging & Audit

- Authentication events logged
- Project creation/deletion logged
- Deployment operations logged
- Secret access logged (access only, not values)
- Agent tool invocations logged
- Failed authorization attempts logged
- All logs redact secret values
