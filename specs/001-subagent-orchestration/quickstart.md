# Quickstart: Agent-Agnostic Subagent Orchestration

**Feature**: 001-subagent-orchestration
**Date**: 2025-11-17

## Prerequisites

- Python 3.11 or higher
- pip or uv (package installer)
- At least one LLM provider API key (Anthropic, OpenAI, Google AI, or Ollama running locally)

## Installation

```bash
# Clone the repository
git clone https://github.com/ivo-toby/skynet-mcp.git
cd skynet-mcp

# Create virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Or using uv (faster)
uv pip install -r requirements.txt
```

### Requirements File

```txt
# Core dependencies
mcp>=1.1.2
pydantic>=2.10.0
pyyaml>=6.0.2

# Provider SDKs
anthropic>=0.39.0
openai>=1.54.0
google-generativeai>=0.8.3
ollama>=0.4.0

# Async support
httpx>=0.28.0

# Testing
pytest>=8.3.0
pytest-asyncio>=0.24.0
```

## Configuration

### 1. Set Environment Variables

Create a `.env` file or export variables:

```bash
# At least one of these is required
export ANTHROPIC_API_KEY="your-anthropic-key"
export OPENAI_API_KEY="your-openai-key"
export GOOGLE_AI_KEY="your-google-ai-key"

# Ollama runs locally, no API key needed
```

### 2. Configure Providers (Optional)

Create `config/providers.yaml` to customize provider settings:

```yaml
providers:
  anthropic:
    type: anthropic
    api_key_env_var: ANTHROPIC_API_KEY
    default_model: claude-3-haiku-20240307
    default_temperature: 0.7
    default_max_tokens: 1000

  openai:
    type: openai_compatible
    api_base: https://api.openai.com/v1
    api_key_env_var: OPENAI_API_KEY
    default_model: gpt-4o-mini
    default_temperature: 0.7
    default_max_tokens: 2000

  local:
    type: ollama
    api_base: http://localhost:11434
    default_model: llama3.2:3b
    default_temperature: 0.7
    default_max_tokens: 2000
```

## Running the MCP Server

### STDIO Transport (for Claude Code, Cursor, etc.)

```bash
python -m src.server.mcp_server
```

Configure in your MCP client (e.g., Claude Code `settings.json`):

```json
{
  "mcpServers": {
    "skynet": {
      "command": "python",
      "args": ["-m", "src.server.mcp_server"],
      "cwd": "/path/to/skynet-mcp",
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

### SSE Transport (for web clients)

```bash
python -m src.server.mcp_server --transport sse --port 3000
```

Then connect from any HTTP client at `http://localhost:3000`.

## Using the spawn_agent Tool

Once connected, the `spawn_agent` tool is available to the host agent.

### Basic Usage

```json
{
  "provider": "anthropic",
  "task": "Summarize the following text in 3 bullet points: [your text here]"
}
```

### With Model Override

```json
{
  "provider": "openai",
  "task": "Analyze this code for potential security issues",
  "model": "gpt-4o",
  "temperature": 0.3,
  "max_tokens": 2000
}
```

### With Tools

```json
{
  "provider": "local",
  "task": "Find all TODO comments in the src directory",
  "tools": ["grep", "read_file"],
  "timeout_ms": 60000
}
```

### With Budget Limit

```json
{
  "provider": "anthropic",
  "task": "Research and summarize best practices for...",
  "budget_limit": 0.05
}
```

## Example Response

```json
{
  "success": true,
  "result": "Here are the 3 bullet points:\n- Point 1\n- Point 2\n- Point 3",
  "provider_used": "anthropic",
  "model_used": "claude-3-haiku-20240307",
  "tokens_used": {
    "input": 120,
    "output": 85,
    "total": 205
  },
  "cost": 0.000136,
  "duration_ms": 1850,
  "tools_called": []
}
```

## Testing the Setup

### 1. Run Unit Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/unit/providers/test_anthropic.py
```

### 2. Run Integration Tests (requires API keys)

```bash
# These tests make real API calls
pytest tests/integration/ -v
```

### 3. Manual Testing with Python Client

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def test_spawn():
    server_params = StdioServerParameters(
        command="python",
        args=["-m", "src.server.mcp_server"],
        env=None
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # Call spawn_agent
            result = await session.call_tool(
                "spawn_agent",
                arguments={
                    "provider": "anthropic",
                    "task": "Say hello in 5 different languages"
                }
            )
            print(result)

# Run the test
asyncio.run(test_spawn())
```

## Verifying the Setup

### 1. Check Provider Health

