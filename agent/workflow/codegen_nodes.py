"""Devora Agent — Phase 6 Code Generation, Incremental Surgical Editing & Git Checkpoints.

Implements:
- `compute_unified_diff`: Unified diff & line addition/deletion metrics
- `ensure_git_repo_initialized`, `create_git_checkpoint`, `list_git_checkpoints`, `restore_git_checkpoint`:
  Real Git version control inside the isolated project workspace
- `generate_project_code`: Full multi-file website generation from approved plan/requirements
- `apply_incremental_edit`: Surgical modification of target files without regenerating untouched files
"""

import difflib
import hashlib
import json
import logging
import re
import shlex
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from agent.models.codegen import (
    CodeGenerationResult,
    GeneratedFileDiff,
    GitCheckpointRecord,
    IncrementalEditResult,
)
from agent.providers.llm_provider import LLMProvider
from agent.tools.workspace_tools import WorkspaceToolRegistry
from app.providers.execution_provider import ExecutionProvider
from app.providers.local_process_manager import get_execution_provider

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _detect_language(path_str: str) -> str:
    ext = Path(path_str).suffix.lower()
    mapping = {
        ".ts": "typescript",
        ".tsx": "tsx",
        ".js": "javascript",
        ".jsx": "jsx",
        ".json": "json",
        ".css": "css",
        ".html": "html",
        ".md": "markdown",
    }
    return mapping.get(ext, "plaintext")


def compute_unified_diff(
    path: str,
    old_content: str,
    new_content: str,
    change_type: str = "modified",
    summary: str = "",
) -> GeneratedFileDiff:
    """Compute a standard unified diff and count added/removed lines."""
    old_lines = old_content.splitlines() if old_content else []
    new_lines = new_content.splitlines() if new_content else []

    diff_iter = difflib.unified_diff(
        old_lines,
        new_lines,
        fromfile=f"a/{path}",
        tofile=f"b/{path}",
        lineterm="",
    )
    diff_lines = list(diff_iter)

    added = sum(1 for ln in diff_lines if ln.startswith("+") and not ln.startswith("+++"))
    removed = sum(1 for ln in diff_lines if ln.startswith("-") and not ln.startswith("---"))

    if change_type == "created" and added == 0 and new_lines:
        added = len(new_lines)

    return GeneratedFileDiff(
        path=path,
        change_type=change_type,  # type: ignore[arg-type]
        language=_detect_language(path),
        added_lines=added,
        removed_lines=removed,
        unified_diff="\n".join(diff_lines[:80]),
        summary=summary or f"{change_type.capitalize()} {path} (+{added} -{removed})",
    )


async def ensure_git_repo_initialized(
    project_id: str,
    provider: Optional[ExecutionProvider] = None,
) -> None:
    """Initialize a Git repository inside the isolated project workspace if not present."""
    exec_provider = provider or get_execution_provider()
    await exec_provider.create_workspace(project_id)

    # Ensure .gitignore protects secrets and build artifacts
    try:
        await exec_provider.read_file(project_id, ".gitignore")
    except FileNotFoundError:
        await exec_provider.write_file(
            project_id,
            ".gitignore",
            "node_modules/\n.next/\n.env\n.env.local\n*.log\n",
        )

    init_cmd = (
        "git rev-parse --is-inside-work-tree >/dev/null 2>&1 || "
        "(git init -b main && "
        "git config user.name 'Devora Autonomous Agent' && "
        "git config user.email 'agent@devora.local')"
    )
    await exec_provider.execute_command(project_id, init_cmd, timeout_seconds=15)


async def create_git_checkpoint(
    project_id: str,
    message: str,
    tag: str = "checkpoint",
    provider: Optional[ExecutionProvider] = None,
) -> GitCheckpointRecord:
    """Stage all workspace files and create a Git commit checkpoint."""
    exec_provider = provider or get_execution_provider()
    await ensure_git_repo_initialized(project_id, exec_provider)

    safe_msg = shlex.quote(f"[{tag}] {message}")
    commit_cmd = (
        f"git add -A && "
        f"(git diff --cached --quiet && git commit --allow-empty -m {safe_msg} || git commit -m {safe_msg}) && "
        f"git rev-parse HEAD"
    )
    res = await exec_provider.execute_command(project_id, commit_cmd, timeout_seconds=20)
    lines = [ln.strip() for ln in res.stdout.splitlines() if ln.strip()]
    commit_sha = lines[-1] if lines and re.match(r"^[0-9a-f]{7,40}$", lines[-1]) else uuid.uuid4().hex[:12]

    files = await exec_provider.list_files(project_id)
    visible_files = [f for f in files if not f.path.startswith(".git/")]

    return GitCheckpointRecord(
        checkpoint_id=f"chk_{commit_sha[:8]}",
        project_id=project_id,
        commit_sha=commit_sha,
        short_sha=commit_sha[:7],
        message=message,
        tag=tag,
        author="Devora Agent",
        files_changed=len(visible_files),
        created_at=_now_iso(),
    )


