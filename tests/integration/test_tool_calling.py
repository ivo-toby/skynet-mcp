"""Integration tests for tool calling functionality (requires API key)."""

import os
from pathlib import Path

import pytest

from src.config.models import ProviderConfig, SpawnRequest
from src.orchestrator.task_executor import execute_task
from src.providers.anthropic import AnthropicProvider


@pytest.mark.integration
@pytest.mark.asyncio
async def test_file_read_tool_with_anthropic():
    """Test that subagent can use file_read tool (requires ANTHROPIC_API_KEY)."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    # Create a test file
    test_file = Path(__file__).parent / "test_data.txt"
    test_file.parent.mkdir(exist_ok=True)
    test_file.write_text("The secret code is: SKYNET-42")

    try:
        config = ProviderConfig(
            name="test-anthropic",
            type="anthropic",
            api_key_env_var="ANTHROPIC_API_KEY",
            default_model="claude-3-haiku-20240307",
        )

        provider = AnthropicProvider(config)

        # Request that requires file read
        request = SpawnRequest(
            provider="anthropic",
            task=f"Read the file at {test_file} and tell me what the secret code is. Use the file_read tool.",
            tools=["file_read"],  # Provide file_read tool
            max_tokens=500,
            budget_limit=1.0,
        )

        result = await execute_task(request, provider, "anthropic", "claude-3-haiku-20240307")

        # Verify task succeeded
        assert result.success is True
        assert result.error is None

        # Verify tool was called
        assert "file_read" in result.tools_called

        # Verify response contains the secret code
        assert "SKYNET-42" in result.result or "skynet-42" in result.result.lower()

        # Verify token usage
        assert result.tokens_used.input > 0
        assert result.tokens_used.output > 0
        assert result.cost > 0

    finally:
        # Cleanup
        if test_file.exists():
            test_file.unlink()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_tool_not_provided_fails_gracefully():
    """Test that task without required tools fails gracefully."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

    # Request that requires file read but tool not provided
    request = SpawnRequest(
        provider="anthropic",
        task="Read the file at /tmp/test.txt and tell me what it contains. Use the file_read tool.",
        tools=[],  # No tools provided
        max_tokens=200,
        budget_limit=1.0,
    )

    result = await execute_task(request, provider, "anthropic", "claude-3-haiku-20240307")

    # Task should complete but may not be able to read the file
    # The LLM should respond explaining it doesn't have access to the tool
    assert result.success is True
    assert len(result.tools_called) == 0  # No tools were called


@pytest.mark.integration
@pytest.mark.asyncio
async def test_invalid_tool_name():
    """Test that requesting invalid tool returns error."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

    # Request with invalid tool name
    request = SpawnRequest(
        provider="anthropic",
        task="Read a file",
        tools=["invalid_tool"],  # Invalid tool
        max_tokens=100,
    )

    result = await execute_task(request, provider, "anthropic", "claude-3-haiku-20240307")

    # Should fail with invalid tool error
    assert result.success is False
    assert result.error is not None
    assert result.error.code == "INVALID_TOOL"
    assert "invalid_tool" in result.error.message.lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_multiple_tool_calls():
    """Test that subagent can make multiple tool calls."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    # Create two test files
    test_dir = Path(__file__).parent / "test_dir"
    test_dir.mkdir(exist_ok=True)

    file1 = test_dir / "file1.txt"
    file2 = test_dir / "file2.txt"
    file1.write_text("First file contains: ALPHA")
    file2.write_text("Second file contains: BETA")

    try:
        config = ProviderConfig(
            name="test-anthropic",
            type="anthropic",
            api_key_env_var="ANTHROPIC_API_KEY",
            default_model="claude-3-haiku-20240307",
        )

        provider = AnthropicProvider(config)

        # Request that requires reading both files
        request = SpawnRequest(
            provider="anthropic",
            task=f"Read both files: {file1} and {file2}. Tell me what codes they contain. Use file_read tool for each file.",
            tools=["file_read"],
            max_tokens=1000,
            budget_limit=1.0,
        )

        result = await execute_task(request, provider, "anthropic", "claude-3-haiku-20240307")

        # Verify task succeeded
        assert result.success is True

        # Verify file_read was called (possibly multiple times)
        assert "file_read" in result.tools_called

        # Verify response contains both codes
        response_lower = result.result.lower()
        assert "alpha" in response_lower
        assert "beta" in response_lower

    finally:
        # Cleanup
        if file1.exists():
            file1.unlink()
        if file2.exists():
            file2.unlink()
        if test_dir.exists():
            test_dir.rmdir()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_tool_calling_with_budget_limit():
    """Test that budget limits work with tool calling."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

    # Create a test file
    test_file = Path(__file__).parent / "budget_test.txt"
    test_file.parent.mkdir(exist_ok=True)
    test_file.write_text("Test content")

    try:
        # Request with very small budget (should likely exceed with tool calling)
        request = SpawnRequest(
            provider="anthropic",
            task=f"Read {test_file} multiple times and analyze it thoroughly.",
            tools=["file_read"],
            max_tokens=2000,
            budget_limit=0.001,  # Very small budget
        )

        result = await execute_task(request, provider, "anthropic", "claude-3-haiku-20240307")

        # May succeed with Haiku's low cost or may exceed budget
        if not result.success:
            # If failed, should be budget exceeded
            assert result.error.code in ["BUDGET_EXCEEDED", "TIMEOUT"]
        else:
            # If succeeded, cost should be under limit
            assert result.cost <= request.budget_limit

    finally:
        # Cleanup
        if test_file.exists():
            test_file.unlink()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_task_without_tools():
    """Test that task without tools still works normally."""
    if "ANTHROPIC_API_KEY" not in os.environ:
        pytest.skip("ANTHROPIC_API_KEY not set")

    config = ProviderConfig(
        name="test-anthropic",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307",
    )

    provider = AnthropicProvider(config)

    # Simple request without any tools
    request = SpawnRequest(
        provider="anthropic",
        task="What is 2+2? Just give me the number.",
        tools=[],  # No tools
        max_tokens=50,
    )

    result = await execute_task(request, provider, "anthropic", "claude-3-haiku-20240307")

    # Should succeed normally
    assert result.success is True
    assert len(result.tools_called) == 0
    assert "4" in result.result
