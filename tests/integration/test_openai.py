"""Integration tests for OpenAI-compatible provider (requires API key)."""

import os

import pytest

from src.config.models import ProviderConfig
from src.providers.openai_compatible import OpenAICompatibleProvider
from src.types import GenerationParams, Message


@pytest.mark.integration
@pytest.mark.asyncio
async def test_openai_provider_basic_completion():
    """Test basic completion with OpenAI provider (requires OPENAI_API_KEY)."""
    if "OPENAI_API_KEY" not in os.environ:
        pytest.skip("OPENAI_API_KEY not set")

    config = ProviderConfig(
        name="test-openai",
        type="openai_compatible",
        api_key_env_var="OPENAI_API_KEY",
        api_base="https://api.openai.com/v1",
        default_model="gpt-4o-mini",
    )

    provider = OpenAICompatibleProvider(config)

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


@pytest.mark.integration
@pytest.mark.asyncio
async def test_openai_provider_with_system_prompt():
    """Test OpenAI provider with system prompt."""
    if "OPENAI_API_KEY" not in os.environ:
        pytest.skip("OPENAI_API_KEY not set")

    config = ProviderConfig(
        name="test-openai",
        type="openai_compatible",
        api_key_env_var="OPENAI_API_KEY",
        default_model="gpt-4o-mini",
    )

    provider = OpenAICompatibleProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "What is 2+2?"}
    ]

    params: GenerationParams = {
        "system_prompt": "You are a math tutor. Always explain your answers.",
        "temperature": 0.7,
        "max_tokens": 100,
    }

    response = await provider.generate_completion(messages, params)

    assert response["content"]
    assert "4" in response["content"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_openai_provider_temperature_control():
    """Test that temperature parameter works with OpenAI."""
    if "OPENAI_API_KEY" not in os.environ:
        pytest.skip("OPENAI_API_KEY not set")

    config = ProviderConfig(
        name="test-openai",
        type="openai_compatible",
        api_key_env_var="OPENAI_API_KEY",
        default_model="gpt-4o-mini",
    )

    provider = OpenAICompatibleProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "Say hello"}
    ]

    # Temperature 0 (deterministic)
    params: GenerationParams = {
        "temperature": 0.0,
        "max_tokens": 50,
    }

    response = await provider.generate_completion(messages, params)

    assert response["content"]
    assert response["input_tokens"] > 0
    assert response["output_tokens"] > 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_openai_provider_token_usage():
    """Test that OpenAI provider returns accurate token usage."""
    if "OPENAI_API_KEY" not in os.environ:
        pytest.skip("OPENAI_API_KEY not set")

    config = ProviderConfig(
        name="test-openai",
        type="openai_compatible",
        api_key_env_var="OPENAI_API_KEY",
        default_model="gpt-4o-mini",
    )

    provider = OpenAICompatibleProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "Count from 1 to 5"}
    ]

    params: GenerationParams = {
        "max_tokens": 50,
    }

    response = await provider.generate_completion(messages, params)

    assert response["input_tokens"] > 0
    assert response["output_tokens"] > 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_openai_provider_conversation_context():
    """Test OpenAI provider with conversation history."""
    if "OPENAI_API_KEY" not in os.environ:
        pytest.skip("OPENAI_API_KEY not set")

    config = ProviderConfig(
        name="test-openai",
        type="openai_compatible",
        api_key_env_var="OPENAI_API_KEY",
        default_model="gpt-4o-mini",
    )

    provider = OpenAICompatibleProvider(config)

    messages: list[Message] = [
        {"role": "user", "content": "My favorite color is blue"},
        {"role": "assistant", "content": "That's nice! Blue is a great color."},
        {"role": "user", "content": "What is my favorite color?"}
    ]

    params: GenerationParams = {
        "max_tokens": 50,
    }

    response = await provider.generate_completion(messages, params)

    assert "blue" in response["content"].lower()