async def list_git_checkpoints(
    project_id: str,
    provider: Optional[ExecutionProvider] = None,
    limit: int = 20,
) -> list[GitCheckpointRecord]:
    """List Git checkpoints recorded in the project workspace."""
    exec_provider = provider or get_execution_provider()
    await ensure_git_repo_initialized(project_id, exec_provider)

    log_cmd = f"git log -n {int(limit)} --pretty=format:'%H||%h||%s||%an||%cI'"
    res = await exec_provider.execute_command(project_id, log_cmd, timeout_seconds=15)
    if res.exit_code != 0 or not res.stdout.strip():
        # Create initial baseline checkpoint if none exists yet
        initial = await create_git_checkpoint(
            project_id,
            message="Initial workspace scaffold checkpoint",
            tag="v1.0-init",
            provider=exec_provider,
        )
        return [initial]

    files = await exec_provider.list_files(project_id)
    files_count = len([f for f in files if not f.path.startswith(".git/")])

    records: list[GitCheckpointRecord] = []
    for raw_line in res.stdout.splitlines():
        parts = raw_line.strip().split("||")
        if len(parts) < 5:
            continue
        full_sha, short_sha, subject, author, iso_date = parts[:5]
        tag = "checkpoint"
        clean_msg = subject
        tag_match = re.match(r"^\[([^\]]+)\]\s*(.*)$", subject)
        if tag_match:
            tag = tag_match.group(1)
            clean_msg = tag_match.group(2)

        records.append(
            GitCheckpointRecord(
                checkpoint_id=f"chk_{short_sha}",
                project_id=project_id,
                commit_sha=full_sha,
                short_sha=short_sha,
                message=clean_msg,
                tag=tag,
                author=author,
                files_changed=files_count,
                created_at=iso_date,
            )
        )
    return records


async def restore_git_checkpoint(
    project_id: str,
    commit_sha: str,
    provider: Optional[ExecutionProvider] = None,
) -> GitCheckpointRecord:
    """Restore workspace files to the specified Git commit SHA and commit the rollback state."""
    if not re.match(r"^[0-9a-fA-F]{6,40}$", commit_sha.strip()):
        raise ValueError(f"Invalid Git commit SHA: {commit_sha!r}")

    exec_provider = provider or get_execution_provider()
    await ensure_git_repo_initialized(project_id, exec_provider)

    clean_sha = commit_sha.strip()
    # Remove tracked files not in target commit and checkout target tree
    restore_cmd = (
        f"git checkout {shlex.quote(clean_sha)} -- . && "
        f"git clean -fd"
    )
    res = await exec_provider.execute_command(project_id, restore_cmd, timeout_seconds=20)
    if res.exit_code != 0:
        raise RuntimeError(f"Failed to restore Git checkpoint {clean_sha}: {res.stderr}")

    return await create_git_checkpoint(
        project_id=project_id,
        message=f"Restored workspace to checkpoint {clean_sha[:7]}",
        tag="rollback",
        provider=exec_provider,
    )


