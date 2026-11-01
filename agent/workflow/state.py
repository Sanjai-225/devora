"""Devora Agent — LangGraph state definition.

Defines the shared state that flows through all agent workflow nodes.
"""

from typing import Annotated, Any, Literal, Optional

from langgraph.graph import MessagesState
from pydantic import BaseModel, Field


def merge_lists(left: list, right: list) -> list:
    """Reducer that merges two lists (appends right to left)."""
    return left + right


def replace_value(left: Any, right: Any) -> Any:
    """Reducer that replaces the old value with the new one."""
    return right


class AgentState(MessagesState):
    """Complete agent state for the Devora workflow.
    
    Extends MessagesState to get built-in message handling
    with proper append semantics.
    """

    # ── Identity ────────────────────────────────────────────────────
    user_id: str = ""
    project_id: str = ""

    # ── User Input ──────────────────────────────────────────────────
    user_request: str = ""

    # ── Requirements ────────────────────────────────────────────────
    requirements: Optional[dict] = None  # StructuredRequirements as dict
    clarification_questions: Annotated[list[dict], merge_lists] = []
    clarification_answers: Annotated[list[dict], merge_lists] = []
    needs_clarification: bool = False

    # ── Technology Stack ────────────────────────────────────────────
    confirmed_stack: Optional[dict] = None  # TechnologyStack as dict
    stack_confirmed: bool = False

    # ── Design ──────────────────────────────────────────────────────
    design_choice: Literal["design_first", "direct_code", "pending"] = "pending"
    design_specification: Optional[dict] = None
    design_versions: Annotated[list[dict], merge_lists] = []
    approved_design_version: Optional[str] = None
    design_prototype_code: Optional[str] = None

    # ── Configuration ───────────────────────────────────────────────
    configuration_requirements: Annotated[list[dict], merge_lists] = []
    configuration_values: dict = {}

    # ── Planning ────────────────────────────────────────────────────
    implementation_plan: Optional[dict] = None
    plan_approved: bool = False

    # ── Workspace ───────────────────────────────────────────────────
    workspace_id: Optional[str] = None
    workspace_path: Optional[str] = None

    # ── Code Generation ─────────────────────────────────────────────
    project_files: dict = {}  # path -> hash tracking
    tool_results: Annotated[list[dict], merge_lists] = []

    # ── Build & Test ────────────────────────────────────────────────
    build_results: Optional[dict] = None
    test_results: Optional[dict] = None
    error_history: Annotated[list[dict], merge_lists] = []
    repair_attempts: int = 0

    # ── Preview ─────────────────────────────────────────────────────
    preview_url: Optional[str] = None
    preview_status: str = "stopped"

    # ── Workflow Control ────────────────────────────────────────────
    current_stage: str = "init"
    agent_response: Optional[str] = None  # Latest response to send to user
    error: Optional[str] = None
    should_wait_for_user: bool = False  # Indicates human-in-the-loop pause
    wait_reason: Optional[str] = None   # Why we're waiting (clarification, approval, etc.)

