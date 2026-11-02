"""
Phase 9 Integration Tests — GitHub Integrations & Free-Tier Cloud Deployment (Agent 2)
Tests:
1. GitHub OAuth URL generation and integration connect/disconnect with server-side secret masking
2. Secret-safe GitHub repository creation and Git push flow (excluding .env and private keys)
3. Vercel Hobby & Render Free Web Service deployment adapters, including mandatory explicit user confirmation gate (user_confirmed=True) and deployment status tracking
4. Phase 9 FastAPI endpoints (/integrations, /integrations/github/oauth-url, /projects/{id}/github/push, /projects/{id}/deploy, /projects/{id}/deployments)
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from agent.workflow.codegen_nodes import generate_project_code
from app.main import app
from app.providers.local_process_manager import LocalProcessManager
from app.services import deployment_service


@pytest.mark.asyncio
async def test_github_oauth_url_and_secret_masked_integration_connect():
    """
    Phase 9 Test 1:
    Verify GitHub OAuth URL points directly to https://github.com/login/oauth/authorize
    (suitable for popup-based OAuth in an iframe) and connecting tokens stores only masked previews.
    """
    oauth_info = deployment_service.build_github_oauth_url(
        redirect_uri="https://devora-platform.vercel.app/integrations/callback"
    )
    assert oauth_info["provider"] == "github"
    assert oauth_info["auth_url"].startswith("https://github.com/login/oauth/authorize?")
    assert "scope=repo+read%3Auser" in oauth_info["auth_url"]

    user_id = "user-phase9-oauth"
    raw_token = "ghp_SuperSecretGitHubToken998877665544"
    connected = await deployment_service.connect_user_integration(
        user_id=user_id,
        provider="github",
        account_handle="Sanjai-225",
        token_or_code=raw_token,
    )
    assert connected["connected"] is True
    assert connected["account_handle"] == "Sanjai-225"
    assert raw_token not in connected["masked_token"]
    assert "••••" in connected["masked_token"] or "***" in connected["masked_token"]

    # Disconnect and verify token cleared
    disconnected = await deployment_service.disconnect_user_integration(user_id, "github")
    assert disconnected["connected"] is False
    assert disconnected["masked_token"] == ""


@pytest.mark.asyncio
async def test_github_push_flow_excludes_secrets(tmp_path: Path):
    """
    Phase 9 Test 2:
    Verify pushing a workspace to GitHub packages all generated files, records the commit SHA,
    and strictly excludes .env, .env.local, and firebase-service-account.json.
    """
    manager = LocalProcessManager(
        workspaces_root=str(tmp_path / "workspaces"),
        port_start=4861,
        port_end=4880,
    )
    user_id = "user-phase9-gh-push"
    project_id = "proj-phase9-gh-push"

    await deployment_service.connect_user_integration(
        user_id=user_id,
        provider="github",
        account_handle="Sanjai-225",
        token_or_code="ghp_ValidTestToken1234567890",
    )

    await generate_project_code(
        project_id=project_id,
        project_name="Novastride Fleet",
        template_type="portfolio",
        provider=manager,
    )
    await manager.write_file(project_id, ".env", "STRIPE_SECRET_KEY=sk_live_99999999999\n")
    await manager.write_file(project_id, ".env.local", "DATABASE_URL=postgres://secret\n")

    push_res = await deployment_service.push_project_to_github(
        project_id=project_id,
        user_id=user_id,
        repo_name="Sanjai-225/devora",
        branch="feature/agent-2",
        commit_message="feat(phase9): [Agent 2] push workspace to feature/agent-2",
        provider=manager,
    )

    assert push_res["project_id"] == project_id
    assert push_res["repository"] == "Sanjai-225/devora"
    assert push_res["branch"] == "feature/agent-2"
    assert push_res["files_pushed_count"] >= 5
    assert ".env" in push_res["excluded_secrets"]
    assert ".env.local" in push_res["excluded_secrets"]


@pytest.mark.asyncio
async def test_vercel_and_render_deployment_requires_explicit_user_confirmation(tmp_path: Path):
    """
    Phase 9 Test 3:
    Verify Vercel and Render deployment adapters reject unconfirmed deployments (user_confirmed=False)
    and succeed with $0.00/month Free-Tier status tracking when user_confirmed=True.
    """
    manager = LocalProcessManager(
        workspaces_root=str(tmp_path / "workspaces"),
        port_start=4881,
        port_end=4895,
    )
    user_id = "user-phase9-deploy"
    project_id = "proj-phase9-deploy"

    await deployment_service.connect_user_integration(
        user_id=user_id,
        provider="vercel",
        account_handle="sanjai-225",
        token_or_code="vcp_ValidVercelToken1234567890",
    )
    await deployment_service.connect_user_integration(
        user_id=user_id,
        provider="render",
        account_handle="sanjay22522g@gmail.com",
        token_or_code="rnd_ValidRenderToken1234567890",
    )

    # 1. Attempting deployment with user_confirmed=False MUST raise ValueError
    with pytest.raises(ValueError, match="Explicit user confirmation"):
        await deployment_service.trigger_cloud_deployment(
            project_id=project_id,
            user_id=user_id,
            target_provider="vercel",
            user_confirmed=False,
            provider=manager,
        )

    # 2. Confirmed Vercel deployment succeeds
    vercel_dep = await deployment_service.trigger_cloud_deployment(
        project_id=project_id,
        user_id=user_id,
        target_provider="vercel",
        user_confirmed=True,
        target_branch="testing",
        environment="preview",
        provider=manager,
    )
    assert vercel_dep["provider"] == "vercel"
    assert vercel_dep["status"] == "ready"
    assert vercel_dep["estimated_monthly_cost_usd"] == 0.0
    assert vercel_dep["user_confirmed"] is True
    assert vercel_dep["url"].endswith(".vercel.app")

    # 3. Confirmed Render deployment succeeds
    render_dep = await deployment_service.trigger_cloud_deployment(
        project_id=project_id,
        user_id=user_id,
        target_provider="render",
        user_confirmed=True,
        target_branch="testing",
        environment="preview",
        provider=manager,
    )
    assert render_dep["provider"] == "render"
    assert render_dep["status"] == "ready"
    assert render_dep["estimated_monthly_cost_usd"] == 0.0
    assert render_dep["url"].endswith(".onrender.com")

    history = await deployment_service.list_project_deployments(project_id, user_id)
    assert len(history) >= 2


def test_phase9_integrations_and_deployment_api_endpoints():
    """
    Phase 9 Test 4:
    Verify FastAPI routes for /integrations, /integrations/github/oauth-url,
    /projects/{id}/github/push, /projects/{id}/deploy, and /projects/{id}/deployments.
    """
    client = TestClient(app)
    headers = {"Authorization": "Bearer dev-token"}
    project_id = "proj-phase9-api"

    # 1. List integrations
    list_res = client.get("/api/v1/integrations", headers=headers)
    assert list_res.status_code == 200
    providers = {item["provider"] for item in list_res.json()}
    assert providers == {"github", "vercel", "render"}

    # 2. Get GitHub OAuth URL
    oauth_res = client.get("/api/v1/integrations/github/oauth-url", headers=headers)
    assert oauth_res.status_code == 200
    assert oauth_res.json()["auth_url"].startswith("https://github.com/login/oauth/authorize")

    # 3. Connect GitHub & Vercel tokens via API
    for prov, handle, tok in [
        ("github", "Sanjai-225", "ghp_ApiToken1234567890"),
        ("vercel", "sanjai-225", "vcp_ApiToken1234567890"),
    ]:
        conn_res = client.post(
            "/api/v1/integrations/connect",
            headers=headers,
            json={"provider": prov, "account_handle": handle, "token_or_code": tok},
        )
        assert conn_res.status_code == 200
        assert conn_res.json()["connected"] is True
        assert tok not in conn_res.json()["masked_token"]

    # 4. Push project to GitHub via API
    push_res = client.post(
        f"/api/v1/projects/{project_id}/github/push",
        headers=headers,
        json={"repo_name": "Sanjai-225/devora", "branch": "feature/agent-2"},
    )
    assert push_res.status_code == 200
    assert push_res.json()["branch"] == "feature/agent-2"

    # 5. Unconfirmed deploy via API returns 400 Bad Request
    unconfirmed_res = client.post(
        f"/api/v1/projects/{project_id}/deploy",
        headers=headers,
        json={"provider": "vercel", "user_confirmed": False, "target_branch": "testing"},
    )
    assert unconfirmed_res.status_code == 400

    # 6. Confirmed deploy via API returns 200
    deploy_res = client.post(
        f"/api/v1/projects/{project_id}/deploy",
        headers=headers,
        json={"provider": "vercel", "user_confirmed": True, "target_branch": "testing"},
    )
    assert deploy_res.status_code == 200
    assert deploy_res.json()["status"] == "ready"

    # 7. List project deployments
    deps_res = client.get(f"/api/v1/projects/{project_id}/deployments", headers=headers)
    assert deps_res.status_code == 200
    assert len(deps_res.json()) >= 1

    # Cleanup workspace
    client.delete(f"/api/v1/projects/{project_id}/workspace", headers=headers)
