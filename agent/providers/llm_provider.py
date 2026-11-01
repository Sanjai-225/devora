"""Devora Agent — Abstract LLM Provider interface.

All LLM providers (Gemini, OpenAI, etc.) must implement this interface
so the agent workflow stays provider-agnostic.
"""

from abc import ABC, abstractmethod
from typing import Any, Optional

from pydantic import BaseModel


class LLMMessage(BaseModel):
    """A single message in a conversation."""
    role: str  # "user", "assistant", "system"
    content: str


class LLMResponse(BaseModel):
    """Response from an LLM call."""
    content: str
    raw: Optional[Any] = None
    usage: Optional[dict] = None


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate(
        self,
        messages: list[LLMMessage],
        *,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        """Generate a text response from messages."""
        ...

    @abstractmethod
    async def generate_structured(
        self,
        messages: list[LLMMessage],
        output_schema: type[BaseModel],
        *,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
    ) -> Any:
        """Generate a response conforming to a Pydantic schema."""
        ...

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the provider name (e.g., 'gemini', 'openai')."""
        ...

