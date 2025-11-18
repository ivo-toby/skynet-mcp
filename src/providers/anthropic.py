"""Anthropic provider implementation."""

import os

from anthropic import AsyncAnthropic

from src.config.models import ProviderConfig
from src.types import CompletionResponse, GenerationParams, Message


class AnthropicProvider:
    """Anthropic LLM provider."""

    def __init__(self, config: ProviderConfig):
        """
        Initialize Anthropic provider.

        Args:
            config: Provider configuration
        """
        self.config = config
        api_key = os.getenv(config.api_key_env_var)
        if not api_key:
            raise ValueError(
                f"API key not found in environment variable: {config.api_key_env_var}. "
                "Please set this variable with your Anthropic API key."
            )

        self.client = AsyncAnthropic(api_key=api_key)
        self.model = config.default_model

    async def generate_completion(
        self, messages: list[Message], params: GenerationParams
    ) -> CompletionResponse:
        """
        Generate completion using Anthropic API.

        Args:
            messages: Conversation history
            params: Generation parameters

        Returns:
            CompletionResponse with content and token usage
        """
        # Extract system message if present
        system_prompt = params.get("system_prompt")
        if not system_prompt and messages and messages[0]["role"] == "system":
            system_prompt = messages[0]["content"]
            messages = messages[1:]

        # Prepare request parameters
        request_params = {
            "model": self.model,
            "messages": messages,
            "max_tokens": params.get("max_tokens") or self.config.default_max_tokens,
        }

        if system_prompt:
            request_params["system"] = system_prompt

        if params.get("temperature") is not None:
            request_params["temperature"] = params["temperature"]
        else:
            request_params["temperature"] = self.config.default_temperature

        if params.get("top_p") is not None:
            request_params["top_p"] = params["top_p"]

        if params.get("top_k") is not None:
            request_params["top_k"] = params["top_k"]

        # Call API
        response = await self.client.messages.create(**request_params)

        # Extract response content
        content = ""
        if response.content:
            # Anthropic returns list of content blocks
            content = "".join(
                block.text for block in response.content if hasattr(block, "text")
            )

        return CompletionResponse(
            content=content,
            stop_reason=response.stop_reason,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )
