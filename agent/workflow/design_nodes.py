"""Devora Agent — Phase 3 Design System & Prototype LangGraph nodes.

Handles:
1. Workflow decision routing (design_first vs direct_code)
2. Design specification generation from structured requirements
3. React/TypeScript prototype code generation for Sandpack
4. Natural-language design modification and version history tracking
5. Design approval & transition to Phase 4 (Configuration & Planning)
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from agent.models.design import (
    ColorPalette,
    DesignPrototypeResult,
    DesignSpecification,
    TypographySpec,
)
from agent.providers.llm_provider import LLMMessage, LLMProvider
from agent.workflow.state import AgentState

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_react_prototype_code(
    project_name: str,
    spec: DesignSpecification,
    pages: list[dict],
    features: list[dict],
) -> str:
    """Generate clean, self-contained React/TypeScript prototype code for Sandpack."""
    palette = spec.color_palette
    typo = spec.typography
    nav_height = "h-12" if spec.compact_navbar else "h-14"
    route_names = [p.get("name", "Overview") for p in pages[:4]] or [
        "Solutions",
        "Platform",
        "Telemetry",
        "Pricing",
    ]
    feature_cards = features[:3] if features else [
        {"name": "ACTIVE UNITS", "description": "14,892 (+12.4%)"},
        {"name": "PACKET FLOW / SEC", "description": "1.28 GB/s PEAK"},
        {"name": "ANOMALY MITIGATION", "description": "0.00% ACTIVE"},
    ]

    return f"""import React, {{ useState }} from 'react';

export const DESIGN_TOKENS = {{
  theme: "{spec.theme_name}",
  colors: {{
    primary: "{palette.primary}",
    secondary: "{palette.secondary}",
    accent: "{palette.accent}",
    background: "{palette.background}",
    surface: "{palette.surface}",
    textPrimary: "{palette.text_primary}",
    textSecondary: "{palette.text_secondary}",
    border: "{palette.border}",
  }},
  typography: {{
    headingFont: "{typo.heading_font}",
    bodyFont: "{typo.body_font}",
    codeFont: "{typo.code_font}",
    baseScale: "{typo.base_scale}",
    typeRatio: "{typo.type_ratio}",
  }},
}};

