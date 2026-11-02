"""
Phase 10 Integration & E2E Tests — Security, Cross-Project Isolation, Rate Limiting & Full Lifecycle (Agent 2)
Tests:
1. Cross-project & cross-user isolation (User B cannot access, edit, export, or deploy User A's project or escape workspace root)
2. Authentication & authorization verification (missing/invalid bearer tokens rejected with 401 Unauthorized)
3. Sliding-window rate limiting & security headers verification (429 Too Many Requests when threshold exceeded + nosniff headers)
4. End-to-End Scenarios A–F (Full autonomous Devora pipeline: Project Creation -> Requirement Analysis -> Design Studio -> Configuration & Secret Vault -> Workspace Codegen & Surgical Edit -> Build/Playwright Verification -> Secret-Safe ZIP Export & Confirmed Cloud Deployment)
"""

import io
import zipfile
from fastapi.testclient import TestClient

from app.main import app
from app.middleware.rate_limit import reset_rate_limit_buckets


def test_cross_user_and_cross_project_isolation():
    """
    Phase 10 Test 1:
    Verify that a project created by Alice (`dev-user-alice`) cannot be read, modified,
    exported, or deployed by Bob (`dev-user-bob`), and path traversal outside workspace is blocked.
    """
    reset_rate_limit_buckets()
    client = TestClient(app)
    alice_headers = {"Authorization": "Bearer dev-user-alice"}
    bob_headers = {"Authorization": "Bearer dev-user-bob"}

    # Alice creates a private project
    create_res = client.post(
        "/api/v1/projects",
        headers=alice_headers,
        json={
            "name": "Alice Confidential FinTech Portal",
            "description": "Private enterprise treasury dashboard with RBAC",
        },
    )
    assert create_res.status_code in (200, 201)
    project_id = create_res.json()["id"]

    # Bob attempts to GET Alice's project metadata -> 404 Not Found
    bob_get = client.get(f"/api/v1/projects/{project_id}", headers=bob_headers)
    assert bob_get.status_code in (403, 404)

    # Bob attempts to generate/access Alice's workspace -> 403 Forbidden
    bob_ws = client.get(f"/api/v1/projects/{project_id}/workspace", headers=bob_headers)
    assert bob_ws.status_code == 403

    # Bob attempts to export Alice's workspace ZIP -> 403 Forbidden
    bob_export = client.get(
        f"/api/v1/projects/{project_id}/workspace/export",
        headers=bob_headers,
    )
    assert bob_export.status_code == 403

    # Bob attempts to deploy Alice's project -> 403 Forbidden
    bob_deploy = client.post(
        f"/api/v1/projects/{project_id}/deploy",
        headers=bob_headers,
        json={"provider": "vercel", "user_confirmed": True, "target_branch": "testing"},
    )
    assert bob_deploy.status_code == 403

    # Alice attempts path traversal outside workspace -> 403 Forbidden
    traversal_res = client.get(
        f"/api/v1/projects/{project_id}/workspace/files/content",
        headers=alice_headers,
        params={"path": "../../etc/passwd"},
    )
    assert traversal_res.status_code == 403

    # Cleanup Alice's project
    client.delete(f"/api/v1/projects/{project_id}", headers=alice_headers)


