"""Base provider protocol/interface for LLM providers."""

from typing import Protocol

from src.types import CompletionResponse, GenerationParams, Message


class LLMProvider(Protocol):
    """Protocol that all LLM providers must implement."""

    async def generate_completion(
        self, messages: list[Message], params: GenerationParams
    ) -> CompletionResponse:
        """
        Generate a completion from the LLM.

        Args:
            messages: Conversation history
            params: Generation parameters (temperature, max_tokens, etc.)

        Returns:
            CompletionResponse with content, token usage, and metadata

        Raises:
            Exception: Provider-specific errors (will be normalized)
        """
        ...
