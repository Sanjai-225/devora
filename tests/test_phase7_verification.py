"""Phase 7 Automated Tests — Testing, Build Verification & Bounded Self-Repair Loop.

Verifies:
1. Clean project verification (`check_build`, `inspect_errors`, `run_tests`, `run_verification_and_repair_loop`)
2. Error detection (`analyze_workspace_errors`) and surgical auto-repair with Git checkpointing (`repair-a1`) while leaving untouched files intact
3. Bounded self-repair loop termination strictly capped at MAX_REPAIR_ATTEMPTS (3) when an unfixable error persists
4. Phase 7 FastAPI REST endpoints (`POST /verify` and `POST /repair`)
"""

import pytest
from fastapi.testclient import TestClient

from agent.tools.workspace_tools import WorkspaceToolRegistry
from agent.workflow.codegen_nodes import generate_project_code
from agent.workflow.verification_nodes import (
    MAX_REPAIR_ATTEMPTS,
    analyze_workspace_errors,
    run_verification_and_repair_loop,
)
from app.main import app
from app.providers.local_process_manager import LocalProcessManager


@pytest.mark.asyncio
async def test_verification_passes_on_clean_generated_project(tmp_path):
    """Verify check_build, inspect_errors, run_tests, and verification loop pass on a clean generated project."""
    manager = LocalProcessManager(
        workspaces_root=str(tmp_path / "workspaces"),
        port_start=4700,
        port_end=4720,
    )
    tools = WorkspaceToolRegistry(provider=manager)
    project_id = "proj-phase7-clean"

    # 1. Generate full multi-page project
    gen_res = await generate_project_code(
        project_id=project_id,
        project_name="Novastride Fleet",
        template_type="portfolio",
        provider=manager,
    )
    assert gen_res.build_passed is True
    assert len(tools.get_tool_definitions()) == 12

    # 2. Run check_build directly
    build_res = await tools.check_build(project_id)
    assert build_res.passed is True
    assert build_res.exit_code == 0
    assert build_res.checked_files_count >= 5

    # 3. Run inspect_errors directly
    errors_res = await tools.inspect_errors(project_id)
    assert errors_res == []

    # 4. Run Playwright smoke test suite directly
    smoke_res = await tools.run_tests(project_id)
    assert smoke_res.passed is True
    assert smoke_res.total_tests == 4
    assert smoke_res.passed_tests == 4
    assert smoke_res.failed_tests == 0

    # 5. Run full verification loop
    report = await run_verification_and_repair_loop(
        project_id=project_id,
        auto_repair=True,
        max_attempts=3,
        provider=manager,
    )
    assert report.overall_status == "passed"
    assert report.repair_attempts == 0
    assert len(report.repair_history) == 0
    assert report.build_check.passed is True
    assert report.test_suite.passed is True


@pytest.mark.asyncio
async def test_error_detection_and_surgical_auto_repair(tmp_path):
    """Verify injected syntax/JSON errors are detected, diagnosed, and surgically auto-repaired with a Git checkpoint."""
    manager = LocalProcessManager(
        workspaces_root=str(tmp_path / "workspaces"),
        port_start=4721,
        port_end=4740,
    )
    tools = WorkspaceToolRegistry(provider=manager)
    project_id = "proj-phase7-repair"

    await generate_project_code(
        project_id=project_id,
        project_name="Novastride Fleet",
        provider=manager,
    )

    # Capture an untouched file before injecting an error into src/app/page.tsx
    untouched_before = await tools.read_file(project_id, "src/components/contact-section.tsx")

    # Inject a deliberate syntax error into src/app/page.tsx
    broken_code = (
        await tools.read_file(project_id, "src/app/page.tsx")
        + "\n// Deliberate broken token: SYNTAX_ERROR\n"
    )
    await tools.write_file(project_id, "src/app/page.tsx", broken_code)

    # Verify check_build catches the error
    failed_build = await tools.check_build(project_id)
    assert failed_build.passed is False
    assert failed_build.exit_code == 1
    assert "src/app/page.tsx" in failed_build.broken_files

    # Verify error analysis diagnoses the root cause and affected file
    failed_smoke = await tools.run_tests(project_id)
    assert failed_smoke.passed is False
    console_errs = await tools.inspect_errors(project_id)
    assert len(console_errs) >= 1

    analysis = await analyze_workspace_errors(
        project_id=project_id,
        provider=manager,
    )
    assert analysis.has_errors is True
    assert "src/app/page.tsx" in analysis.affected_files

    # Run bounded verification & auto-repair loop
    report = await run_verification_and_repair_loop(
        project_id=project_id,
        auto_repair=True,
        max_attempts=3,
        provider=manager,
    )
    assert report.overall_status == "repaired"
    assert report.repair_attempts == 1
    assert len(report.repair_history) == 1
    assert report.repair_history[0].build_passed_after is True
    assert report.repair_history[0].tests_passed_after is True
    assert "src/app/page.tsx" in report.repair_history[0].files_repaired
    assert report.build_check.passed is True
    assert report.test_suite.passed is True

    # Verify untouched files were not modified by surgical repair
    untouched_after = await tools.read_file(project_id, "src/components/contact-section.tsx")
    assert untouched_before == untouched_after


