"""Phase 11 Automated Tests — Dual-Role RBAC (user vs developer), AI Website Suggestions & User-Exclusive Auto-Build."""

from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_phase11_rbac_developer_and_user_login() -> None:
    """Verify developer login (sanjay22522g@gmail.com / sanjai@2006) vs standard user login."""
    # 1. Developer login with sanjay22522g@gmail.com / sanjai@2006
    dev_res = client.post(
        "/api/v1/auth/login",
        json={
            "email": "sanjay22522g@gmail.com",
            "password": "sanjai@2006",
            "preferred_role": "developer",
        },
    )
    assert dev_res.status_code == 200
    dev_data = dev_res.json()
    assert dev_data["user"]["role"] == "developer"
    assert dev_data["user"]["email"] == "sanjay22522g@gmail.com"
    assert "platform_integrations_hub" in dev_data["user"]["permissions"]
    assert "raw_env_vault" in dev_data["user"]["permissions"]

    # 2. Invalid developer password should fail with 401
    bad_dev = client.post(
        "/api/v1/auth/login",
        json={
            "email": "sanjay22522g@gmail.com",
            "password": "wrong-password",
            "preferred_role": "developer",
        },
    )
    assert bad_dev.status_code == 401

    # 3. Standard User login gets Guided Creator role & Auto-Build permission
    user_res = client.post(
        "/api/v1/auth/login",
        json={
            "email": "creator@devora.app",
            "password": "user@2026",
            "preferred_role": "user",
        },
    )
    assert user_res.status_code == 200
    user_data = user_res.json()
    assert user_data["user"]["role"] == "user"
    assert "auto_build" in user_data["user"]["permissions"]
    assert "deploy_own_credentials" in user_data["user"]["permissions"]
    assert "platform_integrations_hub" not in user_data["user"]["permissions"]


def test_phase11_dynamic_website_suggestions_differ_by_prompt() -> None:
    """Verify AI suggestion engine returns distinct multi-page architectures for different prompts."""
    headers = {"Authorization": "Bearer dev-role-user-creator_01"}

    dental_res = client.post(
        "/api/v1/projects/suggest",
        headers=headers,
        json={
            "prompt": "Build a modern dental clinic website with appointment booking, dentist profiles, and patient financing calculator"
        },
    )
    assert dental_res.status_code == 200
    dental = dental_res.json()
    assert "Healthcare" in dental["domain_category"]
    assert len(dental["suggested_pages"]) >= 5

    real_estate_res = client.post(
        "/api/v1/projects/suggest",
        headers=headers,
        json={
            "prompt": "Create a luxury real estate property listing portal with interactive map and mortgage calculator"
        },
    )
    assert real_estate_res.status_code == 200
    estate = real_estate_res.json()
    assert "Real Estate" in estate["domain_category"]
    assert len(estate["suggested_pages"]) >= 5
    assert dental["color_palette"]["primary"] != estate["color_palette"]["primary"]


def test_phase11_user_auto_build_creates_working_multipage_website() -> None:
    """Verify POST /api/v1/projects/auto-build automatically configures defaults and creates a 5-page website."""
    headers = {"Authorization": "Bearer dev-role-user-creator_02"}

    res = client.post(
        "/api/v1/projects/auto-build",
        headers=headers,
        json={
            "prompt": "Build an artisan coffee roastery & subscription e-commerce store with roast finder quiz, bean catalog, wholesale portal, and brew guide",
            "project_name": "Velvet Bean Roasters",
        },
    )
    assert res.status_code in (200, 201)
    body = res.json()
    assert body["project"]["name"] == "Velvet Bean Roasters"
    assert body["project"]["status"] == "ready"
    assert body["live_preview_path"].startswith("/preview/")
    assert len(body["pages"]) >= 5
    assert body["auto_configured_defaults"]["environment"] == "production_ready_defaults"
