"""
Phase 8 Integration Tests — Download & Project Management (Agent 2)
Tests:
1. Exporting project as a secret-safe ZIP archive (excluding .env, .env.local, .git, node_modules; generating .env.example and README.md; scrubbing inline secret tokens)
2. Verifying the exported ZIP project extracts cleanly and runs build & tests independently
3. Verifying Phase 8 FastAPI endpoints (/workspace/export/metadata, /workspace/export, and version checkpoint restore)
"""

import io
import json
import zipfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from agent.tools.workspace_tools import WorkspaceToolRegistry
from agent.workflow.codegen_nodes import generate_project_code
from app.main import app
from app.providers.local_process_manager import LocalProcessManager
from app.services.export_service import build_project_export_zip


@pytest.mark.asyncio
async def test_zip_export_excludes_secrets_and_generates_env_example_and_readme(tmp_path: Path):
    """
    Phase 8 Test 1:
    Verify that build_project_export_zip packages all safe source files, generates
    a sanitized .env.example and standalone README.md, excludes .env / .env.local /
    firebase-service-account.json, and scrubs any accidental live secret tokens.
    """
    manager = LocalProcessManager(
        workspaces_root=str(tmp_path / "workspaces"),
        port_start=4800,
        port_end=4820,
    )
    project_id = "proj-phase8-secret-safe"
    await generate_project_code(
        project_id=project_id,
        project_name="Novastride Fleet",
        template_type="portfolio",
        provider=manager,
    )

    # Write real secret files that MUST be excluded from the ZIP export
    await manager.write_file(
        project_id,
        ".env",
        "STRIPE_SECRET_KEY=sk_live_99999999999988887777\nDATABASE_URL=postgres://admin:supersecret@db.internal:5432/prod\n",
    )
    await manager.write_file(
        project_id,
        ".env.local",
        "GEMINI_API_KEY=AIzaSySecretKey999999999999999999999\n",
    )
    await manager.write_file(
        project_id,
        "firebase-service-account.json",
        '{"type": "service_account", "private_key": "-----BEGIN PRIVATE KEY-----\\nSECRET\\n"}',
    )

    # Write a source file that accidentally contains an inline sk_live_ token
    await manager.write_file(
        project_id,
        "src/config.ts",
        'export const FALLBACK_KEY = "sk_live_99999999999988887777";\n',
    )

    zip_bytes, metadata = await build_project_export_zip(
        project_id=project_id,
        user_id="dev-user-001",
        provider=manager,
    )

    assert len(zip_bytes) > 0
    assert metadata.project_id == project_id
    assert metadata.has_readme is True
    assert metadata.has_env_example is True
    assert ".env" in metadata.excluded_secrets
    assert ".env.local" in metadata.excluded_secrets
    assert "firebase-service-account.json" in metadata.excluded_secrets

    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = zf.namelist()
        # Secret files must NOT be in the archive
        assert ".env" not in names
        assert ".env.local" not in names
        assert "firebase-service-account.json" not in names
        assert not any(n.startswith(".git/") for n in names)

        # Required standalone files MUST be in the archive
        assert ".env.example" in names
        assert "README.md" in names
        assert "package.json" in names
        assert "src/app/page.tsx" in names
        assert "src/config.ts" in names

        # Verify no raw secret values leaked anywhere in the archive
        for name in names:
            content = zf.read(name).decode("utf-8", errors="replace")
            assert "sk_live_99999999999988887777" not in content
            assert "supersecret@db.internal" not in content
            assert "AIzaSySecretKey999999999999999999999" not in content

        # Verify .env.example contains sanitized keys discovered from .env
        env_example = zf.read(".env.example").decode("utf-8")
        assert "STRIPE_SECRET_KEY=" in env_example
        assert "DATABASE_URL=" in env_example
        assert "GEMINI_API_KEY=" in env_example