After starting the server, verify providers are configured:

```bash
python -m src.server.mcp_server
# Expected output:
# [INFO] Provider 'anthropic' configured (claude-3-haiku-20240307)
# [INFO] Provider 'openai' configured (gpt-4o-mini)
# [INFO] Provider 'local' configured (llama3.2:3b)
# [INFO] MCP Server ready on STDIO
```

### 2. Test Basic Spawn

From your MCP client (e.g., Claude Code), call:

```
spawn_agent with provider="anthropic", task="Say hello in 5 different languages"
```

Expected: Success response with multi-language greetings and usage metrics.

### 3. Test Budget Enforcement

```
spawn_agent with provider="anthropic", task="Write a long essay", budget_limit=0.001
```

Expected: Task stops with `BUDGET_EXCEEDED` error before completing.

### 4. Test Timeout

```
spawn_agent with provider="local", task="Process a very large dataset", timeout_ms=5000
```

Expected: Task stops with `TIMEOUT` error after 5 seconds.

## Common Issues

### Provider Not Found

**Error**: "Provider 'xyz' not configured"

**Solution**: Check that the provider is defined in `config/providers.yaml` and the API key environment variable is set.

### Missing API Key

**Error**: "Environment variable ANTHROPIC_API_KEY not found"

**Solution**: Export the environment variable or add it to your `.env` file and load with `python-dotenv`.

### Ollama Not Running

**Error**: "Connection refused to http://localhost:11434"

**Solution**: Start Ollama with `ollama serve` before using the local provider.

### Rate Limiting

**Error**: "429 Too Many Requests"

**Solution**: Reduce concurrent spawn requests or implement backoff. Consider using different providers or local Ollama for high-volume tasks.

### Import Errors

**Error**: "ModuleNotFoundError: No module named 'mcp'"

**Solution**: Ensure you've activated the virtual environment and installed dependencies:
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

## Development Workflow

### Project Structure

```
skynet-mcp/
├── src/
│   ├── providers/        # Provider implementations
│   ├── server/           # MCP server and tools
│   ├── orchestrator/     # Task execution logic
│   └── config/           # Configuration and models
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── contract/         # MCP tool contract tests
├── config/
│   └── providers.yaml    # Provider configuration
├── requirements.txt      # Python dependencies
└── pyproject.toml        # Project metadata
```

### Running Tests with Pytest

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test
pytest tests/unit/providers/test_anthropic.py::test_generate_completion

# Run with markers
pytest -m "not integration"  # Skip integration tests

# Watch mode (requires pytest-watch)
ptw
```

### Type Checking

```bash
# Install mypy
pip install mypy

# Run type checker
mypy src/
```

### Code Formatting

```bash
# Install ruff
pip install ruff

# Format code
ruff format src/ tests/

# Lint code
ruff check src/ tests/
```

## Next Steps

1. **Add custom tools**: Register tools in `src/server/tools/` for subagents to use
2. **Configure cost alerts**: Set up budget monitoring for production use
3. **Enable logging**: Configure structured logging for debugging complex workflows
4. **Test provider failover**: Implement fallback logic when primary provider is unavailable
5. **Deploy**: Package as a Docker container or systemd service for production

## Architecture Overview

```
Host Agent (Claude Code, Cursor, Cortext, etc.)
    ↓ MCP Protocol (STDIO or SSE)
SkynetMCP Server (Python)
    ├── spawn_agent tool
    ├── Provider Registry
    │   ├── Anthropic Provider (anthropic SDK)
    │   ├── OpenAI Provider (openai SDK)
    │   ├── Gemini Provider (google-generativeai SDK)
    │   └── Ollama Provider (ollama SDK)
    └── Cost Tracker
        ↓ Provider API (async HTTP)
Subagent Execution
    ↓ Returns
Task Result (with usage metrics)
```

The host agent calls `spawn_agent`, which creates a subagent using the specified provider. The subagent executes the task using the provider's SDK, potentially using configured tools, and returns results with full usage and cost metrics.

## Integration with Cortext

Since your main project (Cortext) is Python-based, you can import and use SkynetMCP directly:

```python
# In your Cortext project
from skynet_mcp.server.tools.spawn_agent import spawn_agent_tool
from skynet_mcp.config.models import SpawnRequest

# Use the tool directly in your code
async def delegate_to_subagent(task: str):
    request = SpawnRequest(
        provider="anthropic",
        task=task,
        timeout_ms=60000
    )
    result = await spawn_agent_tool(request)
    return result
```

Or run as a separate MCP server and connect via the Python MCP client (shown in testing example above).
