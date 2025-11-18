"""Tool definitions and execution for subagents."""

import json
import logging
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)


# Tool Definitions in Anthropic/OpenAI compatible format
TOOL_DEFINITIONS = {
    "file_read": {
        "type": "function",
        "function": {
            "name": "file_read",
            "description": "Read the contents of a file from the filesystem",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Absolute or relative path to the file to read",
                    }
                },
                "required": ["file_path"],
            },
        },
    },
    "web_fetch": {
        "type": "function",
        "function": {
            "name": "web_fetch",
            "description": "Fetch content from a web URL",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The URL to fetch content from (must be http or https)",
                    }
                },
                "required": ["url"],
            },
        },
    },
}


async def execute_tool(tool_name: str, tool_input: dict[str, Any]) -> str:
    """
    Execute a tool call and return the result.

    Args:
        tool_name: Name of the tool to execute
        tool_input: Input parameters for the tool

    Returns:
        String result from the tool execution

    Raises:
        ValueError: If tool is unknown or parameters are invalid
    """
    logger.info(f"Executing tool: {tool_name} with input: {tool_input}")

    if tool_name == "file_read":
        return await _execute_file_read(tool_input)
    elif tool_name == "web_fetch":
        return await _execute_web_fetch(tool_input)
    else:
        raise ValueError(f"Unknown tool: {tool_name}")


async def _execute_file_read(tool_input: dict[str, Any]) -> str:
    """Execute file_read tool."""
    file_path = tool_input.get("file_path")
    if not file_path:
        return json.dumps({"error": "file_path parameter is required"})

    try:
        path = Path(file_path)

        # Security: Prevent reading outside of allowed directories
        # For MVP, we'll allow any path but log it
        logger.info(f"Reading file: {path.absolute()}")

        if not path.exists():
            return json.dumps({"error": f"File not found: {file_path}"})

        if not path.is_file():
            return json.dumps({"error": f"Path is not a file: {file_path}"})

        # Read file content
        content = path.read_text(encoding="utf-8")

        # Limit file size to prevent token explosion
        max_chars = 100000  # ~25k tokens
        if len(content) > max_chars:
            content = content[:max_chars] + f"\n\n[File truncated - {len(content)} total characters]"

        return json.dumps({"content": content, "path": str(path.absolute())})

    except UnicodeDecodeError:
        return json.dumps({"error": f"File is not valid UTF-8: {file_path}"})
    except PermissionError:
        return json.dumps({"error": f"Permission denied reading file: {file_path}"})
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {e}")
        return json.dumps({"error": f"Failed to read file: {str(e)}"})


async def _execute_web_fetch(tool_input: dict[str, Any]) -> str:
    """Execute web_fetch tool."""
    url = tool_input.get("url")
    if not url:
        return json.dumps({"error": "url parameter is required"})

    # Validate URL
    if not url.startswith(("http://", "https://")):
        return json.dumps({"error": "URL must start with http:// or https://"})

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            logger.info(f"Fetching URL: {url}")
            response = await client.get(url)
            response.raise_for_status()

            # Get content type
            content_type = response.headers.get("content-type", "")

            # Only handle text-based content
            if not any(t in content_type for t in ["text/", "application/json", "application/xml"]):
                return json.dumps(
                    {
                        "error": f"Unsupported content type: {content_type}",
                        "url": url,
                    }
                )

            # Get text content
            content = response.text

            # Limit content size
            max_chars = 100000  # ~25k tokens
            if len(content) > max_chars:
                content = content[:max_chars] + f"\n\n[Content truncated - {len(content)} total characters]"

            return json.dumps(
                {
                    "content": content,
                    "url": url,
                    "status_code": response.status_code,
                    "content_type": content_type,
                }
            )

    except httpx.TimeoutException:
        return json.dumps({"error": f"Request timed out after 30 seconds: {url}"})
    except httpx.HTTPStatusError as e:
        return json.dumps(
            {"error": f"HTTP error {e.response.status_code}: {url}", "status_code": e.response.status_code}
        )
    except Exception as e:
        logger.error(f"Error fetching URL {url}: {e}")
        return json.dumps({"error": f"Failed to fetch URL: {str(e)}"})


def get_tools_for_request(tool_names: list[str]) -> list[dict]:
    """
    Get tool definitions for the requested tools.

    Args:
        tool_names: List of tool names to include

    Returns:
        List of tool definition dicts in OpenAI/Anthropic format

    Raises:
        ValueError: If an unknown tool is requested
    """
    tools = []
    for name in tool_names:
        if name not in TOOL_DEFINITIONS:
            raise ValueError(f"Unknown tool: {name}. Available tools: {', '.join(TOOL_DEFINITIONS.keys())}")
        tools.append(TOOL_DEFINITIONS[name])

    return tools
