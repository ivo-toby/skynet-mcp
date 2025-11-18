# SkynetMCP - Agent-Agnostic Subagent Orchestration

An MCP server that enables any MCP-compatible host agent to spawn AI subagents across multiple LLM providers (Anthropic, OpenAI-compatible APIs, Google Gemini, Ollama).

## Features

- **Provider-Agnostic**: Support for 4 different LLM providers without code changes
- **Cost Tracking**: Monitor token usage and costs for each subagent task
- **Budget Enforcement**: Set budget limits to prevent runaway costs
- **Timeout Control**: Enforce task timeouts to prevent long-running operations
- **MCP Protocol**: Standard Model Context Protocol compliance for universal compatibility

## Quick Start

See [quickstart.md](specs/001-subagent-orchestration/quickstart.md) for detailed setup instructions.

### Prerequisites

- Python 3.11 or higher
- At least one LLM provider API key

### Installation

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration

1. Set environment variables:

```bash
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
# Or configure in .env file
```

2. Customize `config/providers.yaml` if needed

### Running the Server

```bash
# STDIO transport (for Claude Code, Cursor, etc.)
python -m src.server.mcp_server

# SSE transport (for web clients)
python -m src.server.mcp_server --transport sse --port 3000
```

### Usage

Once connected via MCP, use the `spawn_agent` tool:

```json
{
  "provider": "anthropic",
  "task": "Summarize this text in 3 bullet points",
  "temperature": 0.7,
  "max_tokens": 500
}
```

## Development

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=src

# Type check
mypy src/

# Lint and format
ruff check src/
ruff format src/
```

## Architecture

```
Host Agent (Claude Code, Cursor, Cortext, etc.)
    ↓ MCP Protocol (STDIO or SSE)
SkynetMCP Server (Python)
    ├── spawn_agent tool
    ├── Provider Registry
    │   ├── Anthropic Provider
    │   ├── OpenAI-compatible Provider
    │   ├── Gemini Provider
    │   └── Ollama Provider
    └── Cost Tracker
        ↓ Provider API
Subagent Execution → Results (with usage metrics)
```

## Documentation

- [Implementation Plan](specs/001-subagent-orchestration/plan.md)
- [Feature Specification](specs/001-subagent-orchestration/spec.md)
- [Data Model](specs/001-subagent-orchestration/data-model.md)
- [Quickstart Guide](specs/001-subagent-orchestration/quickstart.md)

## License

ISC