@pytest.mark.asyncio
async def test_bounded_repair_loop_terminates_at_max_3_attempts(tmp_path):
    """Verify the self-repair loop is strictly bounded at MAX_REPAIR_ATTEMPTS (3) even when an unfixable error persists."""
    manager = LocalProcessManager(
        workspaces_root=str(tmp_path / "workspaces"),
        port_start=4741,
        port_end=4760,
    )
    tools = WorkspaceToolRegistry(provider=manager)
    project_id = "proj-phase7-bounded"

    await generate_project_code(
        project_id=project_id,
        project_name="Novastride Fleet",
        provider=manager,
    )

    # Inject an unfixable error marker alongside SYNTAX_ERROR
    unfixable_code = (
        await tools.read_file(project_id, "src/app/page.tsx")
        + "\n// UNFIXABLE_ERROR SYNTAX_ERROR\n"
    )
    await tools.write_file(project_id, "src/app/page.tsx", unfixable_code)

    # Even if caller passes max_attempts=10, loop MUST cap at MAX_REPAIR_ATTEMPTS (3)
    report = await run_verification_and_repair_loop(
        project_id=project_id,
        auto_repair=True,
        max_attempts=10,
        provider=manager,
    )
    assert report.max_repair_attempts == MAX_REPAIR_ATTEMPTS == 3
    assert report.repair_attempts == 3
    assert len(report.repair_history) == 3
    assert report.overall_status == "failed"
    assert all(attempt.build_passed_after is False for attempt in report.repair_history)


def test_phase7_workspace_verify_and_repair_api_endpoints():
    """Verify FastAPI /verify and /repair endpoints return structured VerificationReportResponse."""
    client = TestClient(app)
    headers = {"Authorization": "Bearer dev-token"}
    project_id = "proj-api-phase7"

    # 1. Generate project first
    gen_resp = client.post(
        f"/api/v1/projects/{project_id}/workspace/generate",
        headers=headers,
        json={"template_type": "portfolio"},
    )
    assert gen_resp.status_code == 200

    # 2. Verify clean workspace via POST /verify
    verify_resp = client.post(
        f"/api/v1/projects/{project_id}/workspace/verify",
        headers=headers,
        json={"auto_repair": False},
    )
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()
    assert v_data["overall_status"] == "passed"
    assert v_data["build_check"]["passed"] is True
    assert v_data["test_suite"]["passed"] is True
    assert v_data["test_suite"]["passed_tests"] == 4

    # 3. Trigger POST /repair endpoint
    repair_resp = client.post(
        f"/api/v1/projects/{project_id}/workspace/repair",
        headers=headers,
        json={"max_attempts": 3},
    )
    assert repair_resp.status_code == 200
    r_data = repair_resp.json()
    assert r_data["overall_status"] in ("passed", "repaired")
    assert r_data["max_repair_attempts"] == 3

    # Clean up workspace
    client.delete(f"/api/v1/projects/{project_id}/workspace", headers=headers)
