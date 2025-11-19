# Data Model: Agent-Agnostic Subagent Orchestration

**Date**: 2025-11-17
**Branch**: 001-subagent-orchestration

## Core Entities (Pydantic Models)

### Provider Configuration

Represents an LLM backend configuration loaded at startup.

```python
from pydantic import BaseModel, Field
from typing import Literal

class ProviderConfig(BaseModel):
    """Configuration for an LLM provider"""
    name: str = Field(..., description="Unique identifier for the provider")
    type: Literal["anthropic", "openai_compatible", "gemini", "ollama"]
    api_base: str | None = Field(None, description="Base URL for API requests")
    api_key_env_var: str = Field(..., description="Environment variable name for API key")
    default_model: str = Field(..., description="Model to use when not specified")
    default_temperature: float = Field(0.7, ge=0.0, le=2.0)
    default_max_tokens: int = Field(1000, gt=0)
```

**Validation Rules**:
- `name` must be unique across all configured providers
- `type` must be one of the supported provider types
- `api_key_env_var` must reference an environment variable that exists at startup
- `default_model` must be a valid model identifier for the provider type
- `default_temperature` between 0.0 and 2.0
- `default_max_tokens` must be positive

**State**: Immutable after initial load from configuration file.

---

### Spawn Request

A request from the host agent to create and execute a subagent task.

```python
from pydantic import BaseModel, Field

class SpawnRequest(BaseModel):
    """Request to spawn a subagent for a task"""
    provider: str = Field(..., description="Name of the configured provider to use")
    task: str = Field(..., min_length=1, description="What the subagent should do")
    tools: list[str] = Field(
        default_factory=list,
        description="List of tool names available to the subagent"
    )
    model: str | None = Field(None, description="Override provider's default model")
    temperature: float | None = Field(None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(None, gt=0)
    top_p: float | None = Field(None, ge=0.0, le=1.0)
    top_k: int | None = Field(None, gt=0)
    system_prompt: str | None = None
    timeout_ms: int = Field(120000, ge=1000, le=600000, description="Task timeout")
    budget_limit: float | None = Field(None, ge=0.0, description="Max cost in USD")
```

**Validation Rules**:
- Enforced automatically by Pydantic field validators
- Custom validator can check `provider` exists in registry
- `task` must be non-empty string
- Numeric ranges enforced by `ge`/`le`/`gt` constraints

**State**: Immutable request object.

---

### Task Execution

The runtime state of a subagent performing a task.

```python
from enum import Enum
from datetime import datetime
from uuid import UUID, uuid4

class TaskStatus(str, Enum):
    """Possible states for task execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    BUDGET_EXCEEDED = "budget_exceeded"

class TaskExecution(BaseModel):
    """Runtime state of a subagent task"""
    id: UUID = Field(default_factory=uuid4)
    request: SpawnRequest
    status: TaskStatus = TaskStatus.PENDING
    start_time: datetime | None = None
    end_time: datetime | None = None
    provider_name: str
    messages: list[dict] = Field(default_factory=list)
    tool_calls: list[str] = Field(default_factory=list)
    token_usage: "TokenUsage" = Field(default_factory=lambda: TokenUsage())
    estimated_cost: float = 0.0

    model_config = {"arbitrary_types_allowed": True}
```

**State Transitions**:
- `pending` → `running` (execution starts)
- `running` → `completed` (task finishes successfully)
- `running` → `failed` (provider error or task failure)
- `running` → `timeout` (timeout exceeded)
- `running` → `budget_exceeded` (cost limit reached)

**Validation Rules**:
- State transitions validated in task executor logic
- `end_time` must be after `start_time` if both present

---

### Task Result

The outcome of a completed subagent task returned to the host agent.

```python
class LLMError(BaseModel):
    """Normalized error representation"""
    code: str = Field(..., description="Error code/type")
    message: str = Field(..., min_length=1, description="Error description")

class TokenUsage(BaseModel):
    """Token consumption metrics"""
    input: int = Field(0, ge=0, description="Input/prompt tokens")
    output: int = Field(0, ge=0, description="Output/completion tokens")
    total: int = Field(0, ge=0, description="Total tokens")

    def model_post_init(self, __context):
        """Ensure total equals input + output"""
        self.total = self.input + self.output

class TaskResult(BaseModel):
    """Outcome of a completed subagent task"""
    success: bool
    result: str = Field(..., description="Output from the subagent")
    provider_used: str
    model_used: str
    tokens_used: TokenUsage
    cost: float = Field(..., ge=0.0, description="Estimated cost in USD")
    duration_ms: int = Field(..., gt=0, description="Execution time")
    tools_called: list[str] = Field(default_factory=list)
    error: LLMError | None = None

    @model_validator(mode='after')
    def check_error_on_failure(self):
        """Ensure error is present if success is False"""
        if not self.success and self.error is None:
            raise ValueError("error must be present when success is False")
        return self
```

