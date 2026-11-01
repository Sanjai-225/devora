"""Phase 5 Automated Tests — Workspace & Execution.

Verifies:
1. Isolated workspace creation, scaffold files, and cross-project directory isolation.
2. Process lifecycle (start, PID tracking, port allocation, restart, stop, cleanup).
3. Path traversal prevention (`../`, absolute paths, null bytes, backslash traversal).
4. Command execution with timeout enforcement, dangerous command blocking, and secret redaction.
"""

import asyncio
import sys
import tempfile
import types
import unittest
from pathlib import Path

# Ensure repo root and backend are importable
REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
for p in (str(REPO_ROOT), str(BACKEND_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    import pydantic  # noqa: F401
except ImportError:
    pydantic_mod = types.ModuleType("pydantic")

    def Field(default=..., default_factory=None, **kwargs):
        if default_factory is not None:
            return default_factory()
        return None if default is Ellipsis else default

    class BaseModel:
        def __init__(self, **kwargs):
            for cls in reversed(self.__class__.__mro__):
                if cls is object:
                    continue
                for k, v in cls.__dict__.items():
                    if not k.startswith("_") and not callable(v) and not isinstance(v, (classmethod, staticmethod)):
                        setattr(self, k, v.copy() if isinstance(v, (list, dict)) else v)
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self):
            return {k: v for k, v in self.__dict__.items() if not k.startswith("_")}

    pydantic_mod.BaseModel = BaseModel  # type: ignore[attr-defined]
    pydantic_mod.Field = Field  # type: ignore[attr-defined]
    sys.modules["pydantic"] = pydantic_mod

from app.providers.local_process_manager import (
    LocalProcessManager,
    PathTraversalError,
)


class TestPhase5WorkspaceExecution(unittest.TestCase):
    """Test suite for Phase 5 ExecutionProvider and LocalProcessManager."""

    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(prefix="devora_test_ws_")
        self.manager = LocalProcessManager(
            workspaces_root=self.temp_dir.name,
            port_start=4500,
            port_end=4599,
        )

    def tearDown(self) -> None:
        # Ensure any test processes are stopped before cleaning temp directory
        for pid_key in list(self.manager._processes.keys()):
            asyncio.run(self.manager.stop_workspace(pid_key))
        self.temp_dir.cleanup()

    def test_workspace_creation_and_isolation(self) -> None:
        """Each project receives its own isolated directory and cannot see other projects' files."""

        async def _run() -> None:
            status_a = await self.manager.create_workspace(
                "proj-alpha-01", project_name="Alpha Analytics"
            )
            status_b = await self.manager.create_workspace(
                "proj-beta-02", project_name="Beta Commerce"
            )

            self.assertNotEqual(status_a.workspace_path, status_b.workspace_path)
            self.assertTrue(status_a.files_count >= 5)
            self.assertTrue(status_b.files_count >= 5)

            # Write a custom file only in Project Alpha
            await self.manager.write_file(
                "proj-alpha-01",
                "src/custom-alpha.ts",
                "export const ALPHA_ONLY = true;\n",
            )
            alpha_content = await self.manager.read_file(
                "proj-alpha-01", "src/custom-alpha.ts"
            )
            self.assertIn("ALPHA_ONLY", alpha_content)

            # Project Beta must not have Project Alpha's file
            with self.assertRaises(FileNotFoundError):
                await self.manager.read_file("proj-beta-02", "src/custom-alpha.ts")

        asyncio.run(_run())

    def test_process_lifecycle_and_port_allocation(self) -> None:
        """Workspace starts with a real OS PID and port, restarts with a new PID, and stops cleanly."""

        async def _run() -> None:
            pid_id = "proj-lifecycle-01"
            await self.manager.create_workspace(pid_id, project_name="Lifecycle App")

            started = await self.manager.start_workspace(pid_id)
            self.assertEqual(started.status, "running")
            self.assertIsNotNone(started.pid)
            self.assertIsNotNone(started.allocated_port)
            self.assertTrue(4500 <= (started.allocated_port or 0) <= 4599)
            first_pid = started.pid

            restarted = await self.manager.restart_workspace(pid_id)
            self.assertEqual(restarted.status, "running")
            self.assertIsNotNone(restarted.pid)
            self.assertNotEqual(first_pid, restarted.pid)

            stopped = await self.manager.stop_workspace(pid_id)
            self.assertEqual(stopped.status, "stopped")
            self.assertIsNone(stopped.pid)
            self.assertIsNone(stopped.allocated_port)

            destroyed = await self.manager.destroy_workspace(pid_id)
            self.assertTrue(destroyed)

        asyncio.run(_run())

    def test_path_traversal_prevention(self) -> None:
        """All path traversal vectors (.., absolute paths, null bytes, backslashes) raise PathTraversalError."""

        async def _run() -> None:
            pid_id = "proj-security-01"
            await self.manager.create_workspace(pid_id)

            malicious_paths = [
                "../secret.txt",
                "../../etc/passwd",
                "src/../../../etc/hosts",
                "/etc/passwd",
                "~/.ssh/id_rsa",
                "..\\..\\windows\\system32",
                "src/app/page.tsx\x00.txt",
            ]
            for bad_path in malicious_paths:
                with self.assertRaises(PathTraversalError, msg=f"Failed to block {bad_path!r}"):
                    await self.manager.read_file(pid_id, bad_path)

                with self.assertRaises(PathTraversalError, msg=f"Failed to block write {bad_path!r}"):
                    await self.manager.write_file(pid_id, bad_path, "malicious")

            # Also verify invalid project_id traversal is blocked
            with self.assertRaises(PathTraversalError):
                await self.manager.create_workspace("../escape-project")

        asyncio.run(_run())

    def test_command_execution_timeout_and_secret_redaction(self) -> None:
        """Commands execute in workspace, enforce timeouts, block dangerous commands, and redact secrets."""

        async def _run() -> None:
            pid_id = "proj-exec-01"
            await self.manager.create_workspace(pid_id)

            # 1. Normal command with secret redaction
            secret_val = "super_secret_db_token_998877"
            res = await self.manager.execute_command(
                pid_id,
                command="echo $MY_SECRET_TOKEN",
                timeout_seconds=10,
                env_vars={"MY_SECRET_TOKEN": secret_val},
                redact_secrets=[secret_val],
            )
            self.assertEqual(res.exit_code, 0)
            self.assertFalse(res.timed_out)
            self.assertNotIn(secret_val, res.stdout)
            self.assertIn("[REDACTED_SECRET]", res.stdout)

            # 2. Command timeout enforcement
            timeout_res = await self.manager.execute_command(
                pid_id,
                command="python3 -c 'import time; time.sleep(5)'",
                timeout_seconds=1,
            )
            self.assertTrue(timeout_res.timed_out)
            self.assertEqual(timeout_res.exit_code, -1)

            # 3. Dangerous command blocking
            with self.assertRaises(PermissionError):
                await self.manager.execute_command(pid_id, command="rm -rf /")

            # 4. Verify runtime logs captured the executions
            logs = await self.manager.get_logs(pid_id)
            self.assertTrue(len(logs) >= 3)

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
