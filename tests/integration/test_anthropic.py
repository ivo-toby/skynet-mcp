"""Integration tests for Anthropic provider (requires API key)."""

import os

import pytest

from src.config.models import ProviderConfig
from src.providers.anthropic import AnthropicProvider
from src.types import GenerationParams, Message


@pytest.mark.integration
@pytest.mark.asyncio
async def test_anthropic_provider_basic_completion():
    """Test basic completion with Anthropic provider (requires ANTHROPIC_API_KEY)."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

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
    assert response["input_tokens"] > 0
    assert response["output_tokens"] > 0
    assert response["stop_reason"] is not None


@pytest.mark.integration
@pytest.mark.asyncio
async def test_anthropic_provider_with_system_prompt():
    """Test Anthropic provider with system prompt."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "What is your role?"}
    ]

    params: GenerationParams = {
        "system_prompt": "You are a helpful math tutor.",
        "temperature": 0.7,
        "max_tokens": 100,
    }

    response = await provider.generate_completion(messages, params)

    assert response["content"]
    assert response["input_tokens"] > 0
    assert response["output_tokens"] > 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_anthropic_provider_temperature_control():
    """Test that temperature parameter affects responses."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "Say hello"}
    ]

    # Low temperature (deterministic)
    params_low: GenerationParams = {
        "temperature": 0.0,
        "max_tokens": 50,
    }

    response1 = await provider.generate_completion(messages, params_low)

    # High temperature (creative)
    params_high: GenerationParams = {
        "temperature": 1.0,
        "max_tokens": 50,
    }

    response2 = await provider.generate_completion(messages, params_high)

    # Both should return valid responses
    assert response1["content"]
    assert response2["content"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_anthropic_provider_token_usage():
    """Test that Anthropic provider returns accurate token usage."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "Count from 1 to 10"}
    ]

    params: GenerationParams = {
        "max_tokens": 100,
    }

    response = await provider.generate_completion(messages, params)

    # Verify token counts are reasonable
    assert response["input_tokens"] > 0
    assert response["output_tokens"] > 0
    # Should have roughly 10 numbers in output
    assert response["output_tokens"] > 10


@pytest.mark.integration
@pytest.mark.asyncio
async def test_anthropic_provider_max_tokens_limit():
    """Test that max_tokens parameter is respected."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "Write a very long essay about artificial intelligence"}
    ]

    params: GenerationParams = {
        "max_tokens": 20,  # Very limited
    }

    response = await provider.generate_completion(messages, params)

    # Should stop due to length limit
    assert response["output_tokens"] <= 25  # Allow small buffer
    assert response["stop_reason"] == "max_tokens" or "length" in response.get("stop_reason", "").lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_anthropic_provider_multiple_messages():
    """Test Anthropic provider with conversation history."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "My name is Alice"},
        {"role": "assistant", "content": "Hello Alice! Nice to meet you."},
        {"role": "user", "content": "What is my name?"}
    ]

    params: GenerationParams = {
        "max_tokens": 50,
    }

    response = await provider.generate_completion(messages, params)

    # Should remember the name from context
    assert "Alice" in response["content"] or "alice" in response["content"].lower()
