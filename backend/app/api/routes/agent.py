"""Devora Backend — Agent REST & WebSocket gateway routes.

Handles starting requirement analysis, processing user clarifications
and stack approvals, retrieving conversation history, and streaming
real-time agent updates over WebSocket.
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status

# Ensure root repository directory is on sys.path so `agent` package can be imported
_REPO_ROOT = str(Path(__file__).resolve().parents[4])
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from agent.workflow.agent_manager import AgentManager
from app.core.config import settings
from app.core.firebase import verify_firebase_token
from app.middleware.auth import AuthenticatedUser, get_current_user
from app.models.schemas import (
    AgentMessageRequest,
    AgentStartRequest,
    AgentStateResponse,
    ConversationListResponse,
    DesignChoice,
    ProjectStatus,
    UpdateProjectRequest,
)
from app.services import conversation_service, project_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}", tags=["agent"])

# Singleton AgentManager instance
_agent_manager: Optional[AgentManager] = None


async def get_agent_manager() -> AgentManager:
    """Get or initialize the global AgentManager singleton."""
    global _agent_manager
    if _agent_manager is None:
        api_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
        checkpoint_path = (
            os.environ.get("CHECKPOINT_DB_PATH")
            or settings.checkpoint_db_path
            or os.path.join(settings.workspaces_dir, "checkpoints", "agent.db")
        )
        _agent_manager = AgentManager(
            gemini_api_key=api_key,
            checkpoint_path=checkpoint_path,
        )
        await _agent_manager.initialize()
    return _agent_manager


async def shutdown_agent_manager() -> None:
    """Cleanup global AgentManager on app shutdown."""
    global _agent_manager
    if _agent_manager is not None:
        await _agent_manager.cleanup()
        _agent_manager = None


def _stage_to_project_status(
    stage: str, should_wait: bool, wait_reason: Optional[str]
) -> ProjectStatus:
    """Map an agent workflow stage to a ProjectStatus enum value."""
    if wait_reason == "clarification" or stage == "clarification":
        return ProjectStatus.CLARIFYING
    if wait_reason == "stack_confirmation" or stage in ("stack_confirmation", "stack_confirmed"):
        return ProjectStatus.PLANNING
    if stage == "design_chosen":
        return ProjectStatus.DESIGNING
    if stage in ("requirement_analysis", "answer_processing"):
        return ProjectStatus.ANALYZING
    return ProjectStatus.ANALYZING


async def _authenticate_ws(websocket: WebSocket) -> Optional[AuthenticatedUser]:
    """Authenticate a WebSocket connection using query token, header, or dev mode."""
    token = websocket.query_params.get("token")
    if not token:
        auth_header = websocket.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

    if settings.dev_mode and not settings.firebase_project_id:
        return AuthenticatedUser(
            uid="dev-user-001",
            email="dev@devora.local",
            name="Dev User",
            picture=None,
        )

    if not token:
        return None

    decoded = await verify_firebase_token(token)
    if not decoded:
        return None

    return AuthenticatedUser(
        uid=decoded.get("uid", ""),
        email=decoded.get("email", ""),
        name=decoded.get("name", decoded.get("email", "")),
        picture=decoded.get("picture"),
    )


@router.post("/agent/start", response_model=AgentStateResponse)
async def start_project_agent(
    project_id: str,
    request: Optional[AgentStartRequest] = None,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Start requirement analysis for a project."""
    project = await project_service.get_project(project_id, user.uid)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found"},
        )

    prompt = (
        request.message
        if request and request.message
        else project.description or f"Build a website named {project.name}"
    )

    # Mark project as analyzing
    await project_service.update_project(
        project_id,
        user.uid,
        UpdateProjectRequest(
            status=ProjectStatus.ANALYZING,
            current_agent_stage="requirement_analysis",
        ),
    )

    # Record user prompt in conversation history
    await conversation_service.add_message(
        project_id=project_id,
        role="user",
        content=prompt,
        stage="requirement_analysis",
    )

    manager = await get_agent_manager()
    session = manager.get_session(project_id=project_id, user_id=user.uid)

    events: list[dict] = []
    latest_response: Optional[str] = None
    current_stage = "requirement_analysis"
    should_wait = False
    wait_reason: Optional[str] = None
    requirements: Optional[dict] = None
    clarification_questions: list[dict] = []
    confirmed_stack: Optional[dict] = None

    async for event in session.start_analysis(prompt):
        events.append(event)
        current_stage = event.get("stage", current_stage)
        should_wait = event.get("should_wait", should_wait)
        wait_reason = event.get("wait_reason", wait_reason)
        if event.get("requirements"):
            requirements = event["requirements"]
        if event.get("clarification_questions") is not None:
            clarification_questions = event["clarification_questions"]
        if event.get("confirmed_stack"):
            confirmed_stack = event["confirmed_stack"]
        if event.get("response"):
            latest_response = event["response"]
            await conversation_service.add_message(
                project_id=project_id,
                role="agent",
                content=event["response"],
                stage=current_stage,
                metadata={
                    "node": event.get("node"),
                    "wait_reason": wait_reason,
                    "clarification_questions": clarification_questions,
                },
            )

    new_status = _stage_to_project_status(current_stage, should_wait, wait_reason)
    updated_project = await project_service.update_project(
        project_id,
        user.uid,
        UpdateProjectRequest(
            status=new_status,
            current_agent_stage=current_stage,
            requirements=requirements,
            clarification_questions=clarification_questions,
            confirmed_stack=confirmed_stack,
        ),
    )

    messages = await conversation_service.list_messages(project_id)
    return AgentStateResponse(
        project_id=project_id,
        status=updated_project.status if updated_project else new_status,
        current_stage=current_stage,
        requirements=requirements,
        clarification_questions=clarification_questions,
        confirmed_stack=confirmed_stack,
        design_choice=updated_project.design_choice if updated_project else DesignChoice.PENDING,
        should_wait_for_user=should_wait,
        wait_reason=wait_reason,
        latest_response=latest_response,
        messages=messages,
        events=events,
    )


