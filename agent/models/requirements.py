"""Devora Agent — Structured requirement models.

These Pydantic models represent the structured output from
the requirement analysis phase.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Framework(str, Enum):
    NEXTJS = "nextjs"
    REACT = "react"
    VUE = "vue"
    SVELTE = "svelte"
    ANGULAR = "angular"
    ASTRO = "astro"
    HTML_CSS_JS = "html_css_js"


class StylingFramework(str, Enum):
    TAILWIND = "tailwind"
    CSS_MODULES = "css_modules"
    STYLED_COMPONENTS = "styled_components"
    SASS = "sass"
    VANILLA_CSS = "vanilla_css"


class BackendFramework(str, Enum):
    NONE = "none"
    NEXTJS_API = "nextjs_api"
    EXPRESS = "express"
    FASTAPI = "fastapi"
    FLASK = "flask"
    DJANGO = "django"


class DatabaseType(str, Enum):
    NONE = "none"
    SQLITE = "sqlite"
    POSTGRESQL = "postgresql"
    MONGODB = "mongodb"
    MYSQL = "mysql"
    FIREBASE = "firebase"
    SUPABASE = "supabase"


class AuthMethod(str, Enum):
    NONE = "none"
    EMAIL_PASSWORD = "email_password"
    OAUTH_GOOGLE = "oauth_google"
    OAUTH_GITHUB = "oauth_github"
    JWT = "jwt"
    SESSION = "session"


class ProjectComplexity(str, Enum):
    SIMPLE = "simple"       # Landing page, portfolio
    MODERATE = "moderate"   # Blog, small e-commerce
    COMPLEX = "complex"     # Full SaaS, marketplace


# ── Sub-models ──────────────────────────────────────────────────────


class PageDefinition(BaseModel):
    """Defines a single page/route in the website."""
    name: str = Field(description="Human-readable page name")
    route: str = Field(description="URL route path, e.g., '/about'")
    description: str = Field(description="What this page contains and does")
    components: list[str] = Field(
        default_factory=list,
        description="Key UI components needed (e.g., 'hero section', 'product grid')",
    )
    is_authenticated: bool = Field(
        default=False,
        description="Whether this page requires authentication",
    )


class FeatureDefinition(BaseModel):
    """Defines a feature of the website."""
    name: str = Field(description="Feature name")
    description: str = Field(description="Detailed description of the feature")
    priority: str = Field(
        default="must_have",
        description="Priority: must_have, should_have, nice_to_have",
    )
    requires_backend: bool = Field(
        default=False,
        description="Whether this feature needs server-side logic",
    )


class TechnologyStack(BaseModel):
    """Selected technology stack for the project."""
    framework: Framework = Field(description="Frontend framework")
    styling: StylingFramework = Field(description="CSS/styling approach")
    backend: BackendFramework = Field(description="Backend framework")
    database: DatabaseType = Field(description="Database type")
    auth_methods: list[AuthMethod] = Field(
        default_factory=list,
        description="Authentication methods to implement",
    )
    additional_libraries: list[str] = Field(
        default_factory=list,
        description="Additional npm/pip packages needed",
    )
    language: str = Field(
        default="typescript",
        description="Primary programming language",
    )


class DesignPreferences(BaseModel):
    """User's design preferences."""
    color_scheme: Optional[str] = Field(
        default=None,
        description="Preferred color scheme description (e.g., 'dark mode, blue accent')",
    )
    style: Optional[str] = Field(
        default=None,
        description="Design style (e.g., 'minimal', 'modern', 'corporate', 'playful')",
    )
    has_logo: bool = Field(
        default=False,
        description="Whether the user has a logo",
    )
    reference_sites: list[str] = Field(
        default_factory=list,
        description="Reference websites for design inspiration",
    )


class ClarificationQuestion(BaseModel):
    """A clarification question for the user."""
    id: str = Field(description="Unique question identifier (e.g., 'q_auth_type')")
    question: str = Field(description="The question text")
    why: str = Field(description="Why this question is important")
    options: list[str] = Field(
        default_factory=list,
        description="Suggested options if applicable",
    )
    default: Optional[str] = Field(
        default=None,
        description="Suggested default value",
    )


# ── Main Models ─────────────────────────────────────────────────────


class StructuredRequirements(BaseModel):
    """Complete structured requirements extracted from user's description."""
    project_name: str = Field(description="Project name")
    project_type: str = Field(
        description="Type: 'portfolio', 'e-commerce', 'blog', 'saas', 'landing', 'dashboard', 'other'",
    )
    summary: str = Field(description="Brief summary of what the website does")

    # Pages and features
    pages: list[PageDefinition] = Field(
        default_factory=list,
        description="All pages/routes identified from the description",
    )
    features: list[FeatureDefinition] = Field(
        default_factory=list,
        description="All features identified from the description",
    )

    # Technology
    technology_stack: TechnologyStack = Field(
        description="Identified or default technology stack",
    )

    # Design
    design_preferences: DesignPreferences = Field(
        default_factory=DesignPreferences,
        description="Design preferences extracted from description",
    )

    # Complexity
    complexity: ProjectComplexity = Field(
        default=ProjectComplexity.MODERATE,
        description="Estimated project complexity",
    )

    # Content
    has_sample_data: bool = Field(
        default=True,
        description="Whether to generate sample/placeholder data",
    )
    target_audience: Optional[str] = Field(
        default=None,
        description="Target audience for the website",
    )

    # Missing info
    assumptions_made: list[str] = Field(
        default_factory=list,
        description="Assumptions made due to missing information",
    )


class ClarificationResult(BaseModel):
    """Result of clarification analysis — questions to ask the user."""
    needs_clarification: bool = Field(
        description="Whether clarification is needed before proceeding",
    )
    questions: list[ClarificationQuestion] = Field(
        default_factory=list,
        description="Questions to ask the user",
    )
    reason: str = Field(
        default="",
        description="Brief explanation of why clarification is needed",
    )


class StackConfirmation(BaseModel):
    """Result of technology stack confirmation."""
    confirmed: bool = Field(
        description="Whether the user confirmed the stack",
    )
    technology_stack: TechnologyStack = Field(
        description="The confirmed technology stack",
    )
    changes_made: list[str] = Field(
        default_factory=list,
        description="Changes made from the original stack based on user input",
    )

