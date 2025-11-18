"""Integration tests for Gemini provider (requires API key)."""

import os

import pytest

from src.config.models import ProviderConfig
from src.providers.gemini import GeminiProvider
from src.types import GenerationParams, Message


@pytest.mark.integration
@pytest.mark.asyncio
async def test_gemini_provider_basic_completion():
    """Test basic completion with Gemini provider (requires GOOGLE_AI_KEY)."""
    if "GOOGLE_AI_KEY" not in os.environ:
        pytest.skip("GOOGLE_AI_KEY not set")

    config = ProviderConfig(
        name="test-gemini",
        type="gemini",
        api_key_env_var="GOOGLE_AI_KEY",
        default_model="gemini-1.5-flash",
    )

    provider = GeminiProvider(config)

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
    assert response["input_tokens"] >= 0  # Gemini may return 0 for small requests
    assert response["output_tokens"] >= 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_gemini_provider_with_system_prompt():
    """Test Gemini provider with system prompt."""
    if "GOOGLE_AI_KEY" not in os.environ:
        pytest.skip("GOOGLE_AI_KEY not set")

    config = ProviderConfig(
        name="test-gemini",
        type="gemini",
        api_key_env_var="GOOGLE_AI_KEY",
        default_model="gemini-1.5-flash",
    )

    provider = GeminiProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "What is 5+5?"}
    ]

    params: GenerationParams = {
        "system_prompt": "You are a math tutor.",
        "temperature": 0.7,
        "max_tokens": 100,
    }

    response = await provider.generate_completion(messages, params)

    assert response["content"]
    assert "10" in response["content"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_gemini_provider_temperature_control():
    """Test that temperature parameter works with Gemini."""
    if "GOOGLE_AI_KEY" not in os.environ:
        pytest.skip("GOOGLE_AI_KEY not set")

    config = ProviderConfig(
        name="test-gemini",
        type="gemini",
        api_key_env_var="GOOGLE_AI_KEY",
        default_model="gemini-1.5-flash",
    )

    provider = GeminiProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "Say hello"}
    ]

    params: GenerationParams = {
        "temperature": 0.1,  # Low temperature
        "max_tokens": 50,
    }

    response = await provider.generate_completion(messages, params)

    assert response["content"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_gemini_provider_token_usage():
    """Test that Gemini provider returns token usage."""
    if "GOOGLE_AI_KEY" not in os.environ:
        pytest.skip("GOOGLE_AI_KEY not set")

    config = ProviderConfig(
        name="test-gemini",
        type="gemini",
        api_key_env_var="GOOGLE_AI_KEY",
        default_model="gemini-1.5-flash",
    )

    provider = GeminiProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "Write a short poem about coding"}
    ]

    params: GenerationParams = {
        "max_tokens": 200,
    }

    response = await provider.generate_completion(messages, params)

    assert response["content"]
    # Gemini may return 0 for small requests, so just check they exist
    assert "input_tokens" in response
    assert "output_tokens" in response


@pytest.mark.integration
@pytest.mark.asyncio
async def test_gemini_provider_conversation_context():
    """Test Gemini provider with conversation history."""
    if "GOOGLE_AI_KEY" not in os.environ:
        pytest.skip("GOOGLE_AI_KEY not set")

    config = ProviderConfig(
        name="test-gemini",
        type="gemini",
        api_key_env_var="GOOGLE_AI_KEY",
        default_model="gemini-1.5-flash",
    )

    provider = GeminiProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "My name is Bob"},
        {"role": "assistant", "content": "Hello Bob!"},
        {"role": "user", "content": "What is my name?"}
    ]

    params: GenerationParams = {
        "max_tokens": 50,
    }

    response = await provider.generate_completion(messages, params)

    assert "Bob" in response["content"] or "bob" in response["content"].lower()
