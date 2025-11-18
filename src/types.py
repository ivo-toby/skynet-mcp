"""Shared type definitions and aliases."""

from typing import Any, TypedDict


class Message(TypedDict, total=False):
    """Message in conversation history."""

    role: str  # "user" | "assistant" | "system"
    content: str | list[dict]  # Can be string or list of content blocks (for tool results)
    tool_calls: list[dict]  # For assistant messages with tool calls
    tool_call_id: str  # For tool result messages


class GenerationParams(TypedDict, total=False):
    """Parameters for LLM generation."""

    temperature: float | None
    max_tokens: int | None
    top_p: float | None
    top_k: int | None
    system_prompt: str | None
    tools: list[dict] | None  # Tool definitions in OpenAI/Anthropic format


class ToolCall(TypedDict):
    """A tool call made by the LLM."""

    id: str
    name: str
    input: dict[str, Any]


class CompletionResponse(TypedDict):
    """Response from LLM completion."""

    content: str
    stop_reason: str | None
    input_tokens: int
    output_tokens: int
    tool_calls: list[ToolCall]  # Tools that the LLM wants to call