@pytest.mark.asyncio
async def test_exported_project_runs_independently_when_extracted(tmp_path: Path):
    """
    Phase 8 Test 2:
    Verify that extracting the exported ZIP archive into a clean directory produces
    a standalone project with valid package.json scripts, .env.example, README.md,
    and passes independent build and test verification.
    """
    source_manager = LocalProcessManager(
        workspaces_root=str(tmp_path / "source_workspaces"),
        port_start=4821,
        port_end=4840,
    )
    project_id = "proj-phase8-standalone"
    await generate_project_code(
        project_id=project_id,
        project_name="Novastride Fleet",
        template_type="portfolio",
        provider=source_manager,
    )

    zip_bytes, _ = await build_project_export_zip(
        project_id=project_id,
        user_id="dev-user-001",
        provider=source_manager,
    )

    # Extract into an independent target workspace directory
    independent_base = tmp_path / "independent_workspaces"
    extracted_project_id = "extracted-standalone-app"
    extracted_dir = independent_base / extracted_project_id
    extracted_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        zf.extractall(extracted_dir)

    # Verify standalone files exist on disk
    assert (extracted_dir / "package.json").exists()
    assert (extracted_dir / ".env.example").exists()
    assert (extracted_dir / "README.md").exists()
    assert (extracted_dir / "src" / "app" / "page.tsx").exists()

    pkg_data = json.loads((extracted_dir / "package.json").read_text(encoding="utf-8"))
    assert "dev" in pkg_data.get("scripts", {})
    assert "build" in pkg_data.get("scripts", {})

    # Verify the extracted project builds and passes tests in a fresh LocalProcessManager
    independent_manager = LocalProcessManager(
        workspaces_root=str(independent_base),
        port_start=4841,
        port_end=4860,
    )
    tools = WorkspaceToolRegistry(provider=independent_manager)

    build_check = await tools.check_build(extracted_project_id)
    assert build_check.passed is True

    test_check = await tools.run_tests(extracted_project_id)
    assert test_check.passed is True


def test_phase8_export_and_version_restore_api_endpoints():
    """
    Phase 8 Test 3:
    Verify FastAPI routes for:
    - GET /api/v1/projects/{id}/workspace/export/metadata
    - GET /api/v1/projects/{id}/workspace/export (returns valid application/zip)
    - POST /api/v1/projects/{id}/workspace/checkpoints/{commit_sha}/restore
    """
    client = TestClient(app)
    headers = {"Authorization": "Bearer dev-token"}
    project_id = "proj-phase8-api-test"

    # 1. Generate workspace project
    gen_res = client.post(
        f"/api/v1/projects/{project_id}/workspace/generate",
        headers=headers,
        json={"template_type": "portfolio"},
    )
    assert gen_res.status_code == 200

    # 2. Create a manual checkpoint version
    snap_res = client.post(
        f"/api/v1/projects/{project_id}/workspace/checkpoints",
        headers=headers,
        json={"message": "Phase 8 Baseline Snapshot", "tag": "v1.0-phase8"},
    )
    assert snap_res.status_code in (200, 201)
    commit_sha = snap_res.json()["commit_sha"]

    # 3. Check export metadata endpoint
    meta_res = client.get(
        f"/api/v1/projects/{project_id}/workspace/export/metadata",
        headers=headers,
    )
    assert meta_res.status_code == 200
    meta_json = meta_res.json()
    assert meta_json["project_id"] == project_id
    assert meta_json["has_readme"] is True
    assert meta_json["has_env_example"] is True
    assert "README.md" in meta_json["included_files"]
    assert ".env.example" in meta_json["included_files"]

    # 4. Download ZIP archive via API
    zip_res = client.get(
        f"/api/v1/projects/{project_id}/workspace/export",
        headers=headers,
    )
    assert zip_res.status_code == 200
    assert zip_res.headers["content-type"] == "application/zip"
    assert "attachment; filename=" in zip_res.headers.get("content-disposition", "")

    with zipfile.ZipFile(io.BytesIO(zip_res.content), "r") as zf:
        assert "README.md" in zf.namelist()
        assert ".env.example" in zf.namelist()
        assert "src/app/page.tsx" in zf.namelist()

    # 5. Restore version checkpoint via API
    restore_res = client.post(
        f"/api/v1/projects/{project_id}/workspace/checkpoints/{commit_sha}/restore",
        headers=headers,
    )
    assert restore_res.status_code == 200
    assert commit_sha[:7] in restore_res.json()["message"]

    # Clean up workspace
    client.delete(f"/api/v1/projects/{project_id}/workspace", headers=headers)
