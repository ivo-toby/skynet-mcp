"""Contract tests for spawn_agent MCP tool."""

import json
from pathlib import Path

import pytest

from src.config.models import ProviderConfig, SpawnRequest, TaskResult
from src.server.tools.spawn_agent import spawn_agent


class TestSpawnAgentContract:
    """Test spawn_agent tool contract and schema."""

    @pytest.mark.asyncio
    async def test_spawn_agent_basic_request_response(self, tmp_path):
        """Test spawn_agent with basic request returns valid TaskResult."""
        # Create minimal provider config
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  test:
    type: ollama
    api_key_env_var: ""
    default_model: test-model
""")

        # Mock provider configs
        provider_configs = {
            "test": ProviderConfig(
                name="test",
                type="ollama",
                api_key_env_var="",
                default_model="test-model",
            )
        }

        request = SpawnRequest(
            provider="test",
            task="Test task",
        )

        # This will fail because we don't have a real provider, but we can test the structure
        result = await spawn_agent(request, provider_configs)

        # Verify result structure
        assert isinstance(result, TaskResult)
        assert hasattr(result, "success")
        assert hasattr(result, "result")
        assert hasattr(result, "provider_used")
        assert hasattr(result, "model_used")
        assert hasattr(result, "tokens_used")
        assert hasattr(result, "cost")
        assert hasattr(result, "duration_ms")
        assert hasattr(result, "tools_called")
        assert hasattr(result, "error")

    def test_spawn_request_schema(self):
        """Test SpawnRequest schema validation."""
        # Valid minimal request
        request = SpawnRequest(
            provider="test",
            task="Test task",
        )

        assert request.provider == "test"
        assert request.task == "Test task"
        assert request.tools == []
        assert request.model is None
        assert request.temperature is None
        assert request.max_tokens is None
        assert request.timeout_ms == 120000  # Default
        assert request.budget_limit is None

    def test_spawn_request_with_all_fields(self):
        """Test SpawnRequest with all optional fields."""
        request = SpawnRequest(
            provider="anthropic",
            task="Analyze code",
            tools=["grep", "read_file"],
            model="claude-3-haiku-20240307",
            temperature=0.5,
            max_tokens=2000,
            top_p=0.9,
            top_k=50,
            system_prompt="You are a code analyzer",
            timeout_ms=60000,
            budget_limit=0.10,
        )

        assert request.provider == "anthropic"
        assert request.task == "Analyze code"
        assert request.tools == ["grep", "read_file"]
        assert request.model == "claude-3-haiku-20240307"
        assert request.temperature == 0.5
        assert request.max_tokens == 2000
        assert request.top_p == 0.9
        assert request.top_k == 50
        assert request.system_prompt == "You are a code analyzer"
        assert request.timeout_ms == 60000
        assert request.budget_limit == 0.10

    def test_spawn_request_validation_empty_task(self):
        """Test that empty task raises validation error."""
        with pytest.raises(Exception):  # Pydantic ValidationError
            SpawnRequest(
                provider="test",
                task="",  # Empty task should fail min_length=1
            )

    def test_spawn_request_validation_temperature_range(self):
        """Test temperature validation."""
        # Valid range
        request = SpawnRequest(provider="test", task="test", temperature=0.0)
        assert request.temperature == 0.0

        request = SpawnRequest(provider="test", task="test", temperature=2.0)
        assert request.temperature == 2.0

        # Invalid range
        with pytest.raises(Exception):
            SpawnRequest(provider="test", task="test", temperature=-0.1)

        with pytest.raises(Exception):
            SpawnRequest(provider="test", task="test", temperature=2.1)

    def test_spawn_request_validation_timeout_range(self):
        """Test timeout validation."""
        # Minimum timeout
        request = SpawnRequest(provider="test", task="test", timeout_ms=1000)
        assert request.timeout_ms == 1000

        # Maximum timeout
        request = SpawnRequest(provider="test", task="test", timeout_ms=600000)
        assert request.timeout_ms == 600000

        # Below minimum
        with pytest.raises(Exception):
            SpawnRequest(provider="test", task="test", timeout_ms=999)

        # Above maximum
        with pytest.raises(Exception):
            SpawnRequest(provider="test", task="test", timeout_ms=600001)

    def test_spawn_request_validation_budget_limit(self):
        """Test budget limit validation."""
        # Valid budget
        request = SpawnRequest(provider="test", task="test", budget_limit=0.0)
        assert request.budget_limit == 0.0

        request = SpawnRequest(provider="test", task="test", budget_limit=100.0)
        assert request.budget_limit == 100.0

        # Negative budget should fail
        with pytest.raises(Exception):
            SpawnRequest(provider="test", task="test", budget_limit=-0.01)

    def test_task_result_schema(self):
        """Test TaskResult schema."""
        from src.config.models import LLMError, TokenUsage

        result = TaskResult(
            success=True,
            result="Task completed successfully",
            provider_used="anthropic",
            model_used="claude-3-haiku-20240307",
            tokens_used=TokenUsage(input=100, output=50),
            cost=0.001,
            duration_ms=1500,
            tools_called=["grep"],
            error=None,
        )

        assert result.success is True
        assert result.result == "Task completed successfully"
        assert result.provider_used == "anthropic"
        assert result.model_used == "claude-3-haiku-20240307"
        assert result.tokens_used.input == 100
        assert result.tokens_used.output == 50
        assert result.tokens_used.total == 150
        assert result.cost == 0.001
        assert result.duration_ms == 1500
        assert result.tools_called == ["grep"]
        assert result.error is None

    def test_task_result_with_error(self):
        """Test TaskResult with error."""
        from src.config.models import LLMError, TokenUsage

        error = LLMError(
            code="TIMEOUT",
            message="Task exceeded timeout of 120000ms",
        )

        result = TaskResult(
            success=False,
            result="",
            provider_used="anthropic",
            model_used="claude-3-haiku-20240307",
            tokens_used=TokenUsage(),
            cost=0.0,
            duration_ms=120000,
            tools_called=[],
            error=error,
        )

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "TIMEOUT"
        assert "timeout" in result.error.message.lower()

    def test_task_result_json_serialization(self):
        """Test that TaskResult can be serialized to JSON."""
        from src.config.models import TokenUsage

        result = TaskResult(
            success=True,
            result="Success",
            provider_used="anthropic",
            model_used="claude-3-haiku-20240307",
            tokens_used=TokenUsage(input=10, output=20),
            cost=0.001,
            duration_ms=1000,
            tools_called=[],
            error=None,
        )

        # Serialize to JSON
        json_str = result.model_dump_json()
        assert isinstance(json_str, str)

        # Parse back
        data = json.loads(json_str)
        assert data["success"] is True
        assert data["provider_used"] == "anthropic"
        assert data["tokens_used"]["input"] == 10
        assert data["tokens_used"]["output"] == 20
        assert data["tokens_used"]["total"] == 30

    def test_token_usage_in_response(self):
        """Test that token usage is properly tracked in response (T042)."""
        from src.config.models import TokenUsage

        # Verify TokenUsage model structure
        tokens = TokenUsage(input=1000, output=500)

        assert hasattr(tokens, "input")
        assert hasattr(tokens, "output")
        assert hasattr(tokens, "total")
        assert tokens.input == 1000
        assert tokens.output == 500
        assert tokens.total == 1500

        # Verify it's included in TaskResult
        result = TaskResult(
            success=True,
            result="Test",
            provider_used="test",
            model_used="test",
            tokens_used=tokens,
            cost=0.0,
            duration_ms=100,
            tools_called=[],
        )

        assert result.tokens_used.input == 1000
        assert result.tokens_used.output == 500
        assert result.tokens_used.total == 1500

    @pytest.mark.asyncio
    async def test_provider_not_found_error_contract(self):
        """Test error response when provider not found."""
        provider_configs = {}  # Empty configs

        request = SpawnRequest(
            provider="nonexistent",
            task="Test task",
        )

        result = await spawn_agent(request, provider_configs)

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "PROVIDER_NOT_FOUND"
        assert "nonexistent" in result.error.message
        assert result.duration_ms == 0  # Pre-execution error
