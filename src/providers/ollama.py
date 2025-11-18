"""Ollama provider implementation for local models."""

import ollama

from src.config.models import ProviderConfig
from src.types import CompletionResponse, GenerationParams, Message


class OllamaProvider:
    """Ollama LLM provider for local models."""

    def __init__(self, config: ProviderConfig):
        """
        Initialize Ollama provider.

        Args:
            config: Provider configuration
        """
        self.config = config
        self.model = config.default_model

        # Set custom host if provided
        if config.api_base:
            self.client = ollama.AsyncClient(host=config.api_base)
        else:
            self.client = ollama.AsyncClient()

    async def generate_completion(
        self, messages: list[Message], params: GenerationParams
    ) -> CompletionResponse:
        """
        Generate completion using Ollama API.

        Args:
            messages: Conversation history
            params: Generation parameters

        Returns:
            CompletionResponse with content and token usage
        """
        # Prepare options (Ollama uses nested options object)
        options = {}

        if params.get("temperature") is not None:
            options["temperature"] = params["temperature"]
        else:
            options["temperature"] = self.config.default_temperature

        if params.get("top_p") is not None:
            options["top_p"] = params["top_p"]

        if params.get("top_k") is not None:
            options["top_k"] = params["top_k"]

        # Note: Ollama doesn't have a strict max_tokens parameter
        # Instead, it uses num_predict which is similar
        if params.get("max_tokens") is not None:
            options["num_predict"] = params["max_tokens"]
        else:
            options["num_predict"] = self.config.default_max_tokens

        # Handle system prompt
        if params.get("system_prompt"):
            messages = [
                {"role": "system", "content": params["system_prompt"]},
                *messages,
            ]

        # Call API
        response = await self.client.chat(
            model=self.model,
            messages=messages,
            options=options,
        )

        # Extract response content
        content = response["message"]["content"] if "message" in response else ""

        # Extract token usage (Ollama provides eval counts)
        input_tokens = response.get("prompt_eval_count", 0)
        output_tokens = response.get("eval_count", 0)

        return CompletionResponse(
            content=content,
            stop_reason=response.get("done_reason"),
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
