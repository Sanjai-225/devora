"""Devora Agent — Gemini LLM Provider adapter.

Uses langchain-google-genai for structured output support
and direct google-genai SDK for flexibility.
"""

import json
import logging
from typing import Any, Optional

from pydantic import BaseModel

from agent.providers.llm_provider import LLMMessage, LLMProvider, LLMResponse

logger = logging.getLogger(__name__)


class GeminiProvider(LLMProvider):
    """Google Gemini LLM provider using langchain-google-genai."""

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        self.api_key = api_key
        self.model = model
        self._llm = None
        self._init_llm()

    def _init_llm(self) -> None:
        """Initialize the langchain Gemini LLM."""
        from langchain_google_genai import ChatGoogleGenerativeAI

        self._llm = ChatGoogleGenerativeAI(
            model=self.model,
            google_api_key=self.api_key,
            temperature=0.7,
        )
        logger.info(f"Gemini provider initialized with model: {self.model}")

    def _to_langchain_messages(
        self,
        messages: list[LLMMessage],
        system_prompt: Optional[str] = None,
    ) -> list:
        """Convert LLMMessages to langchain message objects."""
        from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

        lc_messages = []
        if system_prompt:
            lc_messages.append(SystemMessage(content=system_prompt))

        for msg in messages:
            if msg.role == "system":
                lc_messages.append(SystemMessage(content=msg.content))
            elif msg.role == "user":
                lc_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                lc_messages.append(AIMessage(content=msg.content))

        return lc_messages

    async def generate(
        self,
        messages: list[LLMMessage],
        *,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        """Generate a text response from messages."""
        lc_messages = self._to_langchain_messages(messages, system_prompt)

        llm = self._llm.bind(temperature=temperature, max_output_tokens=max_tokens)
        response = await llm.ainvoke(lc_messages)

        usage = None
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            usage = {
                "input_tokens": response.usage_metadata.get("input_tokens", 0),
                "output_tokens": response.usage_metadata.get("output_tokens", 0),
            }

        return LLMResponse(
            content=response.content if isinstance(response.content, str) else str(response.content),
            raw=response,
            usage=usage,
        )

    async def generate_structured(
        self,
        messages: list[LLMMessage],
        output_schema: type[BaseModel],
        *,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
    ) -> Any:
        """Generate a response conforming to a Pydantic schema.

        Uses langchain's with_structured_output for reliable JSON schema adherence.
        """
        lc_messages = self._to_langchain_messages(messages, system_prompt)

        structured_llm = self._llm.with_structured_output(output_schema)
        response = await structured_llm.ainvoke(lc_messages)

        return response

    def get_provider_name(self) -> str:
        return "gemini"

