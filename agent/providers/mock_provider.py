"""Devora Agent — Mock / Heuristic LLM Provider for dev mode and unit testing.

Provides deterministic, context-aware structured requirement extraction,
clarification analysis, answer processing, and stack confirmation when
no external Gemini API key is configured or during automated testing.
"""

import json
import re
from typing import Any, Optional

from pydantic import BaseModel

from agent.models.requirements import (
    AuthMethod,
    BackendFramework,
    ClarificationQuestion,
    ClarificationResult,
    DatabaseType,
    DesignPreferences,
    FeatureDefinition,
    Framework,
    PageDefinition,
    ProjectComplexity,
    StructuredRequirements,
    StylingFramework,
    TechnologyStack,
)
from agent.providers.llm_provider import LLMMessage, LLMProvider, LLMResponse


class MockLLMProvider(LLMProvider):
    """Deterministic LLM provider for local dev fallback and testing."""

    def __init__(self, force_clarification: Optional[bool] = None):
        self.force_clarification = force_clarification

    def get_provider_name(self) -> str:
        return "mock_gemini"

    async def generate(
        self,
        messages: list[LLMMessage],
        *,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        prompt_text = "\n".join(m.content for m in messages)
        content = (
            "### Technology Stack Summary\n\n"
            "I have synthesized your project architecture with zero configuration conflicts:\n"
            "- **Frontend Engine:** Next.js (App Router) + TypeScript\n"
            "- **Styling System:** Tailwind CSS with Obsidian Cyan Precision tokens\n"
            "- **Backend & API:** Next.js API Routes / Edge handlers\n"
            "- **Persistence & Auth:** Configured according to your specification\n\n"
            "All routes, component blueprints, and data schemas have been validated."
        )
        if "portfolio" in prompt_text.lower():
            content = (
                "### Portfolio Architecture Summary\n\n"
                "We will build a fast, responsive portfolio website using **Next.js**, "
                "**TypeScript**, and **Tailwind CSS** featuring your project showcase, "
                "interactive skill matrix, and contact form."
            )
        return LLMResponse(
            content=content,
            raw={"provider": "mock_gemini"},
            usage={"input_tokens": 256, "output_tokens": 128},
        )

    async def generate_structured(
        self,
        messages: list[LLMMessage],
        output_schema: type[BaseModel],
        *,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
    ) -> Any:
        user_text = "\n".join(m.content for m in messages)
        lower_text = user_text.lower()

        if output_schema is StructuredRequirements:
            # Check if this is an answer-processing update
            if "previous requirements:" in lower_text and "user's answers:" in lower_text:
                return self._update_requirements_from_answers(user_text)
            return self._extract_requirements(user_text)

        if output_schema is ClarificationResult:
            return self._analyze_clarifications(user_text)

        from agent.models.design import DesignSpecification

        if output_schema is DesignSpecification:
            return DesignSpecification()

        # Fallback generic instantiation
        return output_schema.model_validate({})

    def _extract_requirements(self, text: str) -> StructuredRequirements:
        lower = text.lower()

        # Determine project type
        if any(w in lower for w in ["shop", "store", "e-commerce", "ecommerce", "cart", "checkout", "product"]):
            project_type = "e-commerce"
            complexity = ProjectComplexity.COMPLEX
            default_name = "CommerceFlow Storefront"
        elif any(w in lower for w in ["saas", "subscription", "billing", "tenant", "platform", "crm"]):
            project_type = "saas"
            complexity = ProjectComplexity.COMPLEX
            default_name = "Novastride SaaS Platform"
        elif any(w in lower for w in ["dashboard", "analytics", "telemetry", "fleet", "monitor", "metrics"]):
            project_type = "dashboard"
            complexity = ProjectComplexity.MODERATE
            default_name = "PulseMetrics Telemetry"
        elif any(w in lower for w in ["blog", "article", "cms", "post", "editorial"]):
            project_type = "blog"
            complexity = ProjectComplexity.MODERATE
            default_name = "Editorial Content Hub"
        elif any(w in lower for w in ["landing", "waitlist", "launch", "marketing"]):
            project_type = "landing"
            complexity = ProjectComplexity.SIMPLE
            default_name = "LaunchPad Landing"
        else:
            project_type = "portfolio"
            complexity = ProjectComplexity.SIMPLE
            default_name = "Developer Portfolio"

        # Detect tech stack preferences
        framework = Framework.REACT if "vite" in lower or ("react" in lower and "next" not in lower) else Framework.NEXTJS
        styling = StylingFramework.TAILWIND
        backend = (
            BackendFramework.FASTAPI
            if "fastapi" in lower or "python" in lower
            else BackendFramework.EXPRESS
            if "express" in lower
            else BackendFramework.NONE
            if project_type in ("portfolio", "landing")
            else BackendFramework.NEXTJS_API
        )
        database = (
            DatabaseType.POSTGRESQL
            if "postgres" in lower or "sql" in lower
            else DatabaseType.SUPABASE
            if "supabase" in lower
            else DatabaseType.FIREBASE
            if "firebase" in lower or "firestore" in lower
            else DatabaseType.MONGODB
            if "mongo" in lower
            else DatabaseType.NONE
            if project_type in ("portfolio", "landing")
            else DatabaseType.POSTGRESQL
        )

        auth_methods: list[AuthMethod] = []
        if any(w in lower for w in ["auth", "login", "sign in", "user", "account", "saas", "e-commerce", "dashboard"]):
            auth_methods.append(AuthMethod.EMAIL_PASSWORD)
            if "google" in lower or "oauth" in lower:
                auth_methods.append(AuthMethod.OAUTH_GOOGLE)
        else:
            auth_methods.append(AuthMethod.NONE)

        # Build pages based on project type
        if project_type == "e-commerce":
            pages = [
                PageDefinition(
                    name="Storefront Home",
                    route="/",
                    description="Featured collections, promotional hero banner, and trending products grid.",
                    components=["HeroBanner", "FeaturedGrid", "CategoryFilter", "CartDrawer"],
                    is_authenticated=False,
                ),
                PageDefinition(
                    name="Product Catalog & Detail",
                    route="/products",
                    description="Searchable, filterable product catalog with dynamic SKU detail drawers.",
                    components=["ProductCard", "FacetedSearch", "VariantSelector", "ReviewList"],
                    is_authenticated=False,
                ),
                PageDefinition(
                    name="Checkout & Orders",
                    route="/checkout",
                    description="Multi-step checkout flow with payment integration and order confirmation.",
                    components=["OrderSummary", "ShippingForm", "PaymentWidget"],
                    is_authenticated=True,
                ),
                PageDefinition(
                    name="Merchant Admin",
                    route="/admin/inventory",
                    description="Inventory management table, order fulfillment status, and revenue metrics.",
                    components=["InventoryTable", "OrderPipeline", "RevenueSparkline"],
                    is_authenticated=True,
                ),
            ]
            features = [
                FeatureDefinition(
                    name="Reactive Shopping Cart",
                    description="Persistent client/server cart state with real-time subtotal calculation and stock checks.",
                    priority="must_have",
                    requires_backend=True,
                ),
                FeatureDefinition(
                    name="Catalog Search & Filtering",
                    description="Instant faceted filtering by category, price range, and availability.",
                    priority="must_have",
                    requires_backend=True,
                ),
                FeatureDefinition(
                    name="Checkout & Payment Processing",
                    description="Secure checkout session handling with webhook status reconciliation.",
                    priority="must_have",
                    requires_backend=True,
                ),
            ]
        elif project_type in ("saas", "dashboard"):
            pages = [
                PageDefinition(
                    name="Telemetry & Overview Dashboard",
                    route="/dashboard",
                    description="Real-time KPI cards, interactive time-series charts, and system health stream.",
                    components=["KpiMetricGrid", "TimeSeriesChart", "LiveActivityFeed", "StatusHeader"],
                    is_authenticated=True,
                ),
                PageDefinition(
                    name="Analytics & Diagnostics",
                    route="/analytics",
                    description="Deep-dive metrics exploration, anomaly detection alerts, and CSV/JSON export.",
                    components=["DiagnosticsTable", "FilterToolbar", "AlertDrawer"],
                    is_authenticated=True,
                ),
                PageDefinition(
                    name="Billing & Subscription Plans",
                    route="/billing",
                    description="Tiered plan comparison, usage metering bars, and invoice history.",
                    components=["PlanComparisonGrid", "UsageQuotaBar", "InvoiceTable"],
                    is_authenticated=True,
                ),
                PageDefinition(
                    name="Workspace Settings & API Keys",
                    route="/settings",
                    description="Team member roles, webhook endpoints, and scoped API key management.",
                    components=["RoleMatrix", "ApiKeyGenerator", "AuditLogList"],
                    is_authenticated=True,
                ),
            ]
            features = [
                FeatureDefinition(
                    name="Real-Time Telemetry Stream",
                    description="Reactive data polling and WebSocket event stream for live metric updates.",
                    priority="must_have",
                    requires_backend=True,
                ),
                FeatureDefinition(
                    name="Role-Based Access & Auth",
                    description="Protected routes, session verification, and organization workspace isolation.",
                    priority="must_have",
                    requires_backend=True,
                ),
                FeatureDefinition(
                    name="Interactive Data Visualizations",
                    description="Responsive trend charts, sparklines, and status distribution breakdowns.",
                    priority="should_have",
                    requires_backend=False,
                ),
            ]
        else:
            pages = [
                PageDefinition(
                    name="Home & Hero Showcase",
                    route="/",
                    description="High-impact introduction, featured projects spotlight, and call-to-action.",
                    components=["HeroSection", "ProjectSpotlight", "SkillBadgeCloud"],
                    is_authenticated=False,
                ),
                PageDefinition(
                    name="Projects Gallery",
                    route="/projects",
                    description="Filterable showcase of case studies with live demo links and tech tags.",
                    components=["ProjectGrid", "TagFilterBar", "CaseStudyModal"],
                    is_authenticated=False,
                ),
                PageDefinition(
                    name="About & Experience",
                    route="/about",
                    description="Interactive timeline of engineering experience, education, and open-source work.",
                    components=["ExperienceTimeline", "TechStackMatrix"],
                    is_authenticated=False,
                ),
                PageDefinition(
                    name="Contact & Inquiry",
                    route="/contact",
                    description="Validated contact form with instant feedback and social links.",
                    components=["ContactForm", "SocialLinksCard"],
                    is_authenticated=False,
                ),
            ]
            features = [
                FeatureDefinition(
                    name="Responsive Project Showcase",
                    description="Interactive grid with category filtering and detailed project previews.",
                    priority="must_have",
                    requires_backend=False,
                ),
                FeatureDefinition(
                    name="Contact Form with Validation",
                    description="Client and server-validated inquiry form with confirmation state.",
                    priority="must_have",
                    requires_backend=True,
                ),
                FeatureDefinition(
                    name="Dark-First Precision Theme",
                    description="High-contrast dark UI with smooth transitions and accessible typography.",
                    priority="should_have",
                    requires_backend=False,
                ),
            ]

        return StructuredRequirements(
            project_name=default_name,
            project_type=project_type,
            summary=f"Full-featured {project_type} web application tailored to: {text[:160].strip()}",
            pages=pages,
            features=features,
            technology_stack=TechnologyStack(
                framework=framework,
                styling=styling,
                backend=backend,
                database=database,
                auth_methods=auth_methods,
                additional_libraries=["lucide-react", "zod", "clsx"],
                language="typescript",
            ),
            design_preferences=DesignPreferences(
                color_scheme="dark mode, electric cyan accent (#00F0FF)",
                style="modern precision",
                has_logo=False,
                reference_sites=[],
            ),
            complexity=complexity,
            has_sample_data=True,
            target_audience="Modern web users and teams",
            assumptions_made=[
                "Responsive layout targeting desktop, tablet, and mobile viewports",
                "Pre-seeded realistic sample data for immediate live preview",
                "WCAG AA/AAA high-contrast dark theme tokens enabled by default",
            ],
        )

    def _analyze_clarifications(self, text: str) -> ClarificationResult:
        lower = text.lower()
        needs_clarification = (
            self.force_clarification
            if self.force_clarification is not None
            else any(w in lower for w in ["complex", "e-commerce", "saas", "dashboard"])
        )

        if not needs_clarification:
            return ClarificationResult(
                needs_clarification=False,
                questions=[],
                reason="Requirements are clear and unambiguous for scaffolding.",
            )

        questions = [
            ClarificationQuestion(
                id="q_auth_architecture",
                question="Which authentication flow should be configured for protected routes?",
                why="Determines session middleware and login screen scaffolding.",
                options=[
                    "Email/Password + Google OAuth (Recommended)",
                    "Email/Password only",
                    "Magic Link / Passwordless",
                ],
                default="Email/Password + Google OAuth (Recommended)",
            ),
            ClarificationQuestion(
                id="q_data_seeding",
                question="Should Devora auto-generate realistic seed data for the initial preview?",
                why="Allows charts, tables, and views to render immediately without manual entry.",
                options=[
                    "Yes, auto-seed 25 realistic records",
                    "Minimal seed (3-5 sample items)",
                    "Empty state only",
                ],
                default="Yes, auto-seed 25 realistic records",
            ),
            ClarificationQuestion(
                id="q_realtime_updates",
                question="What data refresh strategy should live views use?",
                why="Affects backend route design and client state polling.",
                options=[
                    "Reactive polling (1,000ms interval)",
                    "WebSocket / SSE live stream (500ms)",
                    "On-demand manual refresh",
                ],
                default="Reactive polling (1,000ms interval)",
            ),
        ]
        return ClarificationResult(
            needs_clarification=True,
            questions=questions,
            reason="Detected architectural options for authentication, data seeding, and live updates.",
        )

    def _update_requirements_from_answers(self, prompt_text: str) -> StructuredRequirements:
        # Extract the JSON block between 'Previous requirements:' and 'Clarification questions asked:'
        match = re.search(
            r"Previous requirements:\s*(\{.*?\})\s*Clarification questions asked:",
            prompt_text,
            re.DOTALL,
        )
        if match:
            try:
                req_dict = json.loads(match.group(1))
                req = StructuredRequirements.model_validate(req_dict)
                # Extract answers section
                ans_match = re.search(r"User's answers:\s*(.*)$", prompt_text, re.DOTALL)
                ans_text = ans_match.group(1).strip() if ans_match else ""
                if ans_text:
                    req.assumptions_made.append(f"Clarified by user: {ans_text[:200]}")
                    if "postgres" in ans_text.lower():
                        req.technology_stack.database = DatabaseType.POSTGRESQL
                    elif "firebase" in ans_text.lower():
                        req.technology_stack.database = DatabaseType.FIREBASE
                    elif "supabase" in ans_text.lower():
                        req.technology_stack.database = DatabaseType.SUPABASE
                    if "oauth" in ans_text.lower() or "google" in ans_text.lower():
                        if AuthMethod.OAUTH_GOOGLE not in req.technology_stack.auth_methods:
                            req.technology_stack.auth_methods.append(AuthMethod.OAUTH_GOOGLE)
                return req
            except Exception:
                pass
        return self._extract_requirements(prompt_text)