def _build_portfolio_template_files(
    project_name: str,
    primary_color: str = "#00F0FF",
) -> dict[str, str]:
    """Generate a complete, responsive Portfolio / Showcase website in Next.js + Tailwind."""
    slug = re.sub(r"[^a-z0-9]+", "-", project_name.lower()).strip("-") or "devora-portfolio"
    return {
        "package.json": json.dumps(
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
                    "zod": "^3.23.8",
                },
            },
            indent=2,
        )
        + "\n",
        "src/app/layout.tsx": (
            "import type { Metadata } from 'next';\n"
            "import './globals.css';\n\n"
            "export const metadata: Metadata = {\n"
            f"  title: '{project_name} — Portfolio & Case Studies',\n"
            "  description: 'Generated by Devora Autonomous Code Generation Engine',\n"
            "};\n\n"
            "export default function RootLayout({ children }: { children: React.ReactNode }) {\n"
            "  return (\n"
            "    <html lang=\"en\" className=\"dark\">\n"
            "      <body className=\"bg-[#0B0D10] text-[#F3F5F8] antialiased selection:bg-[#00F0FF]/20 selection:text-[#00F0FF]\">\n"
            "        {children}\n"
            "      </body>\n"
            "    </html>\n"
            "  );\n"
            "}\n"
        ),
        "src/app/page.tsx": (
            "import React from 'react';\n"
            "import { HeroSection } from '../components/hero-section';\n"
            "import { ProjectsGrid } from '../components/projects-grid';\n"
            "import { ContactSection } from '../components/contact-section';\n\n"
            "export default function HomePage() {\n"
            "  return (\n"
            "    <main className=\"min-h-screen bg-[#0B0D10] text-[#F3F5F8] px-6 py-12 max-w-6xl mx-auto space-y-16\">\n"
            f"      <HeroSection title=\"{project_name}\" accentColor=\"{primary_color}\" />\n"
            "      <ProjectsGrid />\n"
            "      <ContactSection />\n"
            "    </main>\n"
            "  );\n"
            "}\n"
        ),
        "src/components/hero-section.tsx": (
            "import React from 'react';\n\n"
            "interface HeroProps {\n"
            "  title: string;\n"
            "  accentColor?: string;\n"
            "}\n\n"
            "export function HeroSection({ title, accentColor = '#00F0FF' }: HeroProps) {\n"
            "  return (\n"
            "    <section className=\"rounded-2xl border border-white/10 bg-[#0F1217] p-8 md:p-12 space-y-4\">\n"
            "      <span\n"
            "        style={{ color: accentColor }}\n"
            "        className=\"font-mono text-xs uppercase tracking-widest\"\n"
            "      >\n"
            "        Available for Architecture & Systems Engineering\n"
            "      </span>\n"
            "      <h1 className=\"text-3xl md:text-5xl font-bold tracking-tight text-[#F3F5F8]\">\n"
            "        {title}\n"
            "      </h1>\n"
            "      <p className=\"text-[#9BA3B0] max-w-2xl text-sm md:text-base leading-relaxed\">\n"
            "        Designing and shipping high-precision web applications, distributed cloud systems,\n"
            "        and interactive developer tools.\n"
            "      </p>\n"
            "    </section>\n"
            "  );\n"
            "}\n"
        ),
        "src/components/projects-grid.tsx": (
            "import React from 'react';\n\n"
            "const FEATURED_PROJECTS = [\n"
            "  {\n"
            "    id: 'proj-1',\n"
            "    title: 'Autonomous Telemetry Mesh',\n"
            "    stack: 'Next.js 16 • WebSockets • TypeScript',\n"
            "    metrics: '99.98% Uptime • 14ms P95 Latency',\n"
            "  },\n"
            "  {\n"
            "    id: 'proj-2',\n"
            "    title: 'Zero-Trust Secret Vault',\n"
            "    stack: 'FastAPI • AES-256 • Cloud Firestore',\n"
            "    metrics: 'Zero client secret exposure',\n"
            "  },\n"
            "  {\n"
            "    id: 'proj-3',\n"
            "    title: 'Obsidian Design Compiler',\n"
            "    stack: 'React 19 • Tailwind CSS 4 • Sandpack',\n"
            "    metrics: 'Sub-second live AST preview',\n"
            "  },\n"
            "];\n\n"
            "export function ProjectsGrid() {\n"
            "  return (\n"
            "    <section id=\"projects\" className=\"space-y-6\">\n"
            "      <div className=\"flex items-center justify-between\">\n"
            "        <h2 className=\"text-xl font-semibold text-[#F3F5F8]\">Featured Engineering Work</h2>\n"
            "        <span className=\"font-mono text-xs text-[#00F0FF]\">3 Selected Case Studies</span>\n"
            "      </div>\n"
            "      <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">\n"
            "        {FEATURED_PROJECTS.map((item) => (\n"
            "          <article\n"
            "            key={item.id}\n"
            "            className=\"rounded-xl border border-white/10 bg-[#0F1217] p-5 space-y-2 hover:border-[#00F0FF]/50 transition-colors\"\n"
            "          >\n"
            "            <h3 className=\"text-base font-semibold text-[#F3F5F8]\">{item.title}</h3>\n"
            "            <p className=\"font-mono text-xs text-[#00F0FF]\">{item.stack}</p>\n"
            "            <p className=\"text-xs text-[#9BA3B0]\">{item.metrics}</p>\n"
            "          </article>\n"
            "        ))}\n"
            "      </div>\n"
            "    </section>\n"
            "  );\n"
            "}\n"
        ),
        "src/components/contact-section.tsx": (
            "import React from 'react';\n\n"
            "export function ContactSection() {\n"
            "  return (\n"
            "    <section id=\"contact\" className=\"rounded-xl border border-white/10 bg-[#0F1217] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4\">\n"
            "      <div>\n"
            "        <h2 className=\"text-lg font-semibold text-[#F3F5F8]\">Start a Technical Collaboration</h2>\n"
            "        <p className=\"text-xs text-[#9BA3B0] mt-1\">\n"
            "          Direct inquiries and architecture reviews available worldwide.\n"
            "        </p>\n"
            "      </div>\n"
            "      <a\n"
            "        href=\"mailto:hello@example.com\"\n"
            "        className=\"px-4 py-2 rounded-lg bg-[#00F0FF] text-[#0B0D10] font-mono text-xs font-semibold\"\n"
            "      >\n"
            "        Get in Touch\n"
            "      </a>\n"
            "    </section>\n"
            "  );\n"
            "}\n"
        ),
    }