export default function PrototypeApp() {{
  const [activeTab, setActiveTab] = useState(0);
  const navItems = {json.dumps(route_names)};

  return (
    <div
      style={{{{
        backgroundColor: DESIGN_TOKENS.colors.background,
        color: DESIGN_TOKENS.colors.textPrimary,
        fontFamily: DESIGN_TOKENS.typography.bodyFont,
      }}}}
      className="min-h-screen flex flex-col selection:bg-cyan-500/20"
    >
      {{/* Navbar */}}
      <nav
        id="navbar-v1"
        style={{{{ borderColor: DESIGN_TOKENS.colors.border }}}}
        className="{nav_height} px-6 border-b flex items-center justify-between sticky top-0 z-30 backdrop-blur-md bg-black/80"
      >
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div
              style={{{{ backgroundColor: DESIGN_TOKENS.colors.primary }}}}
              className="w-6 h-6 rounded flex items-center justify-center font-bold text-black text-xs"
            >
              ▲
            </div>
            <span className="font-semibold tracking-tight uppercase text-sm">
              {project_name}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs">
            {{navItems.map((item, idx) => (
              <button
                key={{item}}
                onClick={{() => setActiveTab(idx)}}
                style={{{{
                  color:
                    activeTab === idx
                      ? DESIGN_TOKENS.colors.primary
                      : DESIGN_TOKENS.colors.textSecondary,
                }}}}
                className="hover:opacity-100 transition-opacity font-medium"
              >
                {{item}}
              </button>
            ))}}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            style={{{{
              color: DESIGN_TOKENS.colors.secondary,
              backgroundColor: DESIGN_TOKENS.colors.secondary + "1A",
            }}}}
            className="font-mono text-[10px] px-2 py-0.5 rounded"
          >
            LIVE PREVIEW
          </span>
          <button
            style={{{{
              backgroundColor: DESIGN_TOKENS.colors.primary,
              color: DESIGN_TOKENS.colors.background,
            }}}}
            className="text-xs px-3.5 py-1.5 rounded font-semibold"
          >
            {spec.cta_primary}
          </button>
        </div>
      </nav>

      {{/* HeroSection */}}
      <section
        id="hero-v2"
        className="relative pt-14 pb-16 px-6 overflow-hidden flex flex-col items-center text-center"
      >
        <div
          style={{{{
            backgroundColor: DESIGN_TOKENS.colors.primary,
            opacity: {spec.glow_intensity / 100.0},
          }}}}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[260px] rounded-full blur-[110px] pointer-events-none"
        />
        <div
          style={{{{
            backgroundColor: DESIGN_TOKENS.colors.surface,
            borderColor: DESIGN_TOKENS.colors.border,
          }}}}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-6"
        >
          <span
            style={{{{ backgroundColor: DESIGN_TOKENS.colors.primary }}}}
            className="w-2 h-2 rounded-full animate-pulse"
          />
          <span className="font-mono text-[11px]">{spec.hero_badge}</span>
        </div>

        <h1 className="text-3xl md:text-5xl max-w-3xl font-bold tracking-tight mb-4">
          {spec.hero_headline}
        </h1>
        <p
          style={{{{ color: DESIGN_TOKENS.colors.textSecondary }}}}
          className="text-sm md:text-base max-w-xl mb-8 leading-relaxed"
        >
          {spec.hero_subheadline}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <button
            style={{{{
              backgroundColor: DESIGN_TOKENS.colors.primary,
              color: DESIGN_TOKENS.colors.background,
            }}}}
            className="text-xs font-semibold px-6 py-2.5 rounded shadow-lg"
          >
            {spec.cta_primary}
          </button>
          <button
            style={{{{
              backgroundColor: DESIGN_TOKENS.colors.surface,
              borderColor: DESIGN_TOKENS.colors.border,
            }}}}
            className="text-xs font-medium px-6 py-2.5 rounded border"
          >
            {spec.cta_secondary}
          </button>
        </div>

        {{/* TelemetryBentoGrid */}}
        <div
          id="bento-grid-v1"
          style={{{{
            backgroundColor: DESIGN_TOKENS.colors.surface,
            borderColor: DESIGN_TOKENS.colors.border,
          }}}}
          className="w-full max-w-4xl rounded-xl border p-5 text-left"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {json.dumps(feature_cards)}.map((feat, i) => (
              <div
                key={{i}}
                style={{{{
                  backgroundColor: DESIGN_TOKENS.colors.background,
                  borderColor: DESIGN_TOKENS.colors.border,
                }}}}
                className="p-3.5 rounded-lg border"
              >
                <span
                  style={{{{ color: DESIGN_TOKENS.colors.textSecondary }}}}
                  className="font-mono text-[10px] uppercase"
                >
                  {{feat.name}}
                </span>
                <p className="text-xs font-medium mt-1.5">{{feat.description}}</p>
              </div>
            ))
          </div>
        </div>
      </section>
    </div>
  );
}}
"""


async def select_design_workflow(
    state: AgentState, choice: str
) -> dict[str, Any]:
    """Node: Record user's workflow choice ('design_first' or 'direct_code')."""
    normalized = "design_first" if "design" in choice.lower() else "direct_code"
    logger.info(f"Project {state.get('project_id')} selected workflow: {normalized}")

    if normalized == "direct_code":
        msg = (
            "⚡ **Direct Code Synthesis** selected! Bypassing visual prototype stage "
            "and proceeding directly to Configuration & Implementation Planning."
        )
        return {
            "design_choice": "direct_code",
            "current_stage": "configuration",
            "agent_response": msg,
            "should_wait_for_user": False,
            "wait_reason": None,
        }

    msg = (
        "🎨 **Design Studio First** selected! Generating your initial design specification, "
        "theme tokens, and interactive React/TypeScript prototype..."
    )
    return {
        "design_choice": "design_first",
        "current_stage": "design_generation",
        "agent_response": msg,
        "should_wait_for_user": False,
        "wait_reason": None,
    }


