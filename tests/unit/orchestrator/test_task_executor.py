"""Unit tests for task executor functionality."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.config.models import LLMError, SpawnRequest, TaskStatus, TokenUsage
from src.orchestrator.task_executor import execute_task


class MockProvider:
    """Mock LLM provider for testing."""

    def __init__(self, response=None, delay=0, should_fail=False):
        """
        Initialize mock provider.

        Args:
            response: Response to return from generate_completion
            delay: Artificial delay in seconds before returning response
            should_fail: If True, raise an exception
        """
        self.response = response or {
            "content": "Test response",
            "stop_reason": "end_turn",
            "input_tokens": 10,
            "output_tokens": 20,
        }
        self.delay = delay
        self.should_fail = should_fail
        self.calls = []

    async def generate_completion(self, messages, params):
        """Mock generate_completion method."""
        self.calls.append({"messages": messages, "params": params})

        if self.delay > 0:
            await asyncio.sleep(self.delay)

        if self.should_fail:
            raise Exception("Provider error")

        return self.response


class TestTaskExecution:
    """Test basic task execution."""

    @pytest.mark.asyncio
    async def test_successful_task_execution(self):
        """Test successful task execution returns correct result."""
        request = SpawnRequest(
            provider="test",
            task="Say hello",
            temperature=0.7,
            max_tokens=100,
        )

        provider = MockProvider()
        # Use a model from the pricing table to get cost calculation
        result = await execute_task(request, provider, "test-provider", "claude-3-haiku-20240307")

        assert result.success is True
        assert result.result == "Test response"
        assert result.provider_used == "test-provider"
        assert result.model_used == "claude-3-haiku-20240307"
        assert result.tokens_used.input == 10
        assert result.tokens_used.output == 20
        assert result.tokens_used.total == 30
        assert result.cost > 0  # Should have a cost
        assert result.duration_ms >= 0  # Can be 0 for very fast mocked calls
        assert result.error is None

    @pytest.mark.asyncio
    async def test_task_execution_calls_provider(self):
        """Test that task execution calls provider with correct parameters."""
        request = SpawnRequest(
            provider="test",
            task="Analyze this code",
            temperature=0.5,
            max_tokens=500,
            top_p=0.9,
            system_prompt="You are a code analyzer",
        )

        provider = MockProvider()
        await execute_task(request, provider, "test-provider", "test-model")

        assert len(provider.calls) == 1
        call = provider.calls[0]

        # Check messages
        assert len(call["messages"]) == 1
        assert call["messages"][0]["role"] == "user"
        assert call["messages"][0]["content"] == "Analyze this code"

        # Check params
        assert call["params"]["temperature"] == 0.5
        assert call["params"]["max_tokens"] == 500
        assert call["params"]["top_p"] == 0.9
        assert call["params"]["system_prompt"] == "You are a code analyzer"

    @pytest.mark.asyncio
    async def test_task_execution_with_zero_cost(self):
        """Test task execution with model that has no pricing."""
        request = SpawnRequest(provider="test", task="Test task")

        # Use a model not in pricing table (like Ollama)
        provider = MockProvider()
        result = await execute_task(request, provider, "ollama", "llama3.2:3b")

        assert result.success is True
        assert result.cost == 0.0


class TestTimeout:
    """Test timeout enforcement."""

    @pytest.mark.asyncio
    async def test_task_timeout(self):
        """Test that task times out when exceeding timeout_ms."""
        request = SpawnRequest(
            provider="test",
            task="Long running task",
            timeout_ms=1000,  # 1 second timeout
        )

        # Provider that takes 2 seconds to respond
        provider = MockProvider(delay=2)
        result = await execute_task(request, provider, "test-provider", "test-model")

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "TIMEOUT"
        assert "timeout" in result.error.message.lower()
        assert result.duration_ms >= 1000  # Should be at least the timeout duration

    @pytest.mark.asyncio
    async def test_task_completes_within_timeout(self):
        """Test that task completes successfully when within timeout."""
        request = SpawnRequest(
            provider="test",
            task="Quick task",
            timeout_ms=2000,  # 2 second timeout
        )

        # Provider that takes 0.1 seconds
        provider = MockProvider(delay=0.1)
        result = await execute_task(request, provider, "test-provider", "test-model")

        assert result.success is True
        assert result.error is None
        assert result.duration_ms < 2000


class TestBudgetEnforcement:
    """Test budget limit enforcement."""

    @pytest.mark.asyncio
    async def test_budget_exceeded(self):
        """Test that task stops when budget is exceeded."""
        request = SpawnRequest(
            provider="test",
            task="Expensive task",
            budget_limit=0.0001,  # Very low budget
        )

        # Return high token usage to exceed budget
        provider = MockProvider(
            response={
                "content": "Result",
                "stop_reason": "end_turn",
                "input_tokens": 10000,
                "output_tokens": 10000,
            }
        )

        result = await execute_task(request, provider, "test-provider", "claude-3-opus-20240229")

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "BUDGET_EXCEEDED"
        assert "budget" in result.error.message.lower()
        assert result.cost > request.budget_limit

    @pytest.mark.asyncio
    async def test_task_within_budget(self):
        """Test that task completes when within budget."""
        request = SpawnRequest(
            provider="test",
            task="Cheap task",
            budget_limit=1.0,  # High budget
        )

        provider = MockProvider(
            response={
                "content": "Result",
                "stop_reason": "end_turn",
                "input_tokens": 100,
                "output_tokens": 50,
            }
        )

        result = await execute_task(request, provider, "test-provider", "claude-3-haiku-20240307")

        assert result.success is True
        assert result.error is None
        assert result.cost < request.budget_limit

    @pytest.mark.asyncio
    async def test_no_budget_limit(self):
        """Test that task completes when no budget limit is set."""
        request = SpawnRequest(
            provider="test",
            task="Task without budget",
            budget_limit=None,
        )

        provider = MockProvider(
            response={
                "content": "Result",
                "stop_reason": "end_turn",
                "input_tokens": 10000,
                "output_tokens": 10000,
            }
        )

        result = await execute_task(request, provider, "test-provider", "claude-3-opus-20240229")

        assert result.success is True
        assert result.error is None
        # Cost can be high but task should succeed


class TestErrorHandling:
    """Test error handling in task execution."""

    @pytest.mark.asyncio
    async def test_provider_error(self):
        """Test handling of provider errors."""
        request = SpawnRequest(provider="test", task="Task that fails")

        provider = MockProvider(should_fail=True)
        result = await execute_task(request, provider, "test-provider", "test-model")

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "PROVIDER_ERROR"
        assert "Provider error" in result.error.message

    @pytest.mark.asyncio
    async def test_error_returns_token_usage(self):
        """Test that errors still return token usage if available."""
        request = SpawnRequest(provider="test", task="Task that times out", timeout_ms=1000)

        provider = MockProvider(delay=2)
        result = await execute_task(request, provider, "test-provider", "test-model")

        # Should have zero tokens since it timed out
        assert result.tokens_used.input == 0
        assert result.tokens_used.output == 0
        assert result.tokens_used.total == 0


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    @pytest.mark.asyncio
    async def test_empty_task(self):
        """Test execution with empty task string."""
        # Note: This would fail Pydantic validation in SpawnRequest
        # But if it somehow gets through, provider should still be called
        request = SpawnRequest(provider="test", task="x")  # Min length 1

        provider = MockProvider()
        result = await execute_task(request, provider, "test-provider", "test-model")

        assert result.success is True

    @pytest.mark.asyncio
    async def test_very_short_timeout(self):
        """Test with minimum timeout."""
        request = SpawnRequest(
            provider="test",
            task="Task",
            timeout_ms=1000,  # 1 second minimum
        )

        provider = MockProvider(delay=0.5)
        result = await execute_task(request, provider, "test-provider", "test-model")

        # Should complete within timeout
        assert result.success is True

    @pytest.mark.asyncio
    async def test_zero_tokens_returned(self):
        """Test handling of zero token response."""
        request = SpawnRequest(provider="test", task="Task")

        provider = MockProvider(
            response={
                "content": "",
                "stop_reason": "end_turn",
                "input_tokens": 0,
                "output_tokens": 0,
            }
        )

        result = await execute_task(request, provider, "test-provider", "test-model")

        assert result.success is True
        assert result.tokens_used.total == 0
        assert result.cost == 0.0
