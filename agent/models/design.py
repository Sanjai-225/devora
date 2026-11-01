"""Devora Agent — Phase 3 Design System & Prototype Pydantic models.

Defines the structured models for design specifications, color tokens,
typography, prototype code generation, and version history.
"""

from typing import Optional
from pydantic import BaseModel, Field


class ColorPalette(BaseModel):
    """Color token palette for the generated website prototype."""
    primary: str = Field(default="#00F0FF", description="Primary brand/accent hex color")
    secondary: str = Field(default="#10B981", description="Secondary accent hex color")
    accent: str = Field(default="#6366F1", description="Tertiary/highlight hex color")
    background: str = Field(default="#090A0D", description="Deep canvas background hex color")
    surface: str = Field(default="#151921", description="Elevated card/container hex color")
    text_primary: str = Field(default="#F1F5F9", description="Primary foreground text hex color")
    text_secondary: str = Field(default="#94A3B8", description="Muted/secondary text hex color")
    border: str = Field(default="#1F2733", description="Subtle hairline border hex color")


class TypographySpec(BaseModel):
    """Typography configuration for the design system."""
    heading_font: str = Field(default="Geist", description="Primary heading font family")
    body_font: str = Field(default="Geist", description="Body copy font family")
    code_font: str = Field(default="JetBrains Mono", description="Monospace code/label font family")
    base_scale: str = Field(default="16px (1.000)", description="Base font size scale")
    type_ratio: str = Field(default="1.250 (Major Third)", description="Modular typographic scale ratio")


class DesignSpecification(BaseModel):
    """Complete visual design specification for a project."""
    theme_name: str = Field(default="Obsidian Cyan Precision", description="Name of the visual theme")
    color_palette: ColorPalette = Field(default_factory=ColorPalette, description="Color tokens")
    typography: TypographySpec = Field(default_factory=TypographySpec, description="Typography tokens")
    layout_structure: str = Field(
        default="Sticky glassmorphic top navbar + centered high-impact hero with ambient glow + 3-column bento telemetry grid + live sparkline footer",
        description="High-level layout architecture",
    )
    page_layouts: dict[str, str] = Field(
        default_factory=dict,
        description="Mapping of route paths to visual layout descriptions",
    )
    component_list: list[str] = Field(
        default_factory=lambda: [
            "Navbar",
            "HeroSection",
            "TelemetryBentoGrid",
            "IngestionSparklineCard",
            "FooterStrip",
        ],
        description="Key visual components rendered in the prototype",
    )
    hero_badge: str = Field(default="AGENTIC FLEET PROTOCOL v3.9", description="Overline badge text in hero")
    hero_headline: str = Field(
        default="Autonomous Fleet Intelligence at Global Scale",
        description="Primary hero headline text",
    )
    hero_subheadline: str = Field(
        default="Synthesize sub-second telemetry across 100k+ global edge vehicles. Native real-time sensor ingestion, dynamic path computation, and autonomous zero-latency failover.",
        description="Hero supporting paragraph text",
    )
    cta_primary: str = Field(default="Deploy Fleet Agent", description="Primary CTA button label")
    cta_secondary: str = Field(default="Book Live Demo", description="Secondary CTA button label")
    compact_navbar: bool = Field(default=False, description="Whether compact navbar height is enabled")
    glow_intensity: int = Field(default=15, description="Ambient backlight glow opacity percentage")


class DesignPrototypeResult(BaseModel):
    """Output from prototype generation or natural-language design modification."""
    version_label: str = Field(default="Initial Prototype", description="Short label for version history")
    summary_of_changes: list[str] = Field(
        default_factory=list,
        description="Bullet points summarizing applied visual or token changes",
    )
    design_spec: DesignSpecification = Field(
        default_factory=DesignSpecification,
        description="Updated design specification and tokens",
    )
    prototype_code: str = Field(
        default="",
        description="Self-contained React/TypeScript component code for Sandpack preview",
    )