@router.post("/agent/message", response_model=AgentStateResponse)
async def send_agent_message(
    project_id: str,
    request: AgentMessageRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Send a user message, clarification response, or stack approval to the project agent."""
    project = await project_service.get_project(project_id, user.uid)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found"},
        )

    manager = await get_agent_manager()
    session = manager.get_session(project_id=project_id, user_id=user.uid)

    # Ensure session has existing project requirements if restarted
    state = await session.get_current_state()
    if state and not state.get("requirements") and project.requirements:
        session._state["requirements"] = project.requirements
        session._state["clarification_questions"] = project.clarification_questions or []
        session._state["confirmed_stack"] = project.confirmed_stack
        session._state["user_request"] = project.description or ""

    if request.type == "clarification_response":
        input_type = "clarification"
        user_payload: str | dict = request.answers or (request.content or "")
        user_display = (
            "\n".join(f"- **{k}**: {v}" for k, v in request.answers.items())
            if request.answers
            else (request.content or "Submitted clarification answers")
        )
    elif request.type == "user_approval":
        input_type = "stack_confirmation"
        user_payload = request.choice or ("proceed" if request.approved else (request.content or "modify"))
        user_display = f"Decision: {user_payload}"
    else:
        # Check if we are currently waiting for clarification or stack confirmation
        curr_wait = state.get("wait_reason") if state else None
        if curr_wait == "clarification":
            input_type = "clarification"
        elif curr_wait == "stack_confirmation":
            input_type = "stack_confirmation"
        else:
            input_type = "message"
        user_payload = request.content or ""
        user_display = request.content or ""

    await conversation_service.add_message(
        project_id=project_id,
        role="user",
        content=user_display,
        stage=project.current_agent_stage or "clarification",
        metadata={"type": request.type, "answers": request.answers},
    )

    events: list[dict] = []
    latest_response: Optional[str] = None
    current_stage = project.current_agent_stage or "requirement_analysis"
    should_wait = False
    wait_reason: Optional[str] = None
    requirements = project.requirements
    clarification_questions = project.clarification_questions or []
    confirmed_stack = project.confirmed_stack
    design_choice = project.design_choice

    async for event in session.resume_with_input(user_payload, input_type=input_type):
        events.append(event)
        current_stage = event.get("stage", current_stage)
        should_wait = event.get("should_wait", False)
        wait_reason = event.get("wait_reason")
        if event.get("requirements"):
            requirements = event["requirements"]
        if event.get("clarification_questions") is not None:
            clarification_questions = event["clarification_questions"]
        if event.get("confirmed_stack"):
            confirmed_stack = event["confirmed_stack"]
        if event.get("design_choice"):
            try:
                design_choice = DesignChoice(event["design_choice"])
            except ValueError:
                pass
        if event.get("response"):
            latest_response = event["response"]
            await conversation_service.add_message(
                project_id=project_id,
                role="agent",
                content=event["response"],
                stage=current_stage,
                metadata={
                    "node": event.get("node"),
                    "type": event.get("type"),
                    "wait_reason": wait_reason,
                },
            )

    new_status = _stage_to_project_status(current_stage, should_wait, wait_reason)
    updated_project = await project_service.update_project(
        project_id,
        user.uid,
        UpdateProjectRequest(
            status=new_status,
            design_choice=design_choice,
            current_agent_stage=current_stage,
            requirements=requirements,
            clarification_questions=clarification_questions,
            confirmed_stack=confirmed_stack,
        ),
    )

    messages = await conversation_service.list_messages(project_id)
    return AgentStateResponse(
        project_id=project_id,
        status=updated_project.status if updated_project else new_status,
        current_stage=current_stage,
        requirements=requirements,
        clarification_questions=clarification_questions,
        confirmed_stack=confirmed_stack,
        design_choice=design_choice,
        should_wait_for_user=should_wait,
        wait_reason=wait_reason,
        latest_response=latest_response,
        messages=messages,
        events=events,
    )


@router.get("/agent/state", response_model=AgentStateResponse)
async def get_project_agent_state(
    project_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Get the current requirement analysis & agent state for a project."""
    project = await project_service.get_project(project_id, user.uid)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found"},
        )

    manager = await get_agent_manager()
    session = manager.get_session(project_id=project_id, user_id=user.uid)
    state = await session.get_current_state() or {}

    requirements = state.get("requirements") or project.requirements
    clarification_questions = (
        state.get("clarification_questions")
        if state.get("clarification_questions")
        else (project.clarification_questions or [])
    )
    confirmed_stack = state.get("confirmed_stack") or project.confirmed_stack
    current_stage = (
        state.get("current_stage")
        if state.get("current_stage") and state.get("current_stage") != "init"
        else (project.current_agent_stage or "init")
    )
    messages = await conversation_service.list_messages(project_id)

    return AgentStateResponse(
        project_id=project_id,
        status=project.status,
        current_stage=current_stage,
        requirements=requirements,
        clarification_questions=clarification_questions,
        confirmed_stack=confirmed_stack,
        design_choice=project.design_choice,
        should_wait_for_user=bool(state.get("should_wait_for_user", False)),
        wait_reason=state.get("wait_reason"),
        latest_response=state.get("agent_response"),
        messages=messages,
        events=[],
    )


