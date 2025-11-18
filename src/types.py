"""Shared type definitions and aliases."""

from typing import TypedDict


class Message(TypedDict, total=False):
    """Message in conversation history."""

    role: str  # "user" | "assistant" | "system"
    content: str


class GenerationParams(TypedDict, total=False):
    """Parameters for LLM generation."""

    temperature: float | None
    max_tokens: int | None
    top_p: float | None
    top_k: int | None
    system_prompt: str | None


class CompletionResponse(TypedDict):
    """Response from LLM completion."""

    content: str
    stop_reason: str | None
    input_tokens: int
    output_tokens: int
