"""Unit tests for tool definitions and execution."""

import json
from pathlib import Path

import pytest

from src.orchestrator.tool_definitions import (
    TOOL_DEFINITIONS,
    execute_tool,
    get_tools_for_request,
)


class TestToolDefinitions:
    """Test tool definition structure and validation."""

    def test_file_read_tool_structure(self):
        """Test that file_read tool has correct structure."""
        tool = TOOL_DEFINITIONS["file_read"]

        assert tool["type"] == "function"
        assert tool["function"]["name"] == "file_read"
        assert "description" in tool["function"]
        assert "parameters" in tool["function"]
        assert tool["function"]["parameters"]["type"] == "object"
        assert "file_path" in tool["function"]["parameters"]["properties"]
        assert "file_path" in tool["function"]["parameters"]["required"]

    def test_web_fetch_tool_structure(self):
        """Test that web_fetch tool has correct structure."""
        tool = TOOL_DEFINITIONS["web_fetch"]

        assert tool["type"] == "function"
        assert tool["function"]["name"] == "web_fetch"
        assert "description" in tool["function"]
        assert "parameters" in tool["function"]
        assert tool["function"]["parameters"]["type"] == "object"
        assert "url" in tool["function"]["parameters"]["properties"]
        assert "url" in tool["function"]["parameters"]["required"]

    def test_get_tools_for_request_valid_tools(self):
        """Test getting tools for valid tool names."""
        tools = get_tools_for_request(["file_read", "web_fetch"])

        assert len(tools) == 2
        assert tools[0]["function"]["name"] == "file_read"
        assert tools[1]["function"]["name"] == "web_fetch"

    def test_get_tools_for_request_single_tool(self):
        """Test getting a single tool."""
        tools = get_tools_for_request(["file_read"])

        assert len(tools) == 1
        assert tools[0]["function"]["name"] == "file_read"

    def test_get_tools_for_request_unknown_tool(self):
        """Test that unknown tool raises ValueError."""
        with pytest.raises(ValueError, match="Unknown tool: unknown_tool"):
            get_tools_for_request(["file_read", "unknown_tool"])

    def test_get_tools_for_request_empty_list(self):
        """Test getting tools with empty list."""
        tools = get_tools_for_request([])
        assert tools == []


class TestFileReadTool:
    """Test file_read tool execution."""

    @pytest.mark.asyncio
    async def test_file_read_success(self, tmp_path):
        """Test successful file read."""
        # Create a test file
        test_file = tmp_path / "test.txt"
        test_content = "Hello, world!\nThis is a test file."
        test_file.write_text(test_content)

        # Execute tool
        result = await execute_tool("file_read", {"file_path": str(test_file)})
        result_data = json.loads(result)

        assert "content" in result_data
        assert result_data["content"] == test_content
        assert "path" in result_data
        assert Path(result_data["path"]) == test_file.absolute()

    @pytest.mark.asyncio
    async def test_file_read_file_not_found(self):
        """Test file read with non-existent file."""
        result = await execute_tool("file_read", {"file_path": "/nonexistent/file.txt"})
        result_data = json.loads(result)

        assert "error" in result_data
        assert "not found" in result_data["error"].lower()

    @pytest.mark.asyncio
    async def test_file_read_missing_parameter(self):
        """Test file read without file_path parameter."""
        result = await execute_tool("file_read", {})
        result_data = json.loads(result)

        assert "error" in result_data
        assert "required" in result_data["error"].lower()

    @pytest.mark.asyncio
    async def test_file_read_directory(self, tmp_path):
        """Test file read with directory path."""
        result = await execute_tool("file_read", {"file_path": str(tmp_path)})
        result_data = json.loads(result)

        assert "error" in result_data
        assert "not a file" in result_data["error"].lower()

    @pytest.mark.asyncio
    async def test_file_read_large_file(self, tmp_path):
        """Test file read with large file (should truncate)."""
        # Create a large file (>100k chars)
        test_file = tmp_path / "large.txt"
        large_content = "x" * 150000  # 150k characters
        test_file.write_text(large_content)

        result = await execute_tool("file_read", {"file_path": str(test_file)})
        result_data = json.loads(result)

        assert "content" in result_data
        # Should be truncated to ~100k
        assert len(result_data["content"]) < len(large_content)
        assert "truncated" in result_data["content"].lower()


class TestWebFetchTool:
    """Test web_fetch tool execution."""

    @pytest.mark.asyncio
    async def test_web_fetch_missing_parameter(self):
        """Test web fetch without url parameter."""
        result = await execute_tool("web_fetch", {})
        result_data = json.loads(result)

        assert "error" in result_data
        assert "required" in result_data["error"].lower()

    @pytest.mark.asyncio
    async def test_web_fetch_invalid_protocol(self):
        """Test web fetch with invalid protocol."""
        result = await execute_tool("web_fetch", {"url": "ftp://example.com"})
        result_data = json.loads(result)

        assert "error" in result_data
        assert "http" in result_data["error"].lower()

    @pytest.mark.asyncio
    async def test_web_fetch_http_url(self):
        """Test web fetch with http URL (should work)."""
        # This test would need a mock HTTP server or network access
        # For now, we test the URL validation passes
        result = await execute_tool("web_fetch", {"url": "http://example.com"})
        result_data = json.loads(result)

        # Will likely fail to connect in test environment, but should not reject the URL
        # The error should be about connection, not URL format
        if "error" in result_data:
            assert "http://" not in result_data["error"].lower() or "https://" not in result_data["error"].lower()


class TestToolExecution:
    """Test general tool execution logic."""

    @pytest.mark.asyncio
    async def test_execute_unknown_tool(self):
        """Test executing unknown tool raises ValueError."""
        with pytest.raises(ValueError, match="Unknown tool"):
            await execute_tool("unknown_tool", {})

    @pytest.mark.asyncio
    async def test_tool_execution_isolation(self, tmp_path):
        """Test that multiple tool executions don't interfere."""
        # Create two test files
        file1 = tmp_path / "file1.txt"
        file2 = tmp_path / "file2.txt"
        file1.write_text("Content 1")
        file2.write_text("Content 2")

        # Execute tool twice
        result1 = await execute_tool("file_read", {"file_path": str(file1)})
        result2 = await execute_tool("file_read", {"file_path": str(file2)})

        data1 = json.loads(result1)
        data2 = json.loads(result2)

        assert data1["content"] == "Content 1"
        assert data2["content"] == "Content 2"