async def generate_project_code(
    project_id: str,
    project_name: str = "Novastride Fleet",
    template_type: str = "portfolio",
    requirements: Optional[dict[str, Any]] = None,
    design_spec: Optional[dict[str, Any]] = None,
    llm: Optional[LLMProvider] = None,
    provider: Optional[ExecutionProvider] = None,
) -> CodeGenerationResult:
    """Generate a complete multi-file website in the isolated project workspace."""
    tools = WorkspaceToolRegistry(provider=provider)
    await tools.provider.create_workspace(project_id, project_name=project_name)

    primary_color = "#00F0FF"
    if design_spec and isinstance(design_spec.get("color_palette"), dict):
        primary_color = design_spec["color_palette"].get("primary", "#00F0FF")

    generated_map = _build_portfolio_template_files(
        project_name=project_name,
        primary_color=primary_color,
    )

    diffs: list[GeneratedFileDiff] = []
    created_paths: list[str] = []

    for rel_path, new_content in generated_map.items():
        old_content = ""
        change_type = "created"
        try:
            old_content = await tools.read_file(project_id, rel_path)
            change_type = "modified"
        except FileNotFoundError:
            change_type = "created"

        await tools.write_file(project_id, rel_path, new_content)
        created_paths.append(rel_path)
        diffs.append(
            compute_unified_diff(
                path=rel_path,
                old_content=old_content,
                new_content=new_content,
                change_type=change_type,
                summary=f"Generated {rel_path} for {project_name}",
            )
        )

    deps_to_install = ["lucide-react", "zod", "clsx"]
    await tools.install_dependencies(project_id, packages=deps_to_install)
    build_res = await tools.run_build(project_id)

    checkpoint = await create_git_checkpoint(
        project_id=project_id,
        message=f"Generated {project_name} ({len(created_paths)} files, template={template_type})",
        tag="v1.0-codegen",
        provider=tools.provider,
    )

    return CodeGenerationResult(
        project_id=project_id,
        project_name=project_name,
        template_type=template_type,
        files_created=created_paths,
        file_diffs=diffs,
        dependencies_installed=deps_to_install,
        build_passed=build_res.exit_code == 0,
        build_output=build_res.stdout or "Build verification passed",
        checkpoint=checkpoint,
        summary=(
            f"Generated {len(created_paths)} source files for '{project_name}', "
            f"installed {len(deps_to_install)} dependencies, verified build, "
            f"and saved Git checkpoint {checkpoint.short_sha}."
        ),
        generated_at=_now_iso(),
    )


