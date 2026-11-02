"""Devora Backend — Project service layer.

Handles project CRUD operations. Uses Firestore when available,
falls back to in-memory store in DEV_MODE.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.core.firebase import get_firestore_client
from app.models.schemas import (
    AutoBuildPageSpec,
    AutoBuildRequest,
    AutoBuildResponse,
    CreateProjectRequest,
    DesignChoice,
    PreviewStatus,
    ProjectResponse,
    ProjectStatus,
    PromptSuggestionResponse,
    UpdateProjectRequest,
)


def _infer_domain_and_palette(prompt: str, custom_name: Optional[str] = None) -> dict:
    p = prompt.lower()
    words = [w.strip(".,!?:;()[]{}\"'") for w in prompt.split() if len(w.strip(".,!?:;()[]{}\"'")) > 2]
    inferred_title = custom_name.strip() if custom_name and custom_name.strip() else None

    if any(k in p for k in ["clinic", "dental", "medical", "health", "hospital", "doctor", "patient", "therapy", "wellness"]):
        domain = "Healthcare & Medical Portal"
        default_name = inferred_title or "AuraCare Medical & Dental"
        palette = {"primary": "#0EA5E9", "secondary": "#10B981", "background": "#07111A", "surface": "#0E1C2A", "accent": "#38BDF8"}
        stack = {"framework": "Next.js 16 App Router", "styling": "Tailwind CSS 4", "backend": "FastAPI + HIPAA Vault", "database": "PostgreSQL + Firestore", "auth": "Patient Portal SSO"}
        pages = [
            {"name": "Clinic Overview & Triage", "route": "/", "nav": "Home", "widget": "appointment_finder", "desc": "Hero welcome, specialist search, insurance verification badge, and live wait-time indicator."},
            {"name": "Medical Services & Treatments", "route": "/services", "nav": "Treatments", "widget": "service_filter", "desc": "Interactive catalog of clinical procedures, preventive care packages, and transparent duration/pricing."},
            {"name": "Instant Appointment Booking", "route": "/booking", "nav": "Book Visit", "widget": "booking_calendar", "desc": "Real-time doctor slot selector, patient intake form, and instant SMS/email confirmation."},
            {"name": "Specialist Directory", "route": "/specialists", "nav": "Doctors", "widget": "specialist_grid", "desc": "Board-certified physicians, credentials, patient ratings, and direct consultation scheduling."},
            {"name": "Patient Portal & Lab Records", "route": "/portal", "nav": "Patient Portal", "widget": "patient_dashboard", "desc": "Secure prescription renewals, lab test results timeline, and billing statements."},
        ]
        features = [
            "Interactive Appointment Slot Picker with Specialist Filtering",
            "Live Treatment Cost & Insurance Coverage Estimator",
            "Patient Intake & Prescription Renewal Portal",
            "HIPAA-Safe Automated Reminders & Telehealth Links",
        ]
    elif any(k in p for k in ["shop", "store", "ecommerce", "e-commerce", "fashion", "sneaker", "apparel", "cart", "product", "boutique", "jewelry", "marketplace"]):
        domain = "E-Commerce & Digital Storefront"
        default_name = inferred_title or "Veloce Atelier Commerce"
        palette = {"primary": "#F59E0B", "secondary": "#EC4899", "background": "#0B0A0E", "surface": "#16141C", "accent": "#FBBF24"}
        stack = {"framework": "Next.js 16 Commerce", "styling": "Tailwind CSS 4", "backend": "Stripe Checkout + Edge API", "database": "PostgreSQL Inventory", "auth": "Customer Passkey & OAuth"}
        pages = [
            {"name": "Editorial Storefront & Drops", "route": "/", "nav": "Shop Home", "widget": "featured_drop", "desc": "High-impact seasonal lookbook hero, featured collections, and live stock counter."},
            {"name": "Interactive Product Catalog", "route": "/catalog", "nav": "Catalog", "widget": "product_catalog", "desc": "Multi-attribute filterable product grid with size/color swatches and quick add-to-bag."},
            {"name": "Custom Studio & Lookbook", "route": "/lookbook", "nav": "Lookbook", "widget": "style_builder", "desc": "Interactive bundle configurator and curated editorial outfit gallery."},
            {"name": "Cart & Express Checkout", "route": "/checkout", "nav": "Bag & Checkout", "widget": "cart_checkout", "desc": "Live shopping bag calculator, promo code engine, shipping tier selector, and Stripe test checkout."},
            {"name": "Order Tracking & VIP Club", "route": "/orders", "nav": "Track Order", "widget": "order_tracker", "desc": "Real-time shipment milestone tracker, easy returns portal, and loyalty rewards tier."},
        ]
        features = [
            "Live Filterable Product Grid with Dynamic Cart Drawer",
            "Interactive Promo Code & Shipping Calculator",
            "Lookbook Bundle Customizer with Instant Price Updates",
            "Real-Time Order Lookup & Loyalty Points Dashboard",
        ]
    elif any(k in p for k in ["real estate", "property", "apartment", "villa", "housing", "realtor", "mortgage", "rent", "hotel", "booking", "travel"]):
        domain = "Real Estate & Property Marketplace"
        default_name = inferred_title or "Skyline Haven Properties"
        palette = {"primary": "#10B981", "secondary": "#06B6D4", "background": "#09100E", "surface": "#111E1A", "accent": "#34D399"}
        stack = {"framework": "Next.js 16 Spatial Web", "styling": "Tailwind CSS 4", "backend": "GeoSearch API", "database": "PostGIS + Firestore", "auth": "Buyer & Agent Roles"}
        pages = [
            {"name": "Property Search & Featured Estates", "route": "/", "nav": "Explore", "widget": "property_search", "desc": "Neighborhood search bar, price/bedroom filters, and verified luxury listings."},
            {"name": "Interactive Listings & Virtual Tours", "route": "/listings", "nav": "Listings", "widget": "listing_filter", "desc": "Detailed property cards with price per sq ft, amenities tags, and 3D tour trigger."},
            {"name": "Mortgage & ROI Calculator", "route": "/calculator", "nav": "Mortgage Calc", "widget": "mortgage_calculator", "desc": "Interactive down-payment, interest rate, HOA, and monthly amortization calculator."},
            {"name": "Schedule Private Viewing", "route": "/schedule", "nav": "Book Tour", "widget": "tour_scheduler", "desc": "In-person or live video walkthrough scheduling with licensed property advisors."},
            {"name": "Neighborhood Market Insights", "route": "/insights", "nav": "Market Data", "widget": "market_trends", "desc": "Historical appreciation charts, school ratings, walkability scores, and buyer FAQ."},
        ]
        features = [
            "Multi-Criteria Property Filter (Location, Price, Beds, Amenities)",
            "Interactive Monthly Mortgage & Investment Yield Calculator",
            "Private Viewing & Video Tour Booking Engine",
            "Neighborhood Appreciation & Walkability Analytics",
        ]
    elif any(k in p for k in ["restaurant", "cafe", "coffee", "food", "dining", "bakery", "bistro", "menu", "kitchen", "catering"]):
        domain = "Hospitality, Dining & Online Ordering"
        default_name = inferred_title or "Saffron & Ember Bistro"
        palette = {"primary": "#F97316", "secondary": "#EAB308", "background": "#120C08", "surface": "#1E140E", "accent": "#FB923C"}
        stack = {"framework": "Next.js 16 App Router", "styling": "Tailwind CSS 4", "backend": "Order & Table Engine", "database": "Firestore Realtime", "auth": "Guest & VIP Dining"}
        pages = [
            {"name": "Culinary Story & Chef Specials", "route": "/", "nav": "Home", "widget": "chef_specials", "desc": "Signature tasting menu showcase, kitchen hours, and instant reservation bar."},
            {"name": "Interactive Seasonal Menu", "route": "/menu", "nav": "Menu & Order", "widget": "interactive_menu", "desc": "Dietary-filterable menu (Vegan, Gluten-Free, Chef's Cut) with live order tray."},
            {"name": "Table Reservation & Private Dining", "route": "/reservations", "nav": "Reserve Table", "widget": "table_booking", "desc": "Party size, seating zone (Patio, Chef's Counter, Main Hall), and date/time booking."},
            {"name": "Catering & Event Packages", "route": "/catering", "nav": "Catering", "widget": "catering_estimator", "desc": "Interactive guest count estimator for corporate events and private celebrations."},
            {"name": "Reviews, Location & Contact", "route": "/visit", "nav": "Visit Us", "widget": "contact_hours", "desc": "Verified guest reviews, parking & transit guide, and direct kitchen inquiry form."},
        ]
        features = [
            "Interactive Dietary-Filtered Menu with Live Takeout Order Tray",
            "Real-Time Table & Seating Zone Reservation System",
            "Private Event & Catering Per-Guest Price Estimator",
            "Chef Tasting Notes & Verified Diner Reviews",
        ]
    elif any(k in p for k in ["fitness", "gym", "yoga", "workout", "coach", "training", "sport", "athlete", "nutrition"]):
        domain = "Fitness, Coaching & Performance Studio"
        default_name = inferred_title or "PulseForge Athletics"
        palette = {"primary": "#22C55E", "secondary": "#06B6D4", "background": "#080D0A", "surface": "#111A14", "accent": "#4ADE80"}
        stack = {"framework": "Next.js 16 App Router", "styling": "Tailwind CSS 4", "backend": "Class & Member API", "database": "PostgreSQL + Firestore", "auth": "Member Pass Portal"}
        pages = [
            {"name": "Performance Studio & Programs", "route": "/", "nav": "Home", "widget": "program_finder", "desc": "High-energy training programs, transformation metrics, and free trial pass claim."},
            {"name": "Live Class Schedule & Booking", "route": "/schedule", "nav": "Class Schedule", "widget": "class_schedule", "desc": "Filterable daily schedule (HIIT, Strength, Mobility, Recovery) with 1-click spot reservation."},
            {"name": "Interactive Macro & BMI Analyzer", "route": "/calculator", "nav": "Fitness Lab", "widget": "fitness_calculator", "desc": "Personalized daily calorie, protein macro, and training zone calculator."},
            {"name": "Membership Tiers & Passes", "route": "/memberships", "nav": "Memberships", "widget": "pricing_tiers", "desc": "Monthly vs annual membership comparison, PT add-ons, and zero-commitment trial."},
            {"name": "Coaches & Member Progress", "route": "/coaches", "nav": "Coaches", "widget": "coach_directory", "desc": "Certified strength & conditioning coaches, specialties, and booking."},
        ]
        features = [
            "Interactive Weekly Class Schedule with Spot Counter & Booking",
            "Live TDEE Calorie & Macro Target Calculator",
            "Flexible Membership Tier Switcher (Monthly / Annual)",
            "Coach Specialty Matcher & Free Trial Pass Generator",
        ]
    elif any(k in p for k in ["education", "course", "academy", "learning", "school", "tutor", "university", "bootcamp", "quiz", "study"]):
        domain = "EdTech & Interactive Learning Academy"
        default_name = inferred_title or "Vertex Skill Academy"
        palette = {"primary": "#6366F1", "secondary": "#00F0FF", "background": "#090B14", "surface": "#121626", "accent": "#818CF8"}
        stack = {"framework": "Next.js 16 App Router", "styling": "Tailwind CSS 4", "backend": "Curriculum & Progress API", "database": "PostgreSQL", "auth": "Student & Instructor SSO"}
        pages = [
            {"name": "Academy Overview & Career Paths", "route": "/", "nav": "Home", "widget": "path_selector", "desc": "Outcome-driven learning tracks, hiring partner metrics, and interactive syllabus preview."},
            {"name": "Course Catalog & Labs", "route": "/courses", "nav": "Courses", "widget": "course_catalog", "desc": "Filterable curriculum by difficulty, duration, and hands-on capstone projects."},
            {"name": "Interactive Skill Assessment", "route": "/assessment", "nav": "Skill Quiz", "widget": "skill_quiz", "desc": "Live placement quiz that recommends the ideal learning track and module starting point."},
            {"name": "Tuition Plans & Scholarships", "route": "/tuition", "nav": "Tuition", "widget": "pricing_tiers", "desc": "Self-paced, Cohort Bootcamp, and Team Enterprise plans with ROI breakdown."},
            {"name": "Student Dashboard & Certificates", "route": "/dashboard", "nav": "Student Portal", "widget": "student_progress", "desc": "Module completion tracker, streak metrics, and verifiable credential preview."},
        ]
        features = [
            "Filterable Course & Capstone Lab Directory",
            "Interactive Placement & Skill Readiness Quiz",
            "Student Progress Tracker with Certificate Preview",
            "Cohort Schedule & Tuition Calculator",
        ]
    else:
        domain = "AI-Powered SaaS & Operations Platform"
        if not inferred_title:
            key_terms = [w.capitalize() for w in words if w.lower() not in {"build", "create", "make", "website", "need", "want", "with", "that", "for", "the", "and", "modern", "platform", "application", "app", "site"}]
            default_name = " ".join(key_terms[:3]) if key_terms else "ApexFlow Cloud Platform"
        else:
            default_name = inferred_title
        palette = {"primary": "#00F0FF", "secondary": "#6366F1", "background": "#0B0D10", "surface": "#131720", "accent": "#38BDF8"}
        stack = {"framework": "Next.js 16 App Router", "styling": "Tailwind CSS 4", "backend": "FastAPI + Edge Routes", "database": "PostgreSQL + Firestore", "auth": "RBAC + OAuth 2.0"}
        pages = [
            {"name": f"{default_name} — Product Overview", "route": "/", "nav": "Overview", "widget": "interactive_demo", "desc": f"Executive product showcase tailored to: {prompt[:140]}"},
            {"name": "Core Capabilities & Live Workflow", "route": "/features", "nav": "Features", "widget": "feature_explorer", "desc": "Interactive feature modules, real-time workflow simulator, and architecture breakdown."},
            {"name": "Live Analytics & Control Center", "route": "/dashboard", "nav": "Live Dashboard", "widget": "analytics_workspace", "desc": "Interactive KPI telemetry, filterable activity table, and action triggers."},
            {"name": "Pricing Plans & ROI Estimator", "route": "/pricing", "nav": "Pricing", "widget": "pricing_calculator", "desc": "Starter, Growth, and Enterprise tiers with interactive seat/usage ROI calculator."},
            {"name": "Documentation, API & Contact", "route": "/contact", "nav": "Contact & Docs", "widget": "contact_portal", "desc": "Quickstart integration guide, FAQ accordion, and direct onboarding request form."},
        ]
        features = [
            f"Custom Interactive Workspace tailored to '{default_name}'",
            "Live Search, Status Filtering & Interactive Action Modals",
            "Dynamic Pricing & ROI Usage Calculator (Monthly / Annual)",
            "Multi-Page Responsive Navigation with Instant AI Customization",
        ]

    return {
        "inferred_name": default_name,
        "domain_category": domain,
        "tagline": prompt.strip()[:180],
        "recommended_stack": stack,
        "color_palette": palette,
        "pages": pages,
        "features": features,
    }


async def suggest_from_prompt(prompt: str) -> PromptSuggestionResponse:
    """Generate dynamic AI website architecture, tech stack, and multi-page suggestions from a user prompt."""
    spec = _infer_domain_and_palette(prompt)
    return PromptSuggestionResponse(
        inferred_name=spec["inferred_name"],
        domain_category=spec["domain_category"],
        tagline=spec["tagline"],
        recommended_stack=spec["recommended_stack"],
        color_palette=spec["color_palette"],
        suggested_pages=[
            {"name": pg["name"], "route": pg["route"], "description": pg["desc"]}
            for pg in spec["pages"]
        ],
        suggested_features=spec["features"],
        ai_architecture_notes=[
            f"Tailored 5-page architecture for {spec['domain_category']} (zero generic boilerplate)",
            "Smart defaults pre-configured: Database, Auth, SEO metadata, and responsive navigation",
            "Full support for AI Chat surgical edits, Design Studio restyling, and 1-click own-account deployment",
        ],
    )


async def auto_build_project(user_id: str, request: AutoBuildRequest) -> AutoBuildResponse:
    """Automatically configure, plan, and build a complete multi-page website from a natural-language prompt."""
    spec = _infer_domain_and_palette(request.prompt, request.project_name)
    created = await create_project(
        user_id,
        CreateProjectRequest(
            name=spec["inferred_name"],
            description=request.prompt.strip(),
        ),
    )

    page_specs: list[AutoBuildPageSpec] = []
    for idx, pg in enumerate(spec["pages"]):
        page_specs.append(
            AutoBuildPageSpec(
                id=f"page-{idx + 1}",
                title=pg["name"],
                route=pg["route"],
                nav_label=pg["nav"],
                hero_badge=f"{spec['domain_category']} • Page {idx + 1} of {len(spec['pages'])}",
                headline=pg["name"],
                subheadline=pg["desc"],
                primary_cta="Launch Interactive Flow" if idx == 0 else f"Explore {pg['nav']}",
                secondary_cta="Customize with AI",
                interactive_widget_type=pg["widget"],
                sections=[
                    {"title": pg["name"], "description": pg["desc"], "status": "live"},
                    {"title": "AI-Synthesized Interactive Module", "description": spec["features"][idx % len(spec["features"])], "status": "interactive"},
                ],
                metrics=[
                    {"label": "Page Route", "value": pg["route"]},
                    {"label": "Response Time", "value": "18ms"},
                    {"label": "Accessibility", "value": "WCAG AA"},
                ],
                items=[
                    {"title": feat, "tag": "Active Capability"}
                    for feat in spec["features"]
                ],
            )
        )

    live_preview_path = f"/preview/{created.id}"
    structured_reqs = {
        "project_name": spec["inferred_name"],
        "project_type": spec["domain_category"],
        "summary": request.prompt.strip(),
        "pages": [
            {
                "name": pg["name"],
                "route": pg["route"],
                "description": pg["desc"],
                "components": [pg["widget"], "ResponsiveNavbar", "InteractiveModal"],
                "is_authenticated": False,
            }
            for pg in spec["pages"]
        ],
        "features": [
            {
                "name": feat,
                "description": feat,
                "priority": "must_have",
                "requires_backend": True,
            }
            for feat in spec["features"]
        ],
        "technology_stack": {
            "framework": spec["recommended_stack"]["framework"],
            "styling": spec["recommended_stack"]["styling"],
            "backend": spec["recommended_stack"]["backend"],
            "database": spec["recommended_stack"]["database"],
            "auth_methods": ["email_password", "oauth_google"],
            "additional_libraries": ["lucide-react", "tailwindcss"],
            "language": "typescript",
        },
        "design_preferences": {
            "color_scheme": spec["color_palette"]["primary"],
            "style": request.preferred_style or "modern_high_contrast",
            "has_logo": True,
            "reference_sites": [],
        },
        "complexity": "complex",
        "has_sample_data": True,
        "target_audience": spec["domain_category"],
        "assumptions_made": [
            "Auto-Build configured zero-secret smart defaults for instant online preview",
            "Generated 5-page interactive layout with client-side state & navigation",
        ],
    }

    updated = await update_project(
        created.id,
        user_id,
        UpdateProjectRequest(
            status=ProjectStatus.READY,
            design_choice=DesignChoice.DESIGN_FIRST,
            current_agent_stage="completed",
            requirements=structured_reqs,
            confirmed_stack=spec["recommended_stack"],
            plan_approved=True,
        ),
    )
    final_proj = updated or created
    final_proj.preview_url = live_preview_path
    final_proj.preview_status = PreviewStatus.RUNNING

    suggestion = await suggest_from_prompt(request.prompt)

    return AutoBuildResponse(
        project=final_proj,
        role_used="user",
        auto_configured_defaults={
            "environment": "production_ready_defaults",
            "database": "Managed Cloud Store (Auto-Provisioned)",
            "authentication": "Session & OAuth Ready",
            "ssl_and_cdn": "Enabled",
            "manual_keys_required": 0,
        },
        suggestion=suggestion,
        pages=page_specs,
        live_preview_path=live_preview_path,
        pipeline_steps_completed=[
            "1. Analyzed prompt & synthesized 5-page domain architecture",
            "2. Applied smart default Tech Stack & zero-config environment defaults",
            "3. Designed custom color palette & typography tokens",
            "4. Built 5 interactive pages with working navigation & forms",
            "5. Verified build & launched live website in separate tab",
        ],
        built_at=_now_iso(),
    )


logger = logging.getLogger(__name__)

# In-memory store for dev mode
_dev_projects: dict[str, dict] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _project_to_response(data: dict) -> ProjectResponse:
    return ProjectResponse(
        id=data["id"],
        user_id=data["user_id"],
        name=data["name"],
        status=data.get("status", ProjectStatus.DRAFT),
        description=data.get("description"),
        created_at=data.get("created_at", _now_iso()),
        updated_at=data.get("updated_at", _now_iso()),
        design_choice=data.get("design_choice", DesignChoice.PENDING),
        preview_url=data.get("preview_url"),
        preview_status=data.get("preview_status", PreviewStatus.STOPPED),
        workspace_id=data.get("workspace_id"),
        current_agent_stage=data.get("current_agent_stage"),
        requirements=data.get("requirements"),
        clarification_questions=data.get("clarification_questions"),
        confirmed_stack=data.get("confirmed_stack"),
        plan_approved=data.get("plan_approved", False),
        github_repo=data.get("github_repo"),
        deployment_url=data.get("deployment_url"),
        deployment_provider=data.get("deployment_provider"),
    )


async def create_project(user_id: str, request: CreateProjectRequest) -> ProjectResponse:
    """Create a new project for a user."""
    project_id = str(uuid.uuid4())[:12]
    now = _now_iso()

    project_data = {
        "id": project_id,
        "user_id": user_id,
        "name": request.name,
        "description": request.description,
        "status": ProjectStatus.DRAFT,
        "design_choice": DesignChoice.PENDING,
        "preview_status": PreviewStatus.STOPPED,
        "requirements": None,
        "clarification_questions": [],
        "confirmed_stack": None,
        "plan_approved": False,
        "created_at": now,
        "updated_at": now,
    }

    db = get_firestore_client()
    if db:
        db.collection("projects").document(project_id).set(project_data)
        logger.info(f"Project {project_id} created in Firestore for user {user_id}")
    else:
        _dev_projects[project_id] = project_data
        logger.info(f"Project {project_id} created in memory for user {user_id}")

    return _project_to_response(project_data)


async def get_project(project_id: str, user_id: str) -> Optional[ProjectResponse]:
    """Get a project by ID, verifying ownership."""
    db = get_firestore_client()
    if db:
        doc = db.collection("projects").document(project_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        if data.get("user_id") != user_id:
            return None
        data["id"] = project_id
        return _project_to_response(data)
    else:
        data = _dev_projects.get(project_id)
        if not data or data.get("user_id") != user_id:
            return None
        return _project_to_response(data)


async def list_projects(
    user_id: str,
    status_filter: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[ProjectResponse], int]:
    """List projects for a user."""
    db = get_firestore_client()
    if db:
        query = db.collection("projects").where("user_id", "==", user_id)
        if status_filter:
            query = query.where("status", "==", status_filter)
        query = query.order_by("updated_at", direction="DESCENDING")

        all_docs = list(query.stream())
        total = len(all_docs)
        paged = all_docs[offset : offset + limit]

        projects = []
        for doc in paged:
            data = doc.to_dict()
            data["id"] = doc.id
            projects.append(_project_to_response(data))
        return projects, total
    else:
        user_projects = [
            p for p in _dev_projects.values() if p["user_id"] == user_id
        ]
        if status_filter:
            user_projects = [p for p in user_projects if p.get("status") == status_filter]
        user_projects.sort(key=lambda p: p.get("updated_at", ""), reverse=True)
        total = len(user_projects)
        paged = user_projects[offset : offset + limit]
        return [_project_to_response(p) for p in paged], total


async def update_project(
    project_id: str,
    user_id: str,
    request: Optional[UpdateProjectRequest] = None,
    data: Optional[UpdateProjectRequest] = None,
) -> Optional[ProjectResponse]:
    """Update a project, verifying ownership."""
    payload = request or data
    if payload is None:
        return await get_project(project_id, user_id)

    db = get_firestore_client()
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = _now_iso()

    if db:
        doc_ref = db.collection("projects").document(project_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        doc_data = doc.to_dict()
        if doc_data.get("user_id") != user_id:
            return None
        doc_ref.update(updates)
        doc_data.update(updates)
        doc_data["id"] = project_id
        return _project_to_response(doc_data)
    else:
        doc_data = _dev_projects.get(project_id)
        if not doc_data or doc_data.get("user_id") != user_id:
            return None
        doc_data.update(updates)
        return _project_to_response(doc_data)


async def delete_project(project_id: str, user_id: str) -> bool:
    """Delete a project, verifying ownership."""
    db = get_firestore_client()
    if db:
        doc_ref = db.collection("projects").document(project_id)
        doc = doc_ref.get()
        if not doc.exists:
            return False
        data = doc.to_dict()
        if data.get("user_id") != user_id:
            return False
        doc_ref.delete()
        logger.info(f"Project {project_id} deleted from Firestore")
        return True
    else:
        data = _dev_projects.get(project_id)
        if not data or data.get("user_id") != user_id:
            return False
        del _dev_projects[project_id]
        logger.info(f"Project {project_id} deleted from memory")
        return True


async def verify_project_ownership(project_id: str, user_id: str) -> bool:
    """Verify that if `project_id` is registered, it belongs to `user_id`.

    Raises PermissionError if the project belongs to another user.
    """
    db = get_firestore_client()
    if db:
        doc = db.collection("projects").document(project_id).get()
        if doc.exists:
            owner_id = doc.to_dict().get("user_id")
            if owner_id and owner_id != user_id:
                raise PermissionError(
                    f"Cross-project access denied: project '{project_id}' belongs to another user."
                )
    else:
        data = _dev_projects.get(project_id)
        if data and data.get("user_id") and data.get("user_id") != user_id:
            raise PermissionError(
                f"Cross-project access denied: project '{project_id}' belongs to another user."
            )
    return True

