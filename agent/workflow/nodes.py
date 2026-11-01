"""Devora Agent — Requirement analysis LangGraph nodes.

These nodes handle: requirement extraction, clarification detection,
question generation, answer processing, and stack confirmation.
"""

import json
import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage

from agent.models.requirements import (
    ClarificationResult,
    StackConfirmation,
    StructuredRequirements,
)
from agent.providers.llm_provider import LLMMessage, LLMProvider
from agent.workflow.state import AgentState

logger = logging.getLogger(__name__)

# ── System Prompts ──────────────────────────────────────────────────

REQUIREMENT_ANALYSIS_PROMPT = """You are Devora's requirement analysis engine. Your job is to extract structured requirements from a user's natural-language website description.

Analyze the user's request and extract:
1. **Project type** (portfolio, e-commerce, blog, saas, landing, dashboard, other)
2. **All pages/routes** the website needs with their paths and descriptions
3. **All features** mentioned or implied
4. **Technology stack** — use what the user specifies, or default to:
   - Framework: Next.js (nextjs)
   - Styling: Tailwind CSS (tailwind)
   - Backend: Next.js API routes (nextjs_api) for simple sites, or separate backend for complex ones
   - Database: none for static sites, firebase/supabase for dynamic ones
   - Auth: none unless explicitly needed
   - Language: TypeScript
5. **Design preferences** if mentioned
6. **Complexity assessment** (simple, moderate, complex)
7. **Assumptions** you had to make due to missing information

Be thorough but practical. For a typical portfolio site, don't over-engineer with databases and auth.
For an e-commerce site, include auth, product management, cart, checkout.

Always generate sensible defaults rather than leaving fields empty.
Generate realistic page routes (e.g., '/products', '/about', '/contact').
Include common implied pages like 404, home page, etc.

Return a StructuredRequirements JSON object."""

CLARIFICATION_ANALYSIS_PROMPT = """You are Devora's clarification analyzer. Review the structured requirements and determine if any critical information is missing that would prevent successful website generation.

Rules:
- Only ask questions that are genuinely necessary. Do NOT ask about trivial details.
- Maximum 5 questions. Prefer 2-3 focused questions.
- Do NOT ask about things you can reasonably assume (e.g., "should the navbar be responsive?" — yes obviously).
- DO ask about things that significantly affect architecture:
  - Authentication type if auth is needed but unspecified
  - Database choice if data persistence is needed
  - Payment processing details for e-commerce
  - API integrations if mentioned but vague
- Each question should have suggested options and a sensible default.
- If the requirements are clear enough to proceed, set needs_clarification to false.

For simple sites (portfolio, landing page, blog), almost never need clarification.
For complex sites (e-commerce, SaaS), you might need 2-3 clarifications about auth/payments/data."""

ANSWER_PROCESSING_PROMPT = """You are Devora's answer processor. The user has answered clarification questions.
Update the structured requirements based on their answers.

Previous requirements:
{requirements}

Clarification questions asked:
{questions}

User's answers:
{answers}

Update the requirements to reflect the user's answers. Keep all existing information,
only modify or add based on the answers. Return the updated StructuredRequirements."""

STACK_CONFIRMATION_PROMPT = """You are Devora's technology stack advisor. Summarize the technology stack
that will be used for this project in a clear, human-readable way.

Requirements:
{requirements}

Generate a clear, friendly summary of:
1. What will be built (1-2 sentences)
2. The technology stack being used and why
3. Key pages that will be created
4. Key features that will be implemented
5. Any assumptions made

Keep it concise but informative. The user should understand exactly what Devora will build."""


# ── Node Functions ──────────────────────────────────────────────────


