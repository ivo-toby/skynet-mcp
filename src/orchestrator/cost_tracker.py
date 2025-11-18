"""Cost tracking and calculation for LLM usage."""

from typing import TypedDict

from src.config.models import TokenUsage


class ModelPricing(TypedDict):
    """Pricing per 1K tokens."""

    input: float  # Cost per 1K input tokens
    output: float  # Cost per 1K output tokens


# Pricing table (last verified as of January 2025, AI knowledge cutoff)
# Prices are per 1K tokens (divide advertised per-1M rates by 1000)
# NOTE: Pricing may be outdated. Always check provider websites for the most current rates.
PRICING: dict[str, ModelPricing] = {
    # Anthropic Claude 3.5 (latest generation)
    "claude-3-5-haiku-20241022": {"input": 0.0008, "output": 0.004},
    "claude-3-5-sonnet-20241022": {"input": 0.003, "output": 0.015},
    # Anthropic Claude 3 (previous generation)
    "claude-3-haiku-20240307": {"input": 0.00025, "output": 0.00125},
    "claude-3-sonnet-20240229": {"input": 0.003, "output": 0.015},
    "claude-3-opus-20240229": {"input": 0.015, "output": 0.075},
    # OpenAI
    "gpt-4o": {"input": 0.0025, "output": 0.01},
    "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
    "gpt-4-turbo": {"input": 0.01, "output": 0.03},
    "gpt-4-turbo-preview": {"input": 0.01, "output": 0.03},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    # Google Gemini 1.5
    "gemini-1.5-flash": {"input": 0.000075, "output": 0.0003},
    "gemini-1.5-flash-001": {"input": 0.000075, "output": 0.0003},
    "gemini-1.5-flash-002": {"input": 0.000075, "output": 0.0003},
    "gemini-1.5-pro": {"input": 0.00125, "output": 0.005},
    "gemini-1.5-pro-001": {"input": 0.00125, "output": 0.005},
    "gemini-1.5-pro-002": {"input": 0.00125, "output": 0.005},
    # Gemini 2.0 (experimental)
    "gemini-2.0-flash-exp": {"input": 0.0, "output": 0.0},  # Free during preview
    # Ollama (local models - no cost)
    # All ollama models return 0 cost by returning None from this dict
}


def calculate_cost(model: str, tokens: TokenUsage) -> float:
    """
    Calculate cost for a model and token usage.

    Args:
        model: Model identifier
        tokens: Token usage metrics

    Returns:
        Estimated cost in USD
    """
    # Check if it's an Ollama model (starts with model name without provider prefix)
    # Or if pricing not found - assume no cost
    pricing = PRICING.get(model)
    if not pricing:
        # Ollama or unknown model - assume no cost
        return 0.0

    input_cost = (tokens.input / 1000) * pricing["input"]
    output_cost = (tokens.output / 1000) * pricing["output"]
    return input_cost + output_cost