def test_authentication_and_authorization_enforcement():
    """
    Phase 10 Test 2:
    Verify that missing tokens (under strict auth mode) and invalid/expired bearer tokens
    are rejected with 401 Unauthorized.
    """
    reset_rate_limit_buckets()
    client = TestClient(app)

    # 1. Missing token with strict auth header -> 401
    missing_res = client.get(
        "/api/v1/projects",
        headers={"X-Devora-Strict-Auth": "true"},
    )
    assert missing_res.status_code == 401

    # 2. Invalid bearer token -> 401
    invalid_res = client.get(
        "/api/v1/projects",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert invalid_res.status_code == 401

    # 3. Valid user token -> 200
    valid_res = client.get(
        "/api/v1/projects",
        headers={"Authorization": "Bearer dev-user-alice"},
    )
    assert valid_res.status_code == 200


def test_rate_limiting_and_security_headers():
    """
    Phase 10 Test 3:
    Verify RateLimitAndSecurityMiddleware attaches security headers (`X-Content-Type-Options: nosniff`,
    `X-RateLimit-Limit`) and returns 429 Too Many Requests when a client's request rate exceeds the limit.
    """
    reset_rate_limit_buckets()
    client = TestClient(app)
    rate_test_headers = {
        "X-Devora-Client-Key": "rate-limit-test-client",
        "X-Devora-RateLimit-Limit": "3",
    }

    for _ in range(3):
        ok_res = client.get("/api/v1/health", headers=rate_test_headers)
        assert ok_res.status_code == 200
        assert ok_res.headers.get("X-Content-Type-Options") == "nosniff"
        assert ok_res.headers.get("X-RateLimit-Limit") == "3"

    # 4th request within the same minute must return 429 Too Many Requests
    blocked_res = client.get("/api/v1/health", headers=rate_test_headers)
    assert blocked_res.status_code == 429
    assert blocked_res.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    reset_rate_limit_buckets()


def test_end_to_end_autonomous_scenarios_a_through_f():
    """
    Phase 10 Test 4 (End-to-End Scenarios A–F):
    Exercises the complete Devora v1.0 autonomous workflow from natural-language prompt
    to verified code generation, surgical incremental modification, self-repair verification,
    secret-safe ZIP export, and user-confirmed cloud deployment.
    """
    reset_rate_limit_buckets()
    client = TestClient(app)
    headers = {"Authorization": "Bearer dev-user-e2e"}

    # Scenario A: Create Project from Natural Language Description
    proj_res = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": "Orbital Telemetry Cloud",
            "description": "Build a modern SaaS telemetry dashboard with pricing, live metrics, and Stripe checkout.",
        },
    )
    assert proj_res.status_code in (200, 201)
    project_id = proj_res.json()["id"]

    # Scenario B: Optional Design Studio — Generate & Approve Design Version
    design_gen = client.post(
        f"/api/v1/projects/{project_id}/design/generate",
        headers=headers,
        json={"design_choice": "design_first"},
    )
    assert design_gen.status_code in (200, 201)
    version_id = design_gen.json()["id"]

    design_approve = client.post(
        f"/api/v1/projects/{project_id}/design/versions/{version_id}/approve",
        headers=headers,
    )
    assert design_approve.status_code == 200

    # Scenario C: Configuration & Secret Vault + Implementation Plan Approval
    cfg_save = client.post(
        f"/api/v1/projects/{project_id}/configuration",
        headers=headers,
        json={
            "variables": {
                "NEXT_PUBLIC_APP_URL": "https://orbital-telemetry.vercel.app",
                "STRIPE_SECRET_KEY": "sk_live_E2ESecretKey9999999999",
            }
        },
    )
    assert cfg_save.status_code == 200

    plan_gen = client.post(
        f"/api/v1/projects/{project_id}/plan/generate",
        headers=headers,
    )
    assert plan_gen.status_code == 200
    plan_approve = client.post(
        f"/api/v1/projects/{project_id}/plan/approve",
        headers=headers,
    )
    assert plan_approve.status_code == 200

    # Scenario D: Full Code Generation + Surgical Incremental Edit (preserving untouched files)
    codegen_res = client.post(
        f"/api/v1/projects/{project_id}/workspace/generate",
        headers=headers,
        json={"template_type": "saas"},
    )
    assert codegen_res.status_code == 200
    assert codegen_res.json()["build_passed"] is True

    edit_res = client.post(
        f"/api/v1/projects/{project_id}/workspace/edit",
        headers=headers,
        json={
            "prompt": "Update hero headline to 'Real-Time Orbital Telemetry v2.0'",
            "target_files": ["src/app/page.tsx"],
        },
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["files_modified"] == ["src/app/page.tsx"]
    assert edit_res.json()["files_untouched_count"] >= 4

    # Scenario E: Build Check, Playwright Smoke Tests & Verification Report
    verify_res = client.post(
        f"/api/v1/projects/{project_id}/workspace/verify",
        headers=headers,
        json={"auto_repair": True},
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["overall_status"] in ("passed", "repaired")
    assert verify_res.json()["test_suite"]["passed"] is True

    # Scenario F: Secret-Safe ZIP Export & User-Confirmed Cloud Deployment
    zip_res = client.get(
        f"/api/v1/projects/{project_id}/workspace/export",
        headers=headers,
    )
    assert zip_res.status_code == 200
    with zipfile.ZipFile(io.BytesIO(zip_res.content), "r") as zf:
        assert "README.md" in zf.namelist()
        assert ".env.example" in zf.namelist()
        assert ".env" not in zf.namelist()

    # Connect Vercel for E2E user and trigger confirmed deployment
    client.post(
        "/api/v1/integrations/connect",
        headers=headers,
        json={
            "provider": "vercel",
            "account_handle": "sanjai-225",
            "token_or_code": "vcp_E2EToken1234567890",
        },
    )
    deploy_res = client.post(
        f"/api/v1/projects/{project_id}/deploy",
        headers=headers,
        json={"provider": "vercel", "user_confirmed": True, "target_branch": "testing"},
    )
    assert deploy_res.status_code == 200
    assert deploy_res.json()["status"] == "ready"
    assert deploy_res.json()["estimated_monthly_cost_usd"] == 0.0

    # Cleanup E2E workspace & project
    client.delete(f"/api/v1/projects/{project_id}/workspace", headers=headers)
    client.delete(f"/api/v1/projects/{project_id}", headers=headers)
