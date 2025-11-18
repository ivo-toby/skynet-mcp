"""Integration tests for Ollama provider (requires local Ollama instance)."""

import pytest

from src.config.models import ProviderConfig
from src.providers.ollama import OllamaProvider
from src.types import GenerationParams, Message


@pytest.mark.integration
@pytest.mark.asyncio
async def test_ollama_provider_basic_completion():
    """Test basic completion with Ollama provider (requires local Ollama)."""
    config = ProviderConfig(
        name="test-ollama",
        type="ollama",
        api_key_env_var="",  # Not needed for local
        api_base="http://localhost:11434",
        default_model="llama3.2:latest",
    )

    try:
        provider = OllamaProvider(config)

        messages: list[Message] = [
            {"role": "user", "content": "Say 'Hello' and nothing else."}
        ]

        params: GenerationParams = {
            "temperature": 0.7,
            "max_tokens": 50,
        }

        response = await provider.generate_completion(messages, params)

        assert response["content"]
        assert isinstance(response["content"], str)
        assert len(response["content"]) > 0
        assert response["input_tokens"] >= 0
        assert response["output_tokens"] >= 0

    except Exception as e:
        if "connection" in str(e).lower() or "refused" in str(e).lower():
            pytest.skip("Ollama not running on localhost:11434")
        else:
            raise


@pytest.mark.integration
@pytest.mark.asyncio
async def test_ollama_provider_with_system_prompt():
    """Test Ollama provider with system prompt."""
    config = ProviderConfig(
        name="test-ollama",
        type="ollama",
        api_key_env_var="",
        api_base="http://localhost:11434",
        default_model="llama3.2:latest",
    )

    try:
        provider = OllamaProvider(config)

        messages: list[Message] = [
            {"role": "user", "content": "What is 3+3?"}
        ]

        params: GenerationParams = {
            "system_prompt": "You are a helpful assistant.",
            "temperature": 0.7,
            "max_tokens": 100,
        }

        response = await provider.generate_completion(messages, params)

        assert response["content"]
        assert "6" in response["content"]

    except Exception as e:
        if "connection" in str(e).lower() or "refused" in str(e).lower():
            pytest.skip("Ollama not running on localhost:11434")
        else:
            raise


@pytest.mark.integration
@pytest.mark.asyncio
async def test_ollama_provider_temperature_control():
    """Test that temperature parameter works with Ollama."""
    config = ProviderConfig(
        name="test-ollama",
        type="ollama",
        api_key_env_var="",
        api_base="http://localhost:11434",
        default_model="llama3.2:latest",
    )

    try:
        provider = OllamaProvider(config)

        messages: list[Message] = [
            {"role": "user", "content": "Say hello"}
        ]

        params: GenerationParams = {
            "temperature": 0.0,  # Deterministic
            "max_tokens": 50,
        }

        response = await provider.generate_completion(messages, params)

        assert response["content"]

    except Exception as e:
        if "connection" in str(e).lower() or "refused" in str(e).lower():
            pytest.skip("Ollama not running on localhost:11434")
        else:
            raise


@pytest.mark.integration
@pytest.mark.asyncio
async def test_ollama_provider_token_usage():
    """Test that Ollama provider returns token usage."""
    config = ProviderConfig(
        name="test-ollama",
        type="ollama",
        api_key_env_var="",
        api_base="http://localhost:11434",
        default_model="llama3.2:latest",
    )

    try:
        provider = OllamaProvider(config)

        messages: list[Message] = [
            {"role": "user", "content": "Count from 1 to 5"}
        ]

        params: GenerationParams = {
            "max_tokens": 100,
        }

        response = await provider.generate_completion(messages, params)

        assert response["content"]
        assert response["input_tokens"] >= 0
        assert response["output_tokens"] >= 0

    except Exception as e:
        if "connection" in str(e).lower() or "refused" in str(e).lower():
            pytest.skip("Ollama not running on localhost:11434")
        else:
            raise


@pytest.mark.integration
@pytest.mark.asyncio
async def test_ollama_provider_conversation_context():
    """Test Ollama provider with conversation history."""
    config = ProviderConfig(
        name="test-ollama",
        type="ollama",
        api_key_env_var="",
        api_base="http://localhost:11434",
        default_model="llama3.2:latest",
    )

    try:
        provider = OllamaProvider(config)

        messages: list[Message] = [
            {"role": "user", "content": "My favorite number is 7"},
            {"role": "assistant", "content": "That's a nice number!"},
            {"role": "user", "content": "What is my favorite number?"}
        ]

        params: GenerationParams = {
            "max_tokens": 50,
        }

        response = await provider.generate_completion(messages, params)

        assert response["content"]
        # Should ideally remember "7", but model quality varies
        assert "7" in response["content"] or "seven" in response["content"].lower()

    except Exception as e:
        if "connection" in str(e).lower() or "refused" in str(e).lower():
            pytest.skip("Ollama not running on localhost:11434")
        else:
            raise


@pytest.mark.integration
@pytest.mark.asyncio
async def test_ollama_provider_custom_endpoint():
    """Test Ollama provider with custom endpoint."""
    config = ProviderConfig(
        name="test-ollama",
        type="ollama",
        api_key_env_var="",
        api_base="http://localhost:11434",  # Custom port
        default_model="llama3.2:latest",
    )

    try:
        provider = OllamaProvider(config)

        # Verify the client was configured with custom endpoint
        assert provider.client._client_wrapper._base_url == "http://localhost:11434"

    except Exception as e:
        if "connection" in str(e).lower() or "refused" in str(e).lower():
            pytest.skip("Ollama not running on localhost:11434")
        else:
            raise
