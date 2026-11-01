# Architecture Decisions — Devora

## D001: No Docker — Local Process Manager for MVP

**Date:** 2026-11-01
**Status:** Accepted
**Context:** Project requirement prohibits Docker. Generated websites need isolated execution.

**Decision:** Use a Local Process Manager for the MVP that runs generated projects as child processes with directory-scoped filesystem access and clean environment variables. Implement behind an `ExecutionProvider` interface so it can be swapped for E2B, Fly.io Machines, or another managed sandbox provider later.

**Rationale:**
- No external dependencies or costs
- Full control over process lifecycle
- Sufficient for single-developer/small-team MVP
- Provider abstraction makes upgrade straightforward

**Risks:**
- Weaker isolation than VM/container solutions
- Single-server limitation
- Must be upgraded before multi-tenant production

**Mitigations:**
- Path validation prevents directory traversal
- Clean environment prevents secret leakage
- Process timeouts prevent resource exhaustion
- Documented as known limitation

---

## D002: SQLite for LangGraph Checkpoints

**Date:** 2026-11-01
**Status:** Accepted
**Context:** LangGraph requires a checkpointer for state persistence and human-in-the-loop.

**Options considered:**
1. **PostgreSQL checkpointer** — Official support, production-grade, requires PostgreSQL instance
2. **SQLite checkpointer** — Official support, file-based, no infrastructure
3. **Custom Firestore adapter** — Would need to be built and maintained, no official support

**Decision:** Use the official `langgraph-checkpoint-sqlite` package with `AsyncSqliteSaver`.

**Rationale:**
- Officially supported by LangGraph team
- Zero infrastructure cost
- File-based — easy to set up, backup, and manage
- Sufficient for MVP (single-server deployment)
- Upgrade path to PostgreSQL is straightforward (same interface)

---

## D003: Firestore for Metadata, Filesystem for Project Files

**Date:** 2026-11-01
**Status:** Accepted
**Context:** Need to store both structured metadata and large project source files.

**Decision:**
- Firestore: User profiles, project metadata, conversations, design versions, config entries
- Local filesystem (S3-compatible adapter): Project source code, ZIP archives, assets

**Rationale:**
- Firestore is optimized for structured documents, not large file blobs
- Firestore has document size limits (1MB)
- Project files need filesystem semantics (paths, directories)
- Storage provider abstraction allows migration to S3/GCS later

---

## D004: Gemini as Primary LLM, Provider Abstraction

**Date:** 2026-11-01
**Status:** Accepted
**Context:** Need an LLM for requirement analysis, design generation, code generation.

**Decision:** Use Gemini via `google-genai` SDK as the default, wrapped in an `LLMProvider` abstraction interface.

**Rationale:**
- Gemini has generous free tier
- Good structured output support
- Large context window for code generation
- Provider abstraction allows adding OpenAI, Anthropic, etc. later

---

## D005: Sandpack for Design Prototypes Only

**Date:** 2026-11-01
**Status:** Accepted
**Context:** Need browser-based preview for the Design Studio and full-stack preview for completed websites.

**Decision:**
- Sandpack for Design Studio frontend prototypes (React/TypeScript only)
- Local Process Manager for full-stack website previews

**Rationale:**
- Sandpack cannot run arbitrary full-stack applications
- Sandpack is excellent for interactive React component previews
- Clear separation of concerns: design preview vs. production preview

---

## D006: Single LangGraph Agent with Conditional Routing

**Date:** 2026-11-01
**Status:** Accepted
**Context:** Need to handle complex multi-stage workflow (analysis → design → build → test).

**Decision:** One LangGraph `StateGraph` with conditional edges for workflow branching (design yes/no), not multiple independent agents.

**Rationale:**
- Simpler to debug and maintain
- Shared state across all stages
- Human-in-the-loop at defined breakpoints
- Conditional edges handle workflow variations cleanly
- Can be decomposed into sub-graphs later if complexity warrants

---

## D007: Design System — Obsidian Cyan Precision from Stitch

**Date:** 2026-11-01
**Status:** Accepted
**Context:** 11 Stitch-generated screen designs provided as visual reference.

**Decision:** Implement custom components matching Stitch designs exactly. Do not use external component libraries (shadcn/Radix/MUI). Build reusable primitives following the Obsidian Cyan Precision design spec.

**Rationale:**
- Stitch designs have a very specific visual language
- Custom components avoid fighting library defaults
- Design system is well-documented in DESIGN.md
- Consistent look requires custom implementation anyway

---

## D008: Geist + JetBrains Mono Typography

**Date:** 2026-11-01
**Status:** Accepted
**Context:** Stitch design system specifies Geist for UI and JetBrains Mono for code.

**Decision:** Use Geist (via `next/font/google` or local) for all UI text and JetBrains Mono for code blocks, status chips, and monospace elements.

**Rationale:**
- Both are free, open-source fonts
- Geist is designed by Vercel, excellent for developer tools
- JetBrains Mono has ligatures and is optimized for code readability
- Matches Stitch design spec exactly

---

## D009: WebSocket for Agent Communication

**Date:** 2026-11-01
**Status:** Accepted
**Context:** Agent operations are long-running and need to stream updates to the user.

**Decision:** Use WebSocket connections between frontend and backend for real-time agent communication. Backend acts as a gateway — it authenticates the WebSocket, invokes the LangGraph agent, and streams results back.

**Rationale:**
- Agent operations take seconds to minutes
- Need real-time streaming of progress, tool results, messages
- WebSocket is more efficient than polling for this use case
- Backend gateway maintains security boundary

---

## D010: Two Git Branches — main + testing

**Date:** 2026-11-01
**Status:** Accepted
**Context:** Need a development workflow that separates stable from in-progress work.

**Decision:** Use `testing` for active development, `main` for stable verified code. Only promote to `main` with explicit user confirmation.

**Rationale:**
- Prevents accidental deployment of unverified code
- Clear promotion gate
- Simple enough for a single-developer project
