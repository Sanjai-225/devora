"""Phase 6 Automated Tests — Code Generation, Surgical Incremental Editing & Git Checkpoints.

Verifies:
1. WorkspaceToolRegistry (create, read, write, delete, list, search, command, install_dependencies, run_build)
2. Full project code generation (simple portfolio site + initial Git checkpoint)
3. Surgical incremental modification (modifies targeted file only, leaves other files untouched, returns unified diff)
4. Git checkpoint creation, listing, and rollback restoration
5. Phase 6 FastAPI REST endpoints including explicit Deployment Confirmation gate
"""

import pytest
from fastapi.testclient import TestClient

from agent.tools.workspace_tools import WorkspaceToolRegistry
from agent.workflow.codegen_nodes import (
    apply_incremental_edit,
    create_git_checkpoint,
    generate_project_code,
    list_git_checkpoints,
    restore_git_checkpoint,
)
from app.main import app
from app.providers.local_process_manager import LocalProcessManager


@pytest.mark.asyncio
async def test_workspace_tool_registry_file_and_command_tools(tmp_path):
    """Verify WorkspaceToolRegistry file tools (create, read, write, delete, list, search) and command tools."""
    manager = LocalProcessManager(
        workspaces_root=str(tmp_path / "workspaces"),
        port_start=4600,
        port_end=4620,
    )
    tools = WorkspaceToolRegistry(provider=manager)
    project_id = "proj-phase6-tools"

    await manager.create_workspace(project_id, project_name="Portfolio Demo")

    # 1. Tool definitions registry check
    defs = tools.get_tool_definitions()
    tool_names = {d["name"] for d in defs}
    assert {
        "create_file",
        "read_file",
        "write_file",
        "delete_file",
        "list_files",
        "search_files",
        "run_command",
        "install_dependencies",
        "run_build",
    }.issubset(tool_names)

    # 2. create_file & read_file
    created = await tools.create_file(
        project_id,
        "src/components/bio-card.tsx",
        "export const BioCard = () => <div>Principal Systems Architect</div>;\n",
    )
    assert created.path == "src/components/bio-card.tsx"
    content = await tools.read_file(project_id, "src/components/bio-card.tsx")
    assert "Principal Systems Architect" in content

    # 3. search_files
    matches = await tools.search_files(project_id, "Principal Systems")
    assert len(matches) == 1
    assert matches[0].path == "src/components/bio-card.tsx"
    assert matches[0].line_number == 1

    # 4. install_dependencies & run_build
    dep_res = await tools.install_dependencies(project_id, ["framer-motion", "lucide-react"])
    assert dep_res.exit_code == 0
    pkg_json = await tools.read_file(project_id, "package.json")
    assert "framer-motion" in pkg_json

    build_res = await tools.run_build(project_id)
    assert build_res.exit_code == 0
    assert "Compiled" in build_res.stdout

    # 5. delete_file
    deleted = await tools.delete_file(project_id, "src/components/bio-card.tsx")
    assert deleted is True


@pytest.mark.asyncio
async def test_full_project_generation_and_incremental_surgical_edit(tmp_path):
    """Verify full portfolio generation followed by surgical incremental modification without regenerating untouched files."""
    manager = LocalProcessManager(
        workspaces_root=str(tmp_path / "workspaces"),
        port_start=4621,
        port_end=4640,
    )
    project_id = "proj-phase6-portfolio"

    # 1. Full project code generation
    gen_res = await generate_project_code(
        project_id=project_id,
        project_name="Apex Systems Portfolio",
        template_type="portfolio",
        provider=manager,
    )
    assert gen_res.build_passed is True
    assert "src/app/page.tsx" in gen_res.files_created
    assert "src/components/hero-section.tsx" in gen_res.files_created
    assert "src/components/projects-grid.tsx" in gen_res.files_created
    assert "src/components/contact-section.tsx" in gen_res.files_created
    assert gen_res.checkpoint is not None
    assert len(gen_res.checkpoint.short_sha) >= 7

    # Record untouched file content before incremental edit
    contact_before = await manager.read_file(project_id, "src/components/contact-section.tsx")

    # 2. Surgical incremental edit targeting hero-section.tsx
    edit_res = await apply_incremental_edit(
        project_id=project_id,
        prompt="Update hero headline with CSV export action",
        target_files=["src/components/hero-section.tsx"],
        provider=manager,
    )
    assert edit_res.files_modified == ["src/components/hero-section.tsx"]
    assert edit_res.files_untouched_count >= 5
    assert len(edit_res.file_diffs) == 1
    assert edit_res.file_diffs[0].added_lines >= 1
    assert "[Devora Incremental Edit]" in edit_res.file_diffs[0].unified_diff

    # Confirm untouched files were NOT regenerated or altered
    contact_after = await manager.read_file(project_id, "src/components/contact-section.tsx")
    assert contact_before == contact_after


