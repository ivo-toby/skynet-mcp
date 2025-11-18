"""Anthropic provider implementation."""

import os

from anthropic import AsyncAnthropic
from anthropic.types import ToolUseBlock

from src.config.models import ProviderConfig
from src.types import CompletionResponse, GenerationParams, Message, ToolCall


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
                f"Please set this variable with your API key: export {config.api_key_env_var}=your-key-here"
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

        # Add tools if provided
        if params.get("tools"):
            # Convert from OpenAI format to Anthropic format
            anthropic_tools = []
            for tool in params["tools"]:
                anthropic_tools.append(
                    {
                        "name": tool["function"]["name"],
                        "description": tool["function"]["description"],
                        "input_schema": tool["function"]["parameters"],
                    }
                )
            request_params["tools"] = anthropic_tools

        # Call API
        response = await self.client.messages.create(**request_params)

        # Extract response content and tool calls
        content = ""
        tool_calls: list[ToolCall] = []

        if response.content:
            # Anthropic returns list of content blocks
            for block in response.content:
                if hasattr(block, "text"):
                    content += block.text
                elif isinstance(block, ToolUseBlock):
                    # Tool call block
                    tool_calls.append(
                        ToolCall(
                            id=block.id,
                            name=block.name,
                            input=block.input,
                        )
                    )

        return CompletionResponse(
            content=content,
            stop_reason=response.stop_reason,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            tool_calls=tool_calls,
        )
