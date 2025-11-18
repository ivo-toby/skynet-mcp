"""Google Gemini provider implementation."""

import os

import google.generativeai as genai

from src.config.models import ProviderConfig
from src.types import CompletionResponse, GenerationParams, Message


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
        generation_config = {}

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

        # Call API
        response = await self.model.generate_content_async(
            prompt, generation_config=generation_config
        )

        # Extract response content
        content = response.text if response.text else ""

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
        )