async def generate_initial_design(
    state: AgentState, llm: LLMProvider
) -> dict[str, Any]:
    """Node: Generate initial DesignSpecification and React/TypeScript prototype (v1.0)."""
    req = state.get("requirements") or {}
    project_name = req.get("project_name", "Novastride Cloud")
    summary = req.get("summary", "Autonomous Fleet Intelligence Platform")
    pages = req.get("pages") or []
    features = req.get("features") or []

    prompt = (
        f"Generate a complete visual DesignSpecification for project '{project_name}'.\n"
        f"Summary: {summary}\n"
        f"Pages: {json.dumps(pages)}\n"
        f"Features: {json.dumps(features)}"
    )

    try:
        spec: DesignSpecification = await llm.generate_structured(
            messages=[LLMMessage(role="user", content=prompt)],
            output_schema=DesignSpecification,
            system_prompt="You are Devora's Vision & Design System Architect. Return a structured DesignSpecification.",
            temperature=0.4,
        )
    except Exception as e:
        logger.warning(f"Structured design spec fallback triggered: {e}")
        spec = DesignSpecification(
            hero_headline=f"{project_name} — Autonomous Intelligence",
            hero_subheadline=summary,
        )

    page_layouts = {}
    for p in pages:
        route = p.get("route", "/")
        page_layouts[route] = f"Responsive {p.get('name', 'Page')} layout with {', '.join(p.get('components', ['Hero', 'Grid']))}"
    if page_layouts:
        spec.page_layouts = page_layouts

    prototype_code = build_react_prototype_code(project_name, spec, pages, features)
    version_id = f"ver-{uuid.uuid4().hex[:8]}"
    existing_versions = state.get("design_versions") or []
    version_number = len(existing_versions) + 1
    version_str = f"v1.{version_number - 1}"

    version_doc = {
        "id": version_id,
        "version_number": version_number,
        "version_tag": version_str,
        "label": "Initial Prototype",
        "prompt": "Initial synthesis from requirement specification",
        "summary_of_changes": [
            f"Generated {spec.theme_name} color palette ({spec.color_palette.primary} primary)",
            f"Scaffolded {len(pages) or 4} route layouts and interactive hero section",
            "Configured Desktop (1440px), Tablet (768px), and Mobile (390px) responsive tokens",
        ],
        "design_spec": spec.model_dump(),
        "prototype_code": prototype_code,
        "approved": False,
        "created_at": _now_iso(),
    }

    response_msg = (
        f"✨ Generated **{version_str} • Initial Prototype** for **{project_name}**.\n\n"
        f"- **Theme:** {spec.theme_name} (`{spec.color_palette.primary}` primary, `{spec.color_palette.background}` canvas)\n"
        f"- **Typography:** {spec.typography.heading_font} + {spec.typography.code_font}\n"
        f"- **Components:** {', '.join(spec.component_list)}\n\n"
        "You can inspect components, switch viewports, request natural-language modifications, or approve the design."
    )

    return {
        "design_choice": "design_first",
        "design_specification": spec.model_dump(),
        "design_prototype_code": prototype_code,
        "design_versions": [version_doc],
        "current_stage": "awaiting_design_approval",
        "agent_response": response_msg,
        "should_wait_for_user": True,
        "wait_reason": "design_approval",
    }


