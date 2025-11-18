"""MCP server implementation."""

import argparse
import asyncio
import logging
import sys
from pathlib import Path

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool

from src.config.models import SpawnRequest
from src.providers.anthropic import AnthropicProvider
from src.providers.registry import registry
from src.server.tools.spawn_agent import spawn_agent

# Configure logging
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def register_providers():
    """Register all provider implementations."""
    registry.register("anthropic", AnthropicProvider)
    # Additional providers will be registered here in later phases
    logger.info("Registered providers: anthropic")


async def serve(transport: str = "stdio", port: int = 3000):
    """
    Start the MCP server.

    Args:
        transport: Transport type ("stdio" or "sse")
        port: Port for SSE transport (ignored for STDIO)
    """
    # Register providers
    register_providers()

    # Create server instance
    server = Server("skynet-mcp")

    # Define spawn_agent tool schema
    spawn_agent_tool = Tool(
        name="spawn_agent",
        description="Spawn a subagent to perform a task and return results with token usage and cost tracking",
        inputSchema={
            "type": "object",
            "properties": {
                "provider": {
                    "type": "string",
                    "description": "Name of the configured LLM provider to use",
                },
                "task": {
                    "type": "string",
                    "description": "Natural language description of what the subagent should do",
                },
                "tools": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of tool names available to the subagent",
                    "default": [],
                },
                "model": {"type": "string", "description": "Override provider's default model"},
                "temperature": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 2,
                    "description": "Sampling temperature",
                },
                "max_tokens": {"type": "integer", "minimum": 1, "description": "Maximum tokens"},
                "top_p": {
                    "type": "number",
                    "minimum": 0,
                    "maximum": 1,
                    "description": "Top-P nucleus sampling",
                },
                "top_k": {"type": "integer", "minimum": 1, "description": "Top-K sampling"},
                "system_prompt": {"type": "string", "description": "Custom system prompt"},
                "timeout_ms": {
                    "type": "integer",
                    "minimum": 1000,
                    "maximum": 600000,
                    "default": 120000,
                    "description": "Task timeout in milliseconds",
                },
                "budget_limit": {
                    "type": "number",
                    "minimum": 0,
                    "description": "Maximum cost in USD",
                },
            },
            "required": ["provider", "task"],
        },
    )

    # Register tool
    @server.list_tools()
    async def list_tools():
        return [spawn_agent_tool]

    @server.call_tool()
    async def call_tool(name: str, arguments: dict):
        if name == "spawn_agent":
            # Parse and validate request
            request = SpawnRequest(**arguments)

            # Execute spawn
            result = await spawn_agent(request)

            # Return result as MCP content
            return [
                {
                    "type": "text",
                    "text": result.model_dump_json(indent=2),
                }
            ]
        else:
            raise ValueError(f"Unknown tool: {name}")

    # Start server
    if transport == "stdio":
        logger.info("Starting MCP server on STDIO")
        async with stdio_server() as (read_stream, write_stream):
            await server.run(read_stream, write_stream, server.create_initialization_options())
    else:
        # SSE transport not implemented in this MVP
        logger.error("SSE transport not yet implemented")
        sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="SkynetMCP - Subagent Orchestration Server")
    parser.add_argument(
        "--transport", choices=["stdio", "sse"], default="stdio", help="Transport protocol"
    )
    parser.add_argument("--port", type=int, default=3000, help="Port for SSE transport")

    args = parser.parse_args()

    try:
        asyncio.run(serve(args.transport, args.port))
    except KeyboardInterrupt:
        logger.info("Server stopped")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
