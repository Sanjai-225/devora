# Known Limitations — Devora

## L001: MVP Process Isolation Is Not Production-Grade

**Severity:** Medium
**Phase:** 5 (Workspace & Execution)
**Status:** Accepted for MVP

The Local Process Manager provides process-level isolation with directory scoping, but it does not provide the same security guarantees as containerized or VM-based isolation. A sophisticated generated application could theoretically access other processes' memory or system resources.

**Mitigation:** Keep the ExecutionProvider interface replaceable. Document the limitation. Upgrade to E2B or Fly.io Machines before multi-tenant production deployment.

---

## L002: Single-Server Architecture

**Severity:** Low (for MVP)
**Phase:** 5
**Status:** Accepted for MVP

All workspaces run on the same server. This limits scale and creates a single point of failure.

**Mitigation:** Provider abstraction enables horizontal scaling in the future.

---

## L003: No Network Egress Control for Generated Projects

**Severity:** Low
**Phase:** 5
**Status:** Accepted for MVP

Generated projects can make outbound network requests without restriction. The platform cannot prevent a generated website from calling external APIs.

**Mitigation:** Acceptable for user-owned projects. Document in security model.

---

## L004: Sandpack Cannot Run Full-Stack Applications

**Severity:** Info
**Phase:** 3
**Status:** By Design

Sandpack is used only for frontend prototypes in the Design Studio. It cannot run Python backends, connect to real databases, or serve on real network ports.

**Mitigation:** Full-stack previews use the Local Process Manager (Tier 2). Design prototypes use mock data.

---

## L005: LangGraph SQLite Checkpointer — Single-Server

**Severity:** Low (for MVP)
**Phase:** 2
**Status:** Accepted for MVP

SQLite-based checkpointing requires the agent to run on the same server as the checkpoint database file. This prevents horizontal scaling of the agent.

**Mitigation:** Upgrade path to PostgreSQL checkpointer for multi-server deployment.

---

## L006: Google Stitch Integration — Not Yet Available

**Severity:** Low
**Phase:** 3
**Status:** Deferred

The Stitch design generation API is not available as a stable, officially supported service. The design system is implemented from the Stitch-generated reference screens, but live Stitch API integration is deferred.

**Mitigation:** Gemini-based design generation is the primary path. Stitch adapter is behind a provider interface and can be implemented when API access is confirmed.

---

## L007: Gemini API Key Required

**Severity:** Info
**Phase:** 2
**Status:** By Design

The Devora platform requires a Gemini API key to power its agent. This is a platform configuration requirement, not exposed to generated projects.

**Mitigation:** Free tier available. User can self-provide via settings. Provider abstraction supports alternative LLMs.