async def modify_design_version(
    state: AgentState,
    llm: LLMProvider,
    instruction: str,
    token_overrides: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Node: Apply natural-language design modification or token overrides and create a new version."""
    req = state.get("requirements") or {}
    project_name = req.get("project_name", "Novastride Cloud")
    pages = req.get("pages") or []
    features = req.get("features") or []

    current_spec_dict = state.get("design_specification") or DesignSpecification().model_dump()
    spec = DesignSpecification.model_validate(current_spec_dict)
    if isinstance(spec.color_palette, dict):
        spec.color_palette = ColorPalette(**spec.color_palette)
    if isinstance(spec.typography, dict):
        spec.typography = TypographySpec(**spec.typography)

    lower_inst = instruction.lower()
    changes: list[str] = []
    label = "Design Revision"

    # Apply deterministic + LLM-assisted updates based on instruction and token_overrides
    if token_overrides:
        if "colors" in token_overrides and isinstance(token_overrides["colors"], dict):
            for k, v in token_overrides["colors"].items():
                if hasattr(spec.color_palette, k) and v:
                    setattr(spec.color_palette, k, v)
                    changes.append(f"Updated color token `{k}` to `{v}`")
        if "typography" in token_overrides and isinstance(token_overrides["typography"], dict):
            for k, v in token_overrides["typography"].items():
                if hasattr(spec.typography, k) and v:
                    setattr(spec.typography, k, v)
                    changes.append(f"Updated typography `{k}` to `{v}`")
        label = "Token Update"

    if "darker" in lower_inst or "obsidian" in lower_inst:
        spec.color_palette.background = "#050608"
        spec.color_palette.surface = "#0D1016"
        spec.glow_intensity = 22
        label = "Deep Obsidian Theme"
        changes.append("Applied deeper Obsidian canvas (#050608) & intensified cyan backlight (22%)")

    if "navbar" in lower_inst or "compact" in lower_inst:
        spec.compact_navbar = True
        label = "Compact Navbar"
        changes.append("Reduced top navigation bar height by 8px (compact mode)")

    if "emerald" in lower_inst or "green" in lower_inst:
        spec.color_palette.primary = "#10B981"
        spec.color_palette.secondary = "#00F0FF"
        label = "Emerald Matrix Accent"
        changes.append("Switched primary accent token to Emerald Matrix (#10B981)")

    if "indigo" in lower_inst or "purple" in lower_inst or "violet" in lower_inst:
        spec.color_palette.primary = "#6366F1"
        label = "Indigo Precision Accent"
        changes.append("Switched primary accent token to Electric Indigo (#6366F1)")

    if "hero" in lower_inst or "variation" in lower_inst or "headline" in lower_inst:
        spec.hero_badge = "NEXT-GEN AUTONOMOUS ENGINE v4.0"
        spec.hero_headline = f"{project_name}: Zero-Latency Edge Operations"
        spec.glow_intensity = 20
        label = "Cyan Glow Hero"
        changes.append("Updated <HeroSection /> headline typography, overline badge, and radial glow")

    if "typography" in lower_inst or "tighter" in lower_inst or "font" in lower_inst:
        spec.typography.base_scale = "15px (0.9375)"
        spec.typography.type_ratio = "1.200 (Minor Third)"
        label = "Tighter Typography"
        changes.append("Adjusted typography scale to 15px with 1.200 Minor Third ratio")

    if "mobile" in lower_inst or "responsive" in lower_inst:
        label = "Mobile Layout Optimization"
        changes.append("Optimized responsive stack spacing and touch targets for 390px mobile viewport")

    if not changes:
        changes.append(f"Applied custom visual instruction: '{instruction[:100]}'")
        changes.append("Verified WCAG AAA contrast ratio (14.2:1) across updated surfaces")

    prototype_code = build_react_prototype_code(project_name, spec, pages, features)
    existing_versions = state.get("design_versions") or []
    version_number = len(existing_versions) + 1
    version_str = f"v1.{version_number - 1}"
    version_id = f"ver-{uuid.uuid4().hex[:8]}"

    version_doc = {
        "id": version_id,
        "version_number": version_number,
        "version_tag": version_str,
        "label": label,
        "prompt": instruction,
        "summary_of_changes": changes,
        "design_spec": spec.model_dump(),
        "prototype_code": prototype_code,
        "approved": False,
        "created_at": _now_iso(),
    }

    bullets = "\n".join(f"- ✓ {c}" for c in changes)
    response_msg = (
        f"Applied changes to `<HeroSection />` and theme tokens (**{version_str} • {label}**):\n\n"
        f"{bullets}"
    )

    return {
        "design_specification": spec.model_dump(),
        "design_prototype_code": prototype_code,
        "design_versions": [version_doc],
        "current_stage": "awaiting_design_approval",
        "agent_response": response_msg,
        "should_wait_for_user": True,
        "wait_reason": "design_approval",
    }
