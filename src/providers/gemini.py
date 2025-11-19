"""Google Gemini provider implementation."""

import os
from typing import Any

import google.generativeai as genai
from google.ai.generativelanguage_v1beta.types import content as glm_content

from src.config.models import ProviderConfig
from src.types import CompletionResponse, GenerationParams, Message, ToolCall


class GeminiProvider:
    """Google Gemini LLM provider."""

    def __init__(self, config: ProviderConfig):
        """
        Initialize Gemini provider.

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

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(config.default_model)

    async def generate_completion(
        self, messages: list[Message], params: GenerationParams
    ) -> CompletionResponse:
        """
        Generate completion using Gemini API.

        Args:
            messages: Conversation history
            params: Generation parameters

        Returns:
            CompletionResponse with content and token usage
        """
        # Prepare generation config (Gemini uses nested config object)
        generation_config: dict[str, Any] = {}

        if params.get("max_tokens") is not None:
            generation_config["max_output_tokens"] = params["max_tokens"]
        else:
            generation_config["max_output_tokens"] = self.config.default_max_tokens

        if params.get("temperature") is not None:
            generation_config["temperature"] = params["temperature"]
        else:
            generation_config["temperature"] = self.config.default_temperature

        if params.get("top_p") is not None:
            generation_config["top_p"] = params["top_p"]

        if params.get("top_k") is not None:
            generation_config["top_k"] = params["top_k"]

        # Convert messages to Gemini format
        # Gemini expects a simple prompt or conversation history
        # For now, concatenate all messages
        prompt_parts = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                prompt_parts.append(f"System: {content}")
            elif role == "user":
                prompt_parts.append(f"User: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")

        prompt = "\n\n".join(prompt_parts)

        # Add system prompt if provided separately
        if params.get("system_prompt"):
            prompt = f"System: {params['system_prompt']}\n\n{prompt}"

        # Prepare tools if provided
        tools_param: list[dict[str, Any]] | None = None
        tools_from_params = params.get("tools")
        if tools_from_params:
            # Convert from OpenAI format to Gemini format
            # For MVP, basic function calling support
            # Note: Gemini tool format is complex, this is simplified
            gemini_functions: list[dict[str, Any]] = []
            for tool in tools_from_params:
                gemini_functions.append(
                    {
                        "name": tool["function"]["name"],
                        "description": tool["function"]["description"],
                        "parameters": tool["function"]["parameters"],
                    }
                )
            tools_param = gemini_functions

        # Call API
        if tools_param:
            response = await self.model.generate_content_async(
                prompt, generation_config=generation_config, tools=tools_param  # type: ignore[arg-type]
            )
        else:
            response = await self.model.generate_content_async(
                prompt, generation_config=generation_config  # type: ignore[arg-type]
            )

        # Extract response content
        content = response.text if response.text else ""

        # Extract tool calls (Gemini returns function calls in parts)
        tool_calls: list[ToolCall] = []
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, "function_call") and part.function_call:
                    # Convert function call to our format
                    tool_calls.append(
                        ToolCall(
                            id=f"gemini_{part.function_call.name}_{len(tool_calls)}",
                            name=part.function_call.name,
                            input=dict(part.function_call.args),
                        )
                    )

        # Extract token usage
        input_tokens = 0
        output_tokens = 0
        if hasattr(response, "usage_metadata"):
            input_tokens = response.usage_metadata.prompt_token_count
            output_tokens = response.usage_metadata.candidates_token_count

        return CompletionResponse(
            content=content,
            stop_reason=str(response.candidates[0].finish_reason)
            if response.candidates
            else None,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            tool_calls=tool_calls,
        )
