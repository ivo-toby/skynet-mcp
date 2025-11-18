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

## Project Structure

```
skynet-mcp/
├── src/
│   ├── config/           # Configuration models and loaders
│   ├── providers/        # LLM provider implementations
│   │   ├── base.py      # Provider protocol interface
│   │   ├── registry.py  # Provider factory
│   │   ├── anthropic.py
│   │   ├── openai_compatible.py
│   │   ├── gemini.py
│   │   └── ollama.py
│   ├── orchestrator/     # Task execution and cost tracking
│   │   ├── task_executor.py
│   │   └── cost_tracker.py
│   └── server/           # MCP server and tools
│       ├── mcp_server.py
│       └── tools/
│           └── spawn_agent.py
├── tests/
│   ├── unit/             # Unit tests (no external dependencies)
│   ├── integration/      # Integration tests (real API calls)
│   └── contract/         # MCP tool contract tests
├── config/
│   └── providers.yaml    # Provider configuration template
└── specs/                # Feature specifications and documentation
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

## Development

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/ivo-toby/skynet-mcp.git
cd skynet-mcp

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install pytest pytest-asyncio pytest-cov mypy ruff
```

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code style and patterns
   - Add type hints to all functions
   - Write docstrings for public APIs
   - Keep functions focused and single-purpose

3. **Run tests and checks**
   ```bash
   # Run tests
   pytest

   # Check type safety
   mypy src/

   # Lint code
   ruff check src/

   # Format code
   ruff format src/
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   Use conventional commit messages:
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions or changes
   - `chore:` - Maintenance tasks

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Code Style Guidelines

- **Type Hints**: Use type hints for all function parameters and return values
- **Docstrings**: Use Google-style docstrings for all public functions and classes
- **Naming**: Use snake_case for functions/variables, PascalCase for classes
- **Line Length**: Maximum 100 characters per line
- **Imports**: Group imports (standard library, third-party, local) with blank lines between groups
- **Error Handling**: Provide clear error messages with remediation guidance

### Adding a New Provider

To add support for a new LLM provider:

1. Create a new file in `src/providers/` (e.g., `cohere.py`)
2. Implement the `LLMProvider` protocol:
   ```python
   from src.providers.base import LLMProvider
   from src.types import Message, GenerationParams, CompletionResponse

   class CohereProvider:
       def __init__(self, config: ProviderConfig):
           # Initialize provider with API key from config
           pass

       async def generate_completion(
           self, messages: list[Message], params: GenerationParams
       ) -> CompletionResponse:
           # Call provider API and return response
           pass
   ```
3. Register the provider in `src/server/mcp_server.py`:
   ```python
   registry.register("cohere", CohereProvider)
   ```
4. Add pricing information to `src/orchestrator/cost_tracker.py`
5. Update `src/config/models.py` to include the new provider type
6. Add tests in `tests/integration/test_cohere.py`
7. Update documentation

## Testing

SkynetMCP uses pytest for all testing with three types of tests:

### Unit Tests

Unit tests have no external dependencies and run quickly.

```bash
# Run all unit tests
pytest tests/unit/

# Run specific unit test file
pytest tests/unit/orchestrator/test_cost_tracker.py

# Run with verbose output
pytest tests/unit/ -v

# Run with coverage
pytest tests/unit/ --cov=src --cov-report=html
```

**Example unit test locations:**
- `tests/unit/orchestrator/test_cost_tracker.py` - Cost calculation tests
- `tests/unit/providers/test_registry.py` - Provider registry tests
- `tests/unit/config/test_providers.py` - Configuration loading tests

### Integration Tests

Integration tests make real API calls and require API keys.

```bash
# Run all integration tests (requires API keys)
pytest tests/integration/ -v

# Run specific provider integration test
pytest tests/integration/test_anthropic.py

# Skip integration tests
pytest -m "not integration"
```

**Setting up for integration tests:**
```bash
# Set required environment variables
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
export GOOGLE_AI_KEY="your-key"

