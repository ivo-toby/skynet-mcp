"""OpenAI-compatible provider implementation."""

import os

from openai import AsyncOpenAI

from src.config.models import ProviderConfig
from src.types import CompletionResponse, GenerationParams, Message


class OpenAICompatibleProvider:
    """OpenAI-compatible LLM provider (works with OpenAI, Azure OpenAI, and custom endpoints)."""

    def __init__(self, config: ProviderConfig):
        """
        Initialize OpenAI-compatible provider.

        Args:
            config: Provider configuration
        """
        self.config = config
        api_key = os.getenv(config.api_key_env_var)
        if not api_key:
            raise ValueError(
                f"API key not found in environment variable: {config.api_key_env_var}. "
                f"Please set this variable with your API key: export {config.api_key_env_var}=your-key-here"
            )

        # Initialize client with custom base URL if provided
        client_params = {"api_key": api_key}
        if config.api_base:
            client_params["base_url"] = config.api_base

        self.client = AsyncOpenAI(**client_params)
        self.model = config.default_model

    async def generate_completion(
        self, messages: list[Message], params: GenerationParams
    ) -> CompletionResponse:
        """
        Generate completion using OpenAI-compatible API.

        Args:
            messages: Conversation history
            params: Generation parameters

        Returns:
            CompletionResponse with content and token usage
        """
        # Handle system prompt
        if params.get("system_prompt"):
            messages = [
                {"role": "system", "content": params["system_prompt"]},
                *messages,
            ]

        # Prepare request parameters
        request_params = {
            "model": self.model,
            "messages": messages,
        }

        # Add optional parameters
        if params.get("max_tokens") is not None:
            request_params["max_tokens"] = params["max_tokens"]
        else:
            request_params["max_tokens"] = self.config.default_max_tokens

        if params.get("temperature") is not None:
            request_params["temperature"] = params["temperature"]
        else:
            request_params["temperature"] = self.config.default_temperature

        if params.get("top_p") is not None:
            request_params["top_p"] = params["top_p"]

        # Note: top_k not supported by OpenAI API
        # It will be ignored if provided

        # Call API
        response = await self.client.chat.completions.create(**request_params)

        # Extract response content
        content = response.choices[0].message.content or ""
        stop_reason = response.choices[0].finish_reason

        return CompletionResponse(
            content=content,
            stop_reason=stop_reason,
            input_tokens=response.usage.prompt_tokens,
            output_tokens=response.usage.completion_tokens,
        )