async def analyze_requirements(state: AgentState, llm: LLMProvider) -> dict:
    """Node: Analyze user request and extract structured requirements."""
    logger.info(f"Analyzing requirements for project {state['project_id']}")

    user_request = state["user_request"]

    messages = [LLMMessage(role="user", content=user_request)]

    try:
        requirements: StructuredRequirements = await llm.generate_structured(
            messages=messages,
            output_schema=StructuredRequirements,
            system_prompt=REQUIREMENT_ANALYSIS_PROMPT,
            temperature=0.3,
        )

        requirements_dict = requirements.model_dump()
        logger.info(
            f"Requirements extracted: {requirements.project_type}, "
            f"{len(requirements.pages)} pages, {len(requirements.features)} features"
        )

        summary = (
            f"I've analyzed your request for **{requirements.project_name}**.\n\n"
            f"**Type:** {requirements.project_type}\n"
            f"**Summary:** {requirements.summary}\n\n"
            f"**Pages identified ({len(requirements.pages)}):**\n"
        )
        for page in requirements.pages:
            summary += f"- `{page.route}` — {page.name}: {page.description}\n"

        summary += f"\n**Features ({len(requirements.features)}):**\n"
        for feat in requirements.features:
            priority_icon = "🔴" if feat.priority == "must_have" else "🟡" if feat.priority == "should_have" else "🟢"
            summary += f"- {priority_icon} {feat.name}: {feat.description}\n"

        stack = requirements.technology_stack
        summary += (
            f"\n**Technology Stack:**\n"
            f"- Framework: {stack.framework.value}\n"
            f"- Styling: {stack.styling.value}\n"
            f"- Backend: {stack.backend.value}\n"
            f"- Database: {stack.database.value}\n"
            f"- Language: {stack.language}\n"
        )

        if requirements.assumptions_made:
            summary += "\n**Assumptions made:**\n"
            for assumption in requirements.assumptions_made:
                summary += f"- {assumption}\n"

        return {
            "requirements": requirements_dict,
            "current_stage": "requirement_analysis",
            "agent_response": summary,
            "messages": [AIMessage(content=summary)],
        }

    except Exception as e:
        logger.error(f"Requirement analysis failed: {e}", exc_info=True)
        error_msg = f"I encountered an error analyzing your requirements: {str(e)}. Let me try a simpler approach."
        return {
            "error": str(e),
            "current_stage": "requirement_analysis",
            "agent_response": error_msg,
            "messages": [AIMessage(content=error_msg)],
        }


async def check_clarification(state: AgentState, llm: LLMProvider) -> dict:
    """Node: Check if clarification is needed."""
    requirements = state.get("requirements")
    if not requirements:
        return {
            "needs_clarification": False,
            "current_stage": "clarification_check",
        }

    logger.info("Checking if clarification is needed")

    messages = [
        LLMMessage(
            role="user",
            content=f"Review these requirements and determine if clarification is needed:\n\n{json.dumps(requirements, indent=2)}",
        )
    ]

    try:
        result: ClarificationResult = await llm.generate_structured(
            messages=messages,
            output_schema=ClarificationResult,
            system_prompt=CLARIFICATION_ANALYSIS_PROMPT,
            temperature=0.2,
        )

        if result.needs_clarification and result.questions:
            questions_dict = [q.model_dump() for q in result.questions]
            logger.info(f"Clarification needed: {len(result.questions)} questions")

            questions_text = "I have a few questions to make sure I build exactly what you need:\n\n"
            for i, q in enumerate(result.questions, 1):
                questions_text += f"**{i}. {q.question}**\n"
                if q.why:
                    questions_text += f"   *Why:* {q.why}\n"
                if q.options:
                    questions_text += f"   *Options:* {', '.join(q.options)}\n"
                if q.default:
                    questions_text += f"   *Default:* {q.default}\n"
                questions_text += "\n"

            questions_text += "Please answer these questions, or say 'use defaults' to proceed with the suggested defaults."

            return {
                "needs_clarification": True,
                "clarification_questions": questions_dict,
                "current_stage": "clarification",
                "agent_response": questions_text,
                "should_wait_for_user": True,
                "wait_reason": "clarification",
                "messages": [AIMessage(content=questions_text)],
            }
        else:
            logger.info("No clarification needed")
            return {
                "needs_clarification": False,
                "current_stage": "clarification_check",
            }

    except Exception as e:
        logger.error(f"Clarification check failed: {e}", exc_info=True)
        # On error, skip clarification and proceed
        return {
            "needs_clarification": False,
            "current_stage": "clarification_check",
        }


