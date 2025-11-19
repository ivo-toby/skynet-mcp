"""Unit tests for cost tracking functionality."""

import pytest

from src.config.models import TokenUsage
from src.orchestrator.cost_tracker import PRICING, calculate_cost


class TestCostCalculation:
    """Test cost calculation for various models."""

    def test_calculate_cost_anthropic_haiku(self):
        """Test cost calculation for Claude 3 Haiku."""
        tokens = TokenUsage(input=1000, output=500)
        cost = calculate_cost("claude-3-haiku-20240307", tokens)
        # (1000/1000 * 0.00025) + (500/1000 * 0.00125) = 0.00025 + 0.000625 = 0.000875
        assert cost == pytest.approx(0.000875, abs=1e-6)

    def test_calculate_cost_anthropic_sonnet(self):
        """Test cost calculation for Claude 3 Sonnet."""
        tokens = TokenUsage(input=2000, output=1000)
        cost = calculate_cost("claude-3-sonnet-20240229", tokens)
        # (2000/1000 * 0.003) + (1000/1000 * 0.015) = 0.006 + 0.015 = 0.021
        assert cost == pytest.approx(0.021, abs=1e-6)

    def test_calculate_cost_anthropic_opus(self):
        """Test cost calculation for Claude 3 Opus."""
        tokens = TokenUsage(input=500, output=500)
        cost = calculate_cost("claude-3-opus-20240229", tokens)
        # (500/1000 * 0.015) + (500/1000 * 0.075) = 0.0075 + 0.0375 = 0.045
        assert cost == pytest.approx(0.045, abs=1e-6)

    def test_calculate_cost_claude_35_haiku(self):
        """Test cost calculation for Claude 3.5 Haiku."""
        tokens = TokenUsage(input=1000, output=1000)
        cost = calculate_cost("claude-3-5-haiku-20241022", tokens)
        # (1000/1000 * 0.0008) + (1000/1000 * 0.004) = 0.0008 + 0.004 = 0.0048
        assert cost == pytest.approx(0.0048, abs=1e-6)

    def test_calculate_cost_openai_gpt4o(self):
        """Test cost calculation for GPT-4o."""
        tokens = TokenUsage(input=1000, output=500)
        cost = calculate_cost("gpt-4o", tokens)
        # (1000/1000 * 0.0025) + (500/1000 * 0.01) = 0.0025 + 0.005 = 0.0075
        assert cost == pytest.approx(0.0075, abs=1e-6)

    def test_calculate_cost_openai_gpt4o_mini(self):
        """Test cost calculation for GPT-4o mini."""
        tokens = TokenUsage(input=5000, output=2000)
        cost = calculate_cost("gpt-4o-mini", tokens)
        # (5000/1000 * 0.00015) + (2000/1000 * 0.0006) = 0.00075 + 0.0012 = 0.00195
        assert cost == pytest.approx(0.00195, abs=1e-6)

    def test_calculate_cost_gemini_flash(self):
        """Test cost calculation for Gemini 1.5 Flash."""
        tokens = TokenUsage(input=10000, output=5000)
        cost = calculate_cost("gemini-1.5-flash", tokens)
        # (10000/1000 * 0.000075) + (5000/1000 * 0.0003) = 0.00075 + 0.0015 = 0.00225
        assert cost == pytest.approx(0.00225, abs=1e-6)

    def test_calculate_cost_gemini_pro(self):
        """Test cost calculation for Gemini 1.5 Pro."""
        tokens = TokenUsage(input=2000, output=1000)
        cost = calculate_cost("gemini-1.5-pro", tokens)
        # (2000/1000 * 0.00125) + (1000/1000 * 0.005) = 0.0025 + 0.005 = 0.0075
        assert cost == pytest.approx(0.0075, abs=1e-6)

    def test_calculate_cost_gemini_2_flash_free(self):
        """Test cost calculation for Gemini 2.0 Flash (free during preview)."""
        tokens = TokenUsage(input=10000, output=10000)
        cost = calculate_cost("gemini-2.0-flash-exp", tokens)
        # Free during preview
        assert cost == 0.0

    def test_calculate_cost_unknown_model(self):
        """Test cost calculation for unknown model returns 0."""
        tokens = TokenUsage(input=1000, output=500)
        cost = calculate_cost("unknown-model-xyz", tokens)
        assert cost == 0.0

    def test_calculate_cost_ollama_model(self):
        """Test cost calculation for Ollama (local) models returns 0."""
        tokens = TokenUsage(input=5000, output=3000)
        cost = calculate_cost("llama3.2:3b", tokens)
        assert cost == 0.0

    def test_calculate_cost_zero_tokens(self):
        """Test cost calculation with zero tokens."""
        tokens = TokenUsage(input=0, output=0)
        cost = calculate_cost("claude-3-haiku-20240307", tokens)
        assert cost == 0.0

    def test_calculate_cost_input_only(self):
        """Test cost calculation with only input tokens."""
        tokens = TokenUsage(input=1000, output=0)
        cost = calculate_cost("claude-3-haiku-20240307", tokens)
        # (1000/1000 * 0.00025) + (0/1000 * 0.00125) = 0.00025
        assert cost == pytest.approx(0.00025, abs=1e-6)

    def test_calculate_cost_output_only(self):
        """Test cost calculation with only output tokens."""
        tokens = TokenUsage(input=0, output=1000)
        cost = calculate_cost("claude-3-haiku-20240307", tokens)
        # (0/1000 * 0.00025) + (1000/1000 * 0.00125) = 0.00125
        assert cost == pytest.approx(0.00125, abs=1e-6)

    def test_calculate_cost_large_usage(self):
        """Test cost calculation with large token usage."""
        tokens = TokenUsage(input=100000, output=50000)
        cost = calculate_cost("gpt-4o", tokens)
        # (100000/1000 * 0.0025) + (50000/1000 * 0.01) = 0.25 + 0.5 = 0.75
        assert cost == pytest.approx(0.75, abs=1e-6)