@router.get("/conversations", response_model=ConversationListResponse)
async def get_project_conversations(
    project_id: str,
    limit: int = Query(100, ge=1, le=500),
    before: Optional[str] = Query(None),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Get conversation history for a project."""
    project = await project_service.get_project(project_id, user.uid)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found"},
        )

    messages = await conversation_service.list_messages(
        project_id=project_id,
        limit=limit,
        before=before,
    )
    return ConversationListResponse(messages=messages, total=len(messages))


@router.websocket("/agent/ws")
async def project_agent_websocket(websocket: WebSocket, project_id: str):
    """Real-time WebSocket gateway for agent communication."""
    user = await _authenticate_ws(websocket)
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    project = await project_service.get_project(project_id, user.uid)
    if not project:
        await websocket.close(code=4004, reason="Project not found")
        return

    await websocket.accept()
    logger.info(f"WebSocket connected for project {project_id} (user {user.uid})")

    manager = await get_agent_manager()
    session = manager.get_session(project_id=project_id, user_id=user.uid)

    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                payload = json.loads(raw_text)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON message format",
                    "recoverable": True,
                })
                continue

            msg_type = payload.get("type", "user_message")

            if msg_type == "start_analysis":
                prompt = payload.get("content") or project.description or f"Build {project.name}"
                await conversation_service.add_message(
                    project_id=project_id,
                    role="user",
                    content=prompt,
                    stage="requirement_analysis",
                )
                await websocket.send_json({
                    "type": "stage_update",
                    "stage": "requirement_analysis",
                    "progress": "Analyzing natural language requirements...",
                })

                async for event in session.start_analysis(prompt):
                    await _emit_ws_event(websocket, project_id, user.uid, event)

            elif msg_type == "clarification_response":
                answers = payload.get("answers") or {}
                content = payload.get("content") or json.dumps(answers)
                await conversation_service.add_message(
                    project_id=project_id,
                    role="user",
                    content=content,
                    stage="clarification",
                    metadata={"answers": answers},
                )
                await websocket.send_json({
                    "type": "stage_update",
                    "stage": "answer_processing",
                    "progress": "Updating requirements with your clarifications...",
                })

                async for event in session.resume_with_input(
                    answers if answers else content,
                    input_type="clarification",
                ):
                    await _emit_ws_event(websocket, project_id, user.uid, event)

            elif msg_type == "user_approval":
                choice = payload.get("choice") or (
                    "proceed" if payload.get("approved", True) else "modify"
                )
                await conversation_service.add_message(
                    project_id=project_id,
                    role="user",
                    content=f"Approval decision: {choice}",
                    stage=payload.get("stage", "stack_confirmation"),
                )
                async for event in session.resume_with_input(
                    choice,
                    input_type="stack_confirmation",
                ):
                    await _emit_ws_event(websocket, project_id, user.uid, event)

            else:
                content = payload.get("content", "")
                await conversation_service.add_message(
                    project_id=project_id,
                    role="user",
                    content=content,
                    stage="requirement_analysis",
                )
                state = await session.get_current_state() or {}
                wait_reason = state.get("wait_reason")
                input_type = (
                    "clarification"
                    if wait_reason == "clarification"
                    else "stack_confirmation"
                    if wait_reason == "stack_confirmation"
                    else "message"
                )
                async for event in session.resume_with_input(content, input_type=input_type):
                    await _emit_ws_event(websocket, project_id, user.uid, event)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for project {project_id}")
    except Exception as e:
        logger.error(f"WebSocket error for project {project_id}: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
                "recoverable": True,
            })
        except Exception:
            pass


async def _emit_ws_event(
    websocket: WebSocket,
    project_id: str,
    user_id: str,
    event: dict,
) -> None:
    """Persist event state and send formatted WebSocket messages to client."""
    stage = event.get("stage", "requirement_analysis")
    response_text = event.get("response")
    should_wait = event.get("should_wait", False)
    wait_reason = event.get("wait_reason")
    requirements = event.get("requirements")
    questions = event.get("clarification_questions")
    confirmed_stack = event.get("confirmed_stack")

    await websocket.send_json({
        "type": "stage_update",
        "stage": stage,
        "progress": f"Completed {event.get('node', stage)}",
    })

    if response_text:
        await conversation_service.add_message(
            project_id=project_id,
            role="agent",
            content=response_text,
            stage=stage,
            metadata={"wait_reason": wait_reason},
        )
        await websocket.send_json({
            "type": "agent_message",
            "content": response_text,
            "stage": stage,
            "requirements": requirements,
            "confirmed_stack": confirmed_stack,
        })

    if wait_reason == "clarification" and questions:
        await websocket.send_json({
            "type": "clarification_request",
            "questions": questions,
        })
    elif wait_reason == "stack_confirmation":
        await websocket.send_json({
            "type": "approval_request",
            "stage": "stack",
            "data": {
                "confirmed_stack": confirmed_stack,
                "requirements": requirements,
            },
        })
    elif event.get("type") == "phase_complete":
        await websocket.send_json({
            "type": "complete",
            "summary": response_text or "Requirement analysis complete",
            "previewUrl": None,
            "stage": stage,
            "designChoice": event.get("design_choice"),
        })

    new_status = _stage_to_project_status(stage, should_wait, wait_reason)
    update_kwargs: dict = {
        "status": new_status,
        "current_agent_stage": stage,
    }
    if requirements is not None:
        update_kwargs["requirements"] = requirements
    if questions is not None:
        update_kwargs["clarification_questions"] = questions
    if confirmed_stack is not None:
        update_kwargs["confirmed_stack"] = confirmed_stack
    if event.get("design_choice"):
        try:
            update_kwargs["design_choice"] = DesignChoice(event["design_choice"])
        except ValueError:
            pass

    await project_service.update_project(
        project_id,
        user_id,
        UpdateProjectRequest(**update_kwargs),
    )