@pytest.mark.asyncio
async def test_git_checkpoint_creation_and_restore(tmp_path):
    """Verify creating Git checkpoints and restoring workspace files to an earlier commit SHA."""
    manager = LocalProcessManager(
        workspaces_root=str(tmp_path / "workspaces"),
        port_start=4641,
        port_end=4660,
    )
    project_id = "proj-phase6-git"
    await generate_project_code(
        project_id=project_id,
        project_name="Git Rollback Demo",
        provider=manager,
    )

    # Read original hero-section.tsx and create an explicit v1 checkpoint
    original_hero = await manager.read_file(project_id, "src/components/hero-section.tsx")
    chk_v1 = await create_git_checkpoint(
        project_id=project_id,
        message="Baseline v1 before experimental edit",
        tag="v1.0-baseline",
        provider=manager,
    )

    # Modify hero-section.tsx and create v2 checkpoint
    await manager.write_file(
        project_id,
        "src/components/hero-section.tsx",
        "// EXPERIMENTAL OVERWRITE\nexport function HeroSection() { return null; }\n",
    )
    chk_v2 = await create_git_checkpoint(
        project_id=project_id,
        message="Experimental overwrite v2",
        tag="v2.0-exp",
        provider=manager,
    )
    assert chk_v1.commit_sha != chk_v2.commit_sha

    modified_hero = await manager.read_file(project_id, "src/components/hero-section.tsx")
    assert "EXPERIMENTAL OVERWRITE" in modified_hero

    # List checkpoints
    history = await list_git_checkpoints(project_id, provider=manager)
    assert len(history) >= 2

    # Restore back to chk_v1
    restored_chk = await restore_git_checkpoint(
        project_id=project_id,
        commit_sha=chk_v1.commit_sha,
        provider=manager,
    )
    assert restored_chk.tag == "rollback"

    restored_hero = await manager.read_file(project_id, "src/components/hero-section.tsx")
    assert restored_hero == original_hero


def test_phase6_workspace_codegen_and_deploy_confirm_endpoints():
    """Verify Phase 6 FastAPI endpoints for code generation, surgical edit, search, checkpoints, and deployment confirmation."""
    client = TestClient(app)
    headers = {"Authorization": "Bearer dev-token"}
    project_id = "proj-phase6-api"

    # 1. Generate full project code
    gen_resp = client.post(
        f"/api/v1/projects/{project_id}/workspace/generate",
        json={"template_type": "portfolio"},
        headers=headers,
    )
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    assert gen_data["build_passed"] is True
    assert "src/app/page.tsx" in gen_data["files_created"]
    assert gen_data["checkpoint"]["short_sha"]

    # 2. Search across workspace files
    search_resp = client.get(
        f"/api/v1/projects/{project_id}/workspace/search?q=Featured",
        headers=headers,
    )
    assert search_resp.status_code == 200
    matches = search_resp.json()
    assert len(matches) >= 1

    # 3. Surgical incremental edit
    edit_resp = client.post(
        f"/api/v1/projects/{project_id}/workspace/edit",
        json={
            "prompt": "Add CSV export button to projects section",
            "target_files": ["src/components/projects-grid.tsx"],
        },
        headers=headers,
    )
    assert edit_resp.status_code == 200
    edit_data = edit_resp.json()
    assert edit_data["files_modified"] == ["src/components/projects-grid.tsx"]
    assert edit_data["files_untouched_count"] >= 4

    # 4. List Git checkpoints
    chk_resp = client.get(
        f"/api/v1/projects/{project_id}/workspace/checkpoints",
        headers=headers,
    )
    assert chk_resp.status_code == 200
    checkpoints = chk_resp.json()
    assert len(checkpoints) >= 2

    # 5. Deployment Confirmation gate: rejects unconfirmed requests, accepts confirmed requests
    unconfirmed_resp = client.post(
        f"/api/v1/projects/{project_id}/workspace/deploy-confirm",
        json={"user_confirmed": False, "target_branch": "testing"},
        headers=headers,
    )
    assert unconfirmed_resp.status_code == 400

    confirmed_resp = client.post(
        f"/api/v1/projects/{project_id}/workspace/deploy-confirm",
        json={"user_confirmed": True, "target_branch": "testing"},
        headers=headers,
    )
    assert confirmed_resp.status_code == 200
    confirm_data = confirmed_resp.json()
    assert confirm_data["user_confirmed"] is True
    assert confirm_data["ready_for_deploy"] is True
    assert confirm_data["estimated_monthly_cost_usd"] == 0.0

    # Clean up workspace
    client.delete(f"/api/v1/projects/{project_id}/workspace", headers=headers)
