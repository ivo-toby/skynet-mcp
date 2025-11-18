"""Integration tests for budget enforcement (requires API key)."""

import os

import pytest

from src.config.models import ProviderConfig, SpawnRequest
from src.orchestrator.task_executor import execute_task
from src.providers.anthropic import AnthropicProvider


@pytest.mark.integration
@pytest.mark.asyncio
async def test_budget_enforcement_stops_task():
    """Test that budget limit stops expensive tasks (requires ANTHROPIC_API_KEY)."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-opus-20240229",  # Expensive model
    )

    provider = AnthropicProvider(config)

    # Request a task that would cost more than the budget
    request = SpawnRequest(
        provider="anthropic",
        task="Write a comprehensive 10,000 word essay about artificial intelligence",
        max_tokens=4000,  # Large token count
        budget_limit=0.001,  # Very small budget ($0.001)
    )

    result = await execute_task(request, provider, "anthropic", "claude-3-opus-20240229")

    # Should exceed budget
    assert result.success is False
    assert result.error is not None
    assert result.error.code == "BUDGET_EXCEEDED"
    assert "budget" in result.error.message.lower()
    assert result.cost > request.budget_limit


@pytest.mark.integration
@pytest.mark.asyncio
async def test_budget_within_limit_succeeds():
    """Test that tasks within budget complete successfully (requires ANTHROPIC_API_KEY)."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",  # Cheap model
    )

    provider = AnthropicProvider(config)

    # Simple task with generous budget
    request = SpawnRequest(
        provider="anthropic",
        task="Say hello in one word",
        max_tokens=10,
        budget_limit=1.0,  # Large budget
    )

    result = await execute_task(request, provider, "anthropic", "claude-3-haiku-20240307")

    # Should succeed
    assert result.success is True
    assert result.error is None
    assert result.cost < request.budget_limit
    assert result.cost > 0  # Should have some cost


@pytest.mark.integration
@pytest.mark.asyncio
async def test_no_budget_limit_allows_any_cost():
    """Test that omitting budget limit allows task to complete (requires ANTHROPIC_API_KEY)."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-sonnet-20240229",
    )

    provider = AnthropicProvider(config)

    # No budget limit
    request = SpawnRequest(
        provider="anthropic",
        task="Write a short paragraph about Python programming",
        max_tokens=200,
        budget_limit=None,  # No limit
    )

    result = await execute_task(request, provider, "anthropic", "claude-3-sonnet-20240229")

    # Should complete regardless of cost
    assert result.success is True
    assert result.error is None
    assert result.cost > 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_budget_enforcement_with_cheap_model():
    """Test budget enforcement with a cheap model (requires ANTHROPIC_API_KEY)."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

    # Very small task with appropriate budget
    request = SpawnRequest(
        provider="anthropic",
        task="Say hi",
        max_tokens=5,
        budget_limit=0.01,  # Small but sufficient
    )

    result = await execute_task(request, provider, "anthropic", "claude-3-haiku-20240307")

    # Should succeed with Haiku
    assert result.success is True
    assert result.cost < request.budget_limit


@pytest.mark.integration
@pytest.mark.asyncio
async def test_budget_tracking_accurate():
    """Test that budget tracking returns accurate cost information (requires ANTHROPIC_API_KEY)."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

    request = SpawnRequest(
        provider="anthropic",
        task="Count from 1 to 10",
        max_tokens=100,
    )

    result = await execute_task(request, provider, "anthropic", "claude-3-haiku-20240307")

    # Verify cost tracking
    assert result.success is True
    assert result.cost > 0
    assert result.tokens_used.input > 0
    assert result.tokens_used.output > 0
    assert result.tokens_used.total == result.tokens_used.input + result.tokens_used.output

    # Cost should be reasonable for Haiku
    assert result.cost < 0.01  # Should be very cheap


@pytest.mark.integration
@pytest.mark.asyncio
async def test_budget_exceeded_returns_partial_tokens():
    """Test that budget exceeded still returns token usage (requires ANTHROPIC_API_KEY)."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-opus-20240229",  # Expensive
    )

    provider = AnthropicProvider(config)

    request = SpawnRequest(
        provider="anthropic",
        task="Write a detailed explanation of quantum computing",
        max_tokens=1000,
        budget_limit=0.001,  # Will exceed
    )

    result = await execute_task(request, provider, "anthropic", "claude-3-opus-20240229")

    # Should exceed budget but still return token info
    assert result.success is False
    assert result.error.code == "BUDGET_EXCEEDED"
    assert result.tokens_used.input > 0  # Tokens were used even though budget exceeded
    assert result.tokens_used.output > 0
    assert result.cost > request.budget_limit
