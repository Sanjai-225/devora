# Execution Infrastructure — Devora

## Requirements

Generated websites are **untrusted code**. The execution infrastructure must:

1. Isolate each project from other projects
2. Isolate projects from platform secrets
3. Provide a preview URL per project
4. Support starting/stopping project processes
5. Enforce resource limits (CPU, memory, time)
6. Restrict filesystem access to project directory
7. Handle process lifecycle (start, stop, restart, cleanup)
8. Work without Docker

## Options Evaluated

### Option A: Docker Containers
- ❌ **Eliminated** — Project requirement prohibits Docker

### Option B: WebContainers (StackBlitz)
- Browser-based Node.js runtime
- Runs entirely in the browser via WebAssembly
- ✅ No server-side infrastructure needed
- ✅ Built-in filesystem isolation
- ❌ Cannot run Python/backend code
- ❌ No true network server — can't serve to external URLs
- ❌ Limited to Node.js ecosystem
- ⚠️ Only suitable for frontend-only prototypes
- **Verdict:** Could supplement Sandpack for frontend previews, but cannot replace full-stack execution

### Option C: Sandpack (CodeSandbox)
- Browser-based React component for code previews
- ✅ Excellent for frontend prototypes
- ✅ No server infrastructure needed
- ❌ Cannot run arbitrary full-stack applications
- ❌ No real backend process
- ❌ No database connections
- **Verdict:** Use for Design Studio prototypes only

### Option D: E2B (e2b.dev) — Cloud Sandboxes
- Managed cloud sandboxes with full Linux environment
- ✅ Full filesystem, process control, network
- ✅ API for creating/managing sandboxes
- ✅ No Docker required from our side
- ⚠️ Free tier: limited sandbox hours/month
- ⚠️ Paid beyond free tier
- ⚠️ Vendor dependency
- **Verdict:** Strong candidate for future full-stack execution provider

### Option E: Local Process Isolation (MVP)
- Run generated projects as child processes on the same server
- Use OS-level user permissions and directory scoping
- ✅ No external dependencies
- ✅ No cost
- ✅ Full control
- ⚠️ Weaker isolation than containers
- ⚠️ Requires careful process management
- ⚠️ Single-server limitation
- **Mitigations:** Directory scoping, separate process user, env var isolation, timeout enforcement
- **Verdict:** Practical for MVP with documented limitations

### Option F: Fly.io Machines
- Lightweight VMs spun up per project
- ✅ Strong isolation (actual VMs)
- ✅ API-driven lifecycle management
- ⚠️ Costs per machine-second
- ⚠️ Free tier is limited
- **Verdict:** Good upgrade path from local process isolation

## Selected Architecture (MVP)

### Two-tier approach:

**Tier 1: Frontend Prototypes (Design Studio)**
- **Provider:** Sandpack
- **Scope:** React/TypeScript frontend previews
- **Isolation:** Browser sandbox (inherently isolated)
- **Use case:** Design phase prototypes before full implementation

**Tier 2: Full-Stack Execution (Project Workspace)**
- **Provider:** Local Process Manager (MVP)
- **Scope:** Full project execution (npm start, python server, etc.)
- **Isolation:** Process-level with directory scoping
- **Use case:** Running the complete generated website

### Future upgrade path:
Local Process Manager → E2B / Fly.io Machines (when budget/scale warrants)

## ExecutionProvider Interface

```python
from abc import ABC, abstractmethod
from typing import Optional
from pydantic import BaseModel

class WorkspaceInfo(BaseModel):
    workspace_id: str
    project_id: str
    user_id: str
    workspace_path: str
    status: str  # 'created' | 'running' | 'stopped' | 'error'
    preview_url: Optional[str] = None
    preview_port: Optional[int] = None

class CommandResult(BaseModel):
    exit_code: int
    stdout: str
    stderr: str
    timed_out: bool = False

class ExecutionProvider(ABC):
    @abstractmethod
    async def create_workspace(self, project_id: str, user_id: str) -> WorkspaceInfo: ...

    @abstractmethod
    async def delete_workspace(self, workspace_id: str) -> bool: ...

    @abstractmethod
    async def start_project(self, workspace_id: str) -> WorkspaceInfo: ...

    @abstractmethod
    async def stop_project(self, workspace_id: str) -> bool: ...

    @abstractmethod
    async def restart_project(self, workspace_id: str) -> WorkspaceInfo: ...

    @abstractmethod
    async def execute_command(
        self, workspace_id: str, command: str, timeout: int = 60
    ) -> CommandResult: ...

    @abstractmethod
    async def read_file(self, workspace_id: str, path: str) -> str: ...

    @abstractmethod
    async def write_file(self, workspace_id: str, path: str, content: str) -> bool: ...

    @abstractmethod
    async def list_files(self, workspace_id: str, path: str = ".") -> list[dict]: ...

    @abstractmethod
    async def get_logs(self, workspace_id: str, lines: int = 100) -> str: ...

    @abstractmethod
    async def get_preview_url(self, workspace_id: str) -> Optional[str]: ...
```

## Local Process Manager — MVP Implementation

### Workspace Directory Structure
```
workspaces/
├── {user_id}/
│   ├── {project_id}/
│   │   ├── src/              # Generated project source
│   │   ├── node_modules/     # Dependencies (gitignored)
│   │   ├── .env              # Runtime environment (not exported)
│   │   ├── .devora/          # Devora metadata
│   │   │   ├── process.pid   # Running process PID
│   │   │   ├── port          # Assigned port
│   │   │   └── logs/         # Process logs
│   │   └── ...
```

### Isolation Measures (MVP)

| Measure | Implementation |
|---------|---------------|
| Filesystem | Validate all paths stay within workspace directory |
| Environment | Process spawned with clean env, only project-specific vars |
| Process | Tracked by PID, killed on stop/timeout |
| Port | Unique port assigned per project, bound to localhost |
| Timeout | 5-minute execution timeout, 30-minute idle timeout |
| Cleanup | Workspace deleted on project deletion |

### Known MVP Limitations

1. **Process-level isolation is weaker than VM/container isolation.** A sufficiently sophisticated generated application could theoretically access other processes' memory or files on the same OS. This is acceptable for MVP but must be upgraded for production multi-tenant deployment.

2. **Single-server limitation.** All workspaces run on the same server. This limits scale and creates a single point of failure.

3. **No network egress control.** Generated projects can make outbound network requests. MVP does not restrict this.

4. **Port management.** Ports are assigned from a pool. Port exhaustion is possible under heavy load.

These limitations are clearly documented and the `ExecutionProvider` interface makes it straightforward to swap in a managed sandbox provider (E2B, Fly.io) when needed.

