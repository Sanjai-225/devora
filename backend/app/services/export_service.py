"""Devora Backend — Phase 8 Secret-Safe ZIP Export & Standalone Project Packaging Service.

Implements:
- Secret-safe ZIP archive creation from the isolated project workspace
- Strict exclusion of `.env`, `.env.local`, `.env.*` (except `.env.example`), `.git/`, `node_modules/`, and private key files
- Automatic `.env.example` generation with safe placeholder values (never real secrets)
- Automatic standalone `README.md` generation with setup, build, test, and $0/month free-tier deployment instructions
- Firestore metadata sync (`/projects/{projectId}/exports/{exportId}`)
"""

import io
import json
import logging
import re
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import PurePosixPath
from typing import Any

from agent.workflow.codegen_nodes import generate_project_code, list_git_checkpoints
from app.core.firebase import get_firestore_client
from app.models.schemas import ProjectExportMetadataResponse
from app.providers.local_process_manager import get_execution_provider
from app.services import configuration_service, firestore_service

logger = logging.getLogger(__name__)

# Files and directories that MUST NEVER be included in an exported ZIP
EXCLUDED_DIR_PREFIXES = (
    ".git/",
    "node_modules/",
    ".next/",
    "__pycache__/",
    ".venv/",
    "dist/",
)

SECRET_FILENAME_PATTERNS = (
    ".env",
    ".env.local",
    ".env.development",
    ".env.staging",
    ".env.production",
    "firebase-service-account.json",
    "service-account.json",
    "id_rsa",
)

SECRET_EXTENSIONS = (".pem", ".key", ".p12", ".pfx", ".secret")