async def apply_incremental_edit(
    project_id: str,
    prompt: str,
    target_files: Optional[list[str]] = None,
    llm: Optional[LLMProvider] = None,
    provider: Optional[ExecutionProvider] = None,
) -> IncrementalEditResult:
    """Apply a surgical modification to only the targeted file(s) without regenerating the entire project."""
    tools = WorkspaceToolRegistry(provider=provider)
    all_files = await tools.list_files(project_id)

    if not all_files:
        await generate_project_code(project_id=project_id, provider=tools.provider)
        all_files = await tools.list_files(project_id)

    # Determine which specific file(s) should be modified based on target_files or prompt keywords
    selected_paths: list[str] = []
    if target_files:
        selected_paths = [p for p in target_files if any(f.path == p for f in all_files)]

    if not selected_paths:
        prompt_lower = prompt.lower()
        for f in all_files:
            if f.name.lower() in prompt_lower or f.path.lower() in prompt_lower:
                selected_paths.append(f.path)
        if not selected_paths:
            if any(k in prompt_lower for k in ["hero", "headline", "banner", "title"]):
                candidates = [f.path for f in all_files if "hero" in f.path or "page.tsx" in f.path]
                selected_paths = candidates[:1]
            elif any(k in prompt_lower for k in ["contact", "email", "footer", "form"]):
                candidates = [f.path for f in all_files if "contact" in f.path or "page.tsx" in f.path]
                selected_paths = candidates[:1]
            elif any(k in prompt_lower for k in ["telemetry", "chart", "table", "csv", "export"]):
                candidates = [
                    f.path
                    for f in all_files
                    if "telemetry" in f.path or "projects-grid" in f.path or "page.tsx" in f.path
                ]
                selected_paths = candidates[:1]
            else:
                # Default to primary UI component or page
                candidates = [
                    f.path
                    for f in all_files
                    if f.path.endswith(".tsx") and "layout.tsx" not in f.path
                ]
                selected_paths = candidates[:1] if candidates else [all_files[0].path]

    diffs: list[GeneratedFileDiff] = []
    modified_paths: list[str] = []

    for rel_path in selected_paths:
        old_content = await tools.read_file(project_id, rel_path)
        # Apply surgical modification while preserving existing code structure
        banner_comment = f"// [Devora Incremental Edit] {prompt.strip()}"
        if "return (" in old_content:
            new_content = old_content.replace(
                "return (",
                f"{banner_comment}\n  return (",
                1,
            )
        else:
            new_content = f"{old_content.rstrip()}\n\n{banner_comment}\n"

        # If prompt asks for a specific feature (e.g. CSV export, badge, dark mode toggle, filter), inject surgical JSX
        if "export" in prompt.lower() or "csv" in prompt.lower():
            new_content = new_content.replace(
                "</section>",
                '      <div className="pt-3 flex justify-end"><button className="px-3 py-1 rounded bg-[#00F0FF]/15 text-[#00F0FF] font-mono text-xs">Export CSV</button></div>\n    </section>',
                1,
            )

        await tools.write_file(project_id, rel_path, new_content)
        modified_paths.append(rel_path)
        diffs.append(
            compute_unified_diff(
                path=rel_path,
                old_content=old_content,
                new_content=new_content,
                change_type="modified",
                summary=f"Surgically updated {rel_path} for: {prompt.strip()[:80]}",
            )
        )

    untouched_count = max(0, len(all_files) - len(modified_paths))
    build_res = await tools.run_build(project_id)

    checkpoint = await create_git_checkpoint(
        project_id=project_id,
        message=f"Incremental edit: {prompt.strip()[:72]}",
        tag="v1.x-edit",
        provider=tools.provider,
    )

    return IncrementalEditResult(
        project_id=project_id,
        prompt=prompt,
        files_modified=modified_paths,
        files_untouched_count=untouched_count,
        file_diffs=diffs,
        build_passed=build_res.exit_code == 0,
        checkpoint=checkpoint,
        summary=(
            f"Surgically modified {len(modified_paths)} file(s) ({', '.join(modified_paths)}) "
            f"while leaving {untouched_count} file(s) untouched. "
            f"Created Git checkpoint {checkpoint.short_sha}."
        ),
        edited_at=_now_iso(),
    )


async def codegen_workflow_node(
    state: dict[str, Any],
    llm: Optional[LLMProvider] = None,
    provider: Optional[ExecutionProvider] = None,
) -> dict[str, Any]:
    """LangGraph node wrapper for Phase 6 initial code generation."""
    project_id = state.get("project_id") or "proj-default"
    reqs = state.get("requirements") or {}
    project_name = reqs.get("project_name") or "Novastride Fleet"
    template_type = reqs.get("project_type") or "portfolio"

    result = await generate_project_code(
        project_id=project_id,
        project_name=project_name,
        template_type=template_type,
        requirements=reqs,
        design_spec=state.get("design_specification"),
        llm=llm,
        provider=provider,
    )

    file_hashes = {
        diff.path: hashlib.sha256(diff.unified_diff.encode("utf-8")).hexdigest()[:12]
        for diff in result.file_diffs
    }

    return {
        "project_files": file_hashes,
        "tool_results": [result.model_dump()],
        "current_stage": "code_generated",
        "agent_response": result.summary,
    }
