"""Pydantic models for configuration and request/response validation."""

from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, model_validator


class ProviderConfig(BaseModel):
    """Configuration for an LLM provider."""

    name: str = Field(..., description="Unique identifier for the provider")
    type: Literal["anthropic", "openai_compatible", "gemini", "ollama"]
    api_base: str | None = Field(None, description="Base URL for API requests")
    api_key_env_var: str = Field("", description="Environment variable name for API key (not needed for Ollama)")
    default_model: str = Field(..., description="Model to use when not specified")
    default_temperature: float = Field(0.7, ge=0.0, le=2.0)
    default_max_tokens: int = Field(1000, gt=0)


class SpawnRequest(BaseModel):
    """Request to spawn a subagent for a task."""

    provider: str = Field(..., description="Name of the configured provider to use")
    task: str = Field(..., min_length=1, description="What the subagent should do")
    tools: list[str] = Field(
        default_factory=list, description="List of tool names available to the subagent"
    )
    model: str | None = Field(None, description="Override provider's default model")
    temperature: float | None = Field(None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(None, gt=0)
    top_p: float | None = Field(None, ge=0.0, le=1.0)
    top_k: int | None = Field(None, gt=0)
    system_prompt: str | None = None
    timeout_ms: int = Field(120000, ge=1000, le=600000, description="Task timeout")
    budget_limit: float | None = Field(None, ge=0.0, description="Max cost in USD")


class TokenUsage(BaseModel):
    """Token consumption metrics."""

    input: int = Field(0, ge=0, description="Input/prompt tokens")
    output: int = Field(0, ge=0, description="Output/completion tokens")
    total: int = Field(0, ge=0, description="Total tokens")

    def model_post_init(self, __context):
        """Ensure total equals input + output."""
        self.total = self.input + self.output


class LLMError(BaseModel):
    """Normalized error representation."""

    code: str = Field(..., description="Error code/type")
    message: str = Field(..., min_length=1, description="Error description")


class TaskStatus(str, Enum):
    """Possible states for task execution."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    BUDGET_EXCEEDED = "budget_exceeded"


class TaskExecution(BaseModel):
    """Runtime state of a subagent task."""

    id: UUID = Field(default_factory=uuid4)
    request: SpawnRequest
    status: TaskStatus = TaskStatus.PENDING
    start_time: datetime | None = None
    end_time: datetime | None = None
    provider_name: str
    messages: list[dict] = Field(default_factory=list)
    tool_calls: list[str] = Field(default_factory=list)
    token_usage: TokenUsage = Field(default_factory=lambda: TokenUsage())
    estimated_cost: float = 0.0

    model_config = {"arbitrary_types_allowed": True}


class TaskResult(BaseModel):
    """Outcome of a completed subagent task."""

    success: bool
    result: str = Field(..., description="Output from the subagent")
    provider_used: str
    model_used: str
    tokens_used: TokenUsage
    cost: float = Field(..., ge=0.0, description="Estimated cost in USD")
    duration_ms: int = Field(..., gt=0, description="Execution time")
    tools_called: list[str] = Field(default_factory=list)
    error: LLMError | None = None

    @model_validator(mode="after")
    def check_error_on_failure(self):
        """Ensure error is present if success is False."""
        if not self.success and self.error is None:
            raise ValueError("error must be present when success is False")
        return self