# Regex patterns to scrub accidental inline secrets from source files during export
LIVE_SECRET_PATTERNS = [
    re.compile(r"sk_live_[0-9a-zA-Z]{8,}"),
    re.compile(r"rk_live_[0-9a-zA-Z]{8,}"),
    re.compile(r"ghp_[0-9a-zA-Z]{16,}"),
    re.compile(r"github_pat_[0-9a-zA-Z_]{16,}"),
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_secret_or_excluded_path(rel_path: str) -> tuple[bool, str]:
    """Return (True, reason) if `rel_path` must be excluded from ZIP export."""
    norm = rel_path.replace("\\", "/").lstrip("/")
    if not norm:
        return True, "empty_path"

    for prefix in EXCLUDED_DIR_PREFIXES:
        if norm.startswith(prefix) or norm == prefix.rstrip("/"):
            return True, "excluded_dir"

    name = PurePosixPath(norm).name
    lower_name = name.lower()

    # Allow .env.example or .env.template, block all other .env* files
    if lower_name in (".env.example", ".env.template", ".env.sample"):
        return False, ""

    if lower_name in SECRET_FILENAME_PATTERNS or lower_name.startswith(".env."):
        return True, "secret_file"

    if any(lower_name.endswith(ext) for ext in SECRET_EXTENSIONS):
        return True, "secret_extension"

    return False, ""


def sanitize_content_for_export(content: str) -> str:
    """Scrub any accidental live secret tokens from source text."""
    sanitized = content
    for pattern in LIVE_SECRET_PATTERNS:
        sanitized = pattern.sub("REDACTED_LIVE_SECRET_PLACEHOLDER", sanitized)
    return sanitized


async def generate_sanitized_env_example(
    project_id: str,
    user_id: str,
    discovered_keys: list[str] | None = None,
) -> str:
    """Generate a clean `.env.example` containing only variable keys and safe placeholder examples."""
    lines = [
        "# ============================================================================",
        f"# Devora Exported Project Environment Template ({project_id})",
        "# Copy this file to `.env.local` and fill in your own credentials.",
        "# Real secrets were automatically excluded by Devora's Secret-Safe Export Guard.",
        "# ============================================================================",
        "",
    ]
    try:
        cfg = await configuration_service.get_project_configuration(
            project_id=project_id,
            user_id=user_id,
        )
        variables = cfg.variables if cfg and hasattr(cfg, "variables") else []
    except Exception:
        variables = []

    seen_keys: set[str] = set()
    if variables:
        for var in variables:
            key = getattr(var, "key", None) or (var.get("key") if isinstance(var, dict) else "APP_KEY")
            seen_keys.add(str(key))
            desc = getattr(var, "description", None) or (
                var.get("description") if isinstance(var, dict) else "Required configuration variable"
            )
            category = getattr(var, "category", None) or (
                var.get("category") if isinstance(var, dict) else "general"
            )
            lines.append(f"# [{str(category).upper()}] {desc}")
            if "URL" in str(key):
                lines.append(f'{key}="https://example.com"')
            elif "DB" in str(key) or "DATABASE" in str(key):
                lines.append(f'{key}="postgresql://postgres:password@localhost:5432/app_db"')
            else:
                lines.append(f'{key}="your_{str(key).lower()}_here"')
            lines.append("")
    else:
        for default_key, default_comment, default_val in [
            ("NEXT_PUBLIC_APP_URL", "Public Application URL", "http://localhost:3000"),
            (
                "DATABASE_URL",
                "Database Connection URI (Server-Only)",
                "postgresql://postgres:password@localhost:5432/devora_app",
            ),
            (
                "STRIPE_SECRET_KEY",
                "Optional Third-Party API Keys (Server-Only)",
                "sk_test_placeholder_replace_me",
            ),
        ]:
            seen_keys.add(default_key)
            lines.append(f"# {default_comment}")
            lines.append(f'{default_key}="{default_val}"')
            lines.append("")

    for extra_key in discovered_keys or []:
        clean_key = extra_key.strip()
        if clean_key and clean_key not in seen_keys:
            seen_keys.add(clean_key)
            lines.append(f"# Discovered Workspace Variable ({clean_key})")
            lines.append(f'{clean_key}="your_{clean_key.lower()}_here"')
            lines.append("")

    return "\n".join(lines).rstrip() + "\n"



def generate_standalone_readme(
    project_id: str,
    project_name: str,
    included_files: list[str],
    checkpoint_sha: str,
) -> str:
    """Generate a complete standalone README.md for the exported project."""
    file_tree_lines = "\n".join(f"- `{fp}`" for fp in sorted(included_files)[:25])
    return f"""# {project_name}

> Generated, verified, and packaged by **Devora Autonomous Website Development Platform**
> **Project ID:** `{project_id}` • **Git Checkpoint:** `{checkpoint_sha}`

---

## 1. Quick Start (Run Independently on Your Machine)

### Prerequisites
- **Node.js** 20+ (or Bun / pnpm)
- **npm** 10+

### Setup & Local Development
```bash
# 1. Install dependencies
npm install

# 2. Configure local environment variables (real secrets are never included in exports)
cp .env.example .env.local

# 3. Start the Next.js development server
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 2. Production Build & Automated Verification

```bash
# Verify production build
npm run build

# Run Playwright smoke tests
npm test
```

---

## 3. Project Structure ({len(included_files)} Exported Files)

{file_tree_lines}

---

## 4. $0/Month Free-Tier Cloud Deployment Guide

1. **Frontend (Vercel Hobby Free Plan):**
   - Push this folder to a GitHub repository and import it on [Vercel](https://vercel.com).
   - Add the variables from `.env.example` in your Vercel Project Settings -> Environment Variables.
2. **Database / Auth (Firebase Spark Free Plan or Supabase Free Tier):**
   - Connect your free-tier database URI via `.env.local` or Vercel Environment Variables.
"""


async def _sync_export_to_firestore(
    project_id: str,
    user_id: str,
    meta: ProjectExportMetadataResponse,
) -> None:
    """Persist export record metadata to Firestore (`/projects/{projectId}/exports/{exportId}`)."""
    db = get_firestore_client()
    if db is not None:
        try:
            db.collection("projects").document(project_id).collection(
                "exports"
            ).document(meta.export_id).set(
                {
                    "id": meta.export_id,
                    "projectId": project_id,
                    "userId": user_id,
                    "filename": meta.filename,
                    "sizeBytes": meta.size_bytes,
                    "includedFilesCount": len(meta.included_files),
                    "excludedSecretsCount": len(meta.excluded_secrets),
                    "hasEnvExample": meta.has_env_example,
                    "hasReadme": meta.has_readme,
                    "checkpointSha": meta.checkpoint_sha,
                    "exportedAt": meta.exported_at,
                }
            )
        except Exception as e:
            logger.warning(f"Firestore export metadata sync skipped: {e}")


async def build_project_export_zip(
    project_id: str,
    user_id: str,
    provider: Any = None,
) -> tuple[bytes, ProjectExportMetadataResponse]:
    """Package the project workspace into a secret-safe, standalone ZIP archive."""
    exec_provider = provider or get_execution_provider()
    project = await firestore_service.get_project(project_id, user_id)
    project_name = project.name if project else "Novastride Fleet"

    # Ensure workspace exists and has generated files
    await exec_provider.create_workspace(project_id, project_name=project_name)
    entries = await exec_provider.list_files(project_id)
    visible_entries = [e for e in entries if not e.is_dir and not e.path.startswith(".git/")]
    if not visible_entries:
        await generate_project_code(
            project_id=project_id,
            project_name=project_name,
            provider=exec_provider,
        )
        entries = await exec_provider.list_files(project_id)

    checkpoints = await list_git_checkpoints(project_id, provider=exec_provider)
    latest_sha = checkpoints[0].short_sha if checkpoints else "HEAD"

    included_files: list[str] = []
    excluded_secrets: list[str] = []
    discovered_env_keys: list[str] = []
    file_payloads: dict[str, str] = {}

    for entry in entries:
        if entry.is_dir:
            continue
        is_excluded, reason = is_secret_or_excluded_path(entry.path)
        if is_excluded:
            if reason in ("secret_file", "secret_extension"):
                excluded_secrets.append(entry.path)
                # Extract only the key names from .env* files so .env.example stays comprehensive
                if PurePosixPath(entry.path).name.lower().startswith(".env"):
                    try:
                        env_raw = await exec_provider.read_file(project_id, entry.path)
                        for line in env_raw.splitlines():
                            stripped = line.strip()
                            if stripped and not stripped.startswith("#") and "=" in stripped:
                                k = stripped.split("=", 1)[0].strip()
                                if re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", k):
                                    discovered_env_keys.append(k)
                    except Exception:
                        pass
            continue

        try:
            raw_content = await exec_provider.read_file(project_id, entry.path)
        except Exception:
            continue

        clean_content = sanitize_content_for_export(raw_content)
        file_payloads[entry.path] = clean_content
        included_files.append(entry.path)

    # Always ensure a valid package.json exists so the exported project runs independently
    if "package.json" not in file_payloads:
        slug = re.sub(r"[^a-z0-9]+", "-", project_name.lower()).strip("-") or "devora-export"
        file_payloads["package.json"] = (
            json.dumps(
                {
                    "name": slug,
                    "version": "1.0.0",
                    "private": True,
                    "scripts": {
                        "dev": "next dev",
                        "build": "next build",
                        "start": "next start",
                        "test": "playwright test",
                    },
                    "dependencies": {
                        "next": "^16.0.0",
                        "react": "^19.0.0",
                        "react-dom": "^19.0.0",
                        "lucide-react": "^1.16.0",
                    },
                },
                indent=2,
            )
            + "\n"
        )
        included_files.append("package.json")

    # Always generate a sanitized .env.example
    env_example_content = await generate_sanitized_env_example(
        project_id, user_id, discovered_keys=discovered_env_keys
    )
    file_payloads[".env.example"] = env_example_content
    if ".env.example" not in included_files:
        included_files.append(".env.example")

    # Always generate a comprehensive standalone README.md
    readme_content = generate_standalone_readme(
        project_id=project_id,
        project_name=project_name,
        included_files=included_files,
        checkpoint_sha=latest_sha,
    )
    file_payloads["README.md"] = readme_content
    if "README.md" not in included_files:
        included_files.append("README.md")

    # Build ZIP archive in memory
    slug = re.sub(r"[^a-z0-9]+", "-", project_name.lower()).strip("-") or project_id
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for rel_path in sorted(file_payloads.keys()):
            zf.writestr(rel_path, file_payloads[rel_path])

    zip_bytes = zip_buffer.getvalue()
    export_id = f"exp_{uuid.uuid4().hex[:8]}"
    filename = f"{slug}-{latest_sha}.zip"

    meta = ProjectExportMetadataResponse(
        export_id=export_id,
        project_id=project_id,
        project_name=project_name,
        filename=filename,
        size_bytes=len(zip_bytes),
        included_files=sorted(included_files),
        excluded_secrets=sorted(excluded_secrets),
        has_env_example=True,
        has_readme=True,
        checkpoint_sha=latest_sha,
        exported_at=_now_iso(),
    )
    await _sync_export_to_firestore(project_id, user_id, meta)
    return zip_bytes, meta