**Validation Rules**:
- If `success` is false, `error` must be present (enforced by model validator)
- `tokens_used.total` automatically calculated in `model_post_init`
- `cost` must be non-negative
- `duration_ms` must be positive

---

### Tool Configuration

Definition of tools available to subagents.

```python
from typing import Callable, Any

class ToolConfig(BaseModel):
    """Definition of a tool available to subagents"""
    name: str = Field(..., description="Unique tool identifier")
    description: str = Field(..., description="Human-readable description for LLM")
    input_schema: dict[str, Any] = Field(..., description="JSON Schema for inputs")
    handler: Callable = Field(..., exclude=True)

    model_config = {"arbitrary_types_allowed": True}
```

**Note**: `handler` is excluded from serialization (not part of JSON Schema export).

**Validation Rules**:
- `name` must be unique across all registered tools
- `input_schema` must be valid JSON Schema
- `handler` must be a callable (async function)

**State**: Registered at startup, immutable during execution.

---

## Entity Relationships

```
ProviderConfig (1) ----< (many) SpawnRequest
                                        |
                                        v
                                TaskExecution (1) ----> (1) TaskResult
                                        |
                                        +----< (many) ToolConfig (via tools list)
                                        |
                                        +-----> (1) TokenUsage
                                        |
                                        +----< (optional) LLMError
```

## Configuration File Format

Provider configurations loaded from YAML:

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
    default_model: gpt-4o
    default_temperature: 0.7
    default_max_tokens: 2000

  local:
    type: ollama
    api_base: http://localhost:11434
    default_model: llama3.2:3b
    default_temperature: 0.7
    default_max_tokens: 2000
```

**Python Loading**:

```python
import yaml
from pathlib import Path

def load_provider_configs(path: Path) -> dict[str, ProviderConfig]:
    """Load provider configurations from YAML file"""
    with open(path) as f:
        data = yaml.safe_load(f)

    return {
        name: ProviderConfig(name=name, **config)
        for name, config in data["providers"].items()
    }
```

## Cost Pricing Table

Static configuration for cost estimation:

```python
from typing import TypedDict

class ModelPricing(TypedDict):
    input: float   # Cost per 1K input tokens
    output: float  # Cost per 1K output tokens

PRICING: dict[str, ModelPricing] = {
    "claude-3-haiku-20240307": {"input": 0.00025, "output": 0.00125},
    "claude-3-sonnet-20240229": {"input": 0.003, "output": 0.015},
    "gpt-4o": {"input": 0.0025, "output": 0.01},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gemini-1.5-flash": {"input": 0.000075, "output": 0.0003},
    # Ollama models (local) - no cost
}

def calculate_cost(model: str, tokens: TokenUsage) -> float:
    """Calculate cost for a model and token usage"""
    pricing = PRICING.get(model)
    if not pricing:
        # Ollama or unknown model - assume no cost
        return 0.0

    input_cost = (tokens.input / 1000) * pricing["input"]
    output_cost = (tokens.output / 1000) * pricing["output"]
    return input_cost + output_cost
```

## Example Usage

```python
# Create a spawn request
request = SpawnRequest(
    provider="anthropic",
    task="Summarize this text in 3 bullet points",
    temperature=0.5,
    max_tokens=500
)

# Request is validated automatically
assert request.temperature == 0.5
assert request.timeout_ms == 120000  # default value

# Create task result
result = TaskResult(
    success=True,
    result="• Point 1\n• Point 2\n• Point 3",
    provider_used="anthropic",
    model_used="claude-3-haiku-20240307",
    tokens_used=TokenUsage(input=120, output=85),  # total calculated automatically
    cost=calculate_cost("claude-3-haiku-20240307", TokenUsage(input=120, output=85)),
    duration_ms=1850,
    tools_called=[]
)

# Export to JSON for MCP response
result_json = result.model_dump_json()
```