# Run integration tests
pytest tests/integration/
```

### Contract Tests

Contract tests verify MCP tool schemas and behavior.

```bash
# Run contract tests
pytest tests/contract/

# Test specific tool contract
pytest tests/contract/test_spawn_agent.py
```

### Running All Tests

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=src --cov-report=html --cov-report=term

# Run specific test by name
pytest -k "test_cost_calculation"

# Run tests in parallel (requires pytest-xdist)
pip install pytest-xdist
pytest -n auto
```

### Writing Tests

**Unit test example:**
```python
import pytest
from src.orchestrator.cost_tracker import calculate_cost
from src.config.models import TokenUsage

def test_calculate_cost_anthropic():
    tokens = TokenUsage(input=1000, output=500)
    cost = calculate_cost("claude-3-haiku-20240307", tokens)
    assert cost == 0.000875  # (1000/1000 * 0.00025) + (500/1000 * 0.00125)
```

**Integration test example:**
```python
import pytest
from src.providers.anthropic import AnthropicProvider
from src.config.models import ProviderConfig

@pytest.mark.integration
@pytest.mark.asyncio
async def test_anthropic_completion():
    config = ProviderConfig(
        name="test",
        type="anthropic",
        api_key_env_var="ANTHROPIC_API_KEY",
        default_model="claude-3-haiku-20240307"
    )
    provider = AnthropicProvider(config)

    messages = [{"role": "user", "content": "Say hello"}]
    response = await provider.generate_completion(messages, {})

    assert response["content"]
    assert response["input_tokens"] > 0
    assert response["output_tokens"] > 0
```

### Test Configuration

Tests are configured in `pytest.ini`:

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
markers =
    integration: marks tests that require API keys (deselect with '-m "not integration"')
    slow: marks tests as slow (deselect with '-m "not slow"')
asyncio_mode = auto
```

## Contributing

We welcome contributions! Here's how to get started:

### Contribution Guidelines

1. **Fork the repository** and create a feature branch
2. **Follow the development workflow** outlined above
3. **Write tests** for all new features and bug fixes
4. **Update documentation** for user-facing changes
5. **Ensure all tests pass** before submitting PR
6. **Keep commits atomic** - one logical change per commit
7. **Write clear commit messages** using conventional commit format

### Pull Request Process

1. **Update the CHANGELOG** (if applicable)
2. **Ensure CI passes** (tests, type checking, linting)
3. **Request review** from maintainers
4. **Address feedback** promptly
5. **Squash commits** if requested before merge

### What to Contribute

We're especially interested in:

- **New provider implementations** (Cohere, Together.ai, etc.)
- **Bug fixes** with test coverage
- **Performance improvements** with benchmarks
- **Documentation improvements** and examples
- **Test coverage** additions
- **Error handling** improvements
- **Feature requests** via GitHub Issues

### Code Review Criteria

Pull requests are reviewed for:

- **Correctness**: Does it work as intended?
- **Test coverage**: Are there tests for new code?
- **Code quality**: Is it readable, maintainable, and well-documented?
- **Performance**: Are there any obvious performance issues?
- **Security**: Are there any security concerns?
- **Compatibility**: Does it maintain backward compatibility?

### Reporting Issues

When reporting issues, please include:

- **Python version** and operating system
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Error messages** and stack traces
- **Configuration** (sanitized, no API keys)
- **Logs** (if applicable)

Use the issue template on GitHub for structured reports.

### Community

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Pull Requests**: Code contributions

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain a harassment-free environment

## Documentation

- [Implementation Plan](specs/001-subagent-orchestration/plan.md)
- [Feature Specification](specs/001-subagent-orchestration/spec.md)
- [Data Model](specs/001-subagent-orchestration/data-model.md)
- [Quickstart Guide](specs/001-subagent-orchestration/quickstart.md)
- [Task Breakdown](specs/001-subagent-orchestration/tasks.md)

## License

ISC