async def process_answers(state: AgentState, llm: LLMProvider) -> dict:
    """Node: Process user's answers to clarification questions."""
    requirements = state.get("requirements", {})
    questions = state.get("clarification_questions", [])
    answers = state.get("clarification_answers", [])

    if not answers:
        return {"current_stage": "answer_processing"}

    logger.info("Processing clarification answers")

    prompt = ANSWER_PROCESSING_PROMPT.format(
        requirements=json.dumps(requirements, indent=2),
        questions=json.dumps(questions, indent=2),
        answers=json.dumps(answers, indent=2),
    )

    messages = [LLMMessage(role="user", content=prompt)]

    try:
        updated_requirements: StructuredRequirements = await llm.generate_structured(
            messages=messages,
            output_schema=StructuredRequirements,
            system_prompt="Update the requirements based on the user's answers. Return the complete updated StructuredRequirements.",
            temperature=0.2,
        )

        updated_dict = updated_requirements.model_dump()
        response = "Thanks for the clarifications! I've updated the requirements accordingly. Let me confirm the final technology stack."

        return {
            "requirements": updated_dict,
            "needs_clarification": False,
            "current_stage": "answer_processing",
            "agent_response": response,
            "should_wait_for_user": False,
            "messages": [AIMessage(content=response)],
        }

    except Exception as e:
        logger.error(f"Answer processing failed: {e}", exc_info=True)
        return {
            "needs_clarification": False,
            "current_stage": "answer_processing",
            "agent_response": "I had trouble processing your answers, but I'll proceed with what I have.",
            "messages": [AIMessage(content="I had trouble processing your answers, but I'll proceed with what I have.")],
        }


async def confirm_stack(state: AgentState, llm: LLMProvider) -> dict:
    """Node: Generate a stack confirmation summary for the user."""
    requirements = state.get("requirements", {})

    logger.info("Generating stack confirmation")

    prompt = STACK_CONFIRMATION_PROMPT.format(
        requirements=json.dumps(requirements, indent=2),
    )

    messages = [LLMMessage(role="user", content=prompt)]

    try:
        response = await llm.generate(
            messages=messages,
            system_prompt="Generate a clear, friendly technology stack confirmation message for the user.",
            temperature=0.5,
            max_tokens=1024,
        )

        stack = requirements.get("technology_stack", {})
        confirmation_msg = response.content + (
            "\n\n---\n"
            "**Would you like to:**\n"
            "1. ✅ **Proceed** with this stack\n"
            "2. 🎨 **Design first** — create a visual prototype before coding\n"
            "3. 🔧 **Modify** — change something in the stack or requirements\n\n"
            "Reply with your choice!"
        )

        return {
            "confirmed_stack": stack,
            "current_stage": "stack_confirmation",
            "agent_response": confirmation_msg,
            "should_wait_for_user": True,
            "wait_reason": "stack_confirmation",
            "messages": [AIMessage(content=confirmation_msg)],
        }

    except Exception as e:
        logger.error(f"Stack confirmation failed: {e}", exc_info=True)
        stack = requirements.get("technology_stack", {})
        fallback = "Here's your technology stack. Reply 'proceed' to continue or let me know if you want changes."
        return {
            "confirmed_stack": stack,
            "current_stage": "stack_confirmation",
            "agent_response": fallback,
            "should_wait_for_user": True,
            "wait_reason": "stack_confirmation",
            "messages": [AIMessage(content=fallback)],
        }