class TestPricingTable:
    """Test pricing table integrity."""

    def test_pricing_table_exists(self):
        """Test that pricing table is defined."""
        assert PRICING is not None
        assert isinstance(PRICING, dict)

    def test_pricing_table_has_anthropic_models(self):
        """Test that pricing table includes Anthropic models."""
        assert "claude-3-haiku-20240307" in PRICING
        assert "claude-3-sonnet-20240229" in PRICING
        assert "claude-3-opus-20240229" in PRICING
        assert "claude-3-5-haiku-20241022" in PRICING
        assert "claude-3-5-sonnet-20241022" in PRICING

    def test_pricing_table_has_openai_models(self):
        """Test that pricing table includes OpenAI models."""
        assert "gpt-4o" in PRICING
        assert "gpt-4o-mini" in PRICING
        assert "gpt-4-turbo" in PRICING
        assert "gpt-3.5-turbo" in PRICING

    def test_pricing_table_has_gemini_models(self):
        """Test that pricing table includes Gemini models."""
        assert "gemini-1.5-flash" in PRICING
        assert "gemini-1.5-pro" in PRICING
        assert "gemini-2.0-flash-exp" in PRICING

    def test_pricing_entries_have_required_fields(self):
        """Test that all pricing entries have input and output fields."""
        for model, pricing in PRICING.items():
            assert "input" in pricing, f"Model {model} missing 'input' field"
            assert "output" in pricing, f"Model {model} missing 'output' field"
            assert isinstance(pricing["input"], (int, float)), f"Model {model} 'input' not numeric"
            assert isinstance(pricing["output"], (int, float)), f"Model {model} 'output' not numeric"
            assert pricing["input"] >= 0, f"Model {model} 'input' price is negative"
            assert pricing["output"] >= 0, f"Model {model} 'output' price is negative"


class TestTokenUsage:
    """Test TokenUsage model behavior."""

    def test_token_usage_total_calculated(self):
        """Test that total is automatically calculated."""
        tokens = TokenUsage(input=100, output=50)
        assert tokens.total == 150

    def test_token_usage_zero(self):
        """Test TokenUsage with zero values."""
        tokens = TokenUsage(input=0, output=0)
        assert tokens.total == 0

    def test_token_usage_default_values(self):
        """Test TokenUsage with default values."""
        tokens = TokenUsage()
        assert tokens.input == 0
        assert tokens.output == 0
        assert tokens.total == 0
