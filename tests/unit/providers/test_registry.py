"""Unit tests for provider registry."""

import pytest

from src.config.models import ProviderConfig
from src.providers.registry import ProviderRegistry


class MockProvider:
    """Mock provider for testing."""

    def __init__(self, config: ProviderConfig):
        """Initialize mock provider."""
        self.config = config

    async def generate_completion(self, messages, params):
        """Mock generate_completion method."""
        return {
            "content": "Mock response",
            "stop_reason": "end_turn",
            "input_tokens": 10,
            "output_tokens": 20,
        }


class AnotherMockProvider:
    """Another mock provider for testing."""

    def __init__(self, config: ProviderConfig):
        """Initialize mock provider."""
        self.config = config


class TestProviderRegistry:
    """Test provider registry functionality."""

    def test_registry_initialization(self):
        """Test that registry initializes empty."""
        registry = ProviderRegistry()
        assert registry._providers == {}

    def test_register_provider(self):
        """Test registering a provider."""
        registry = ProviderRegistry()
        registry.register("mock", MockProvider)

        assert "mock" in registry._providers
        assert registry._providers["mock"] == MockProvider

    def test_register_multiple_providers(self):
        """Test registering multiple providers."""
        registry = ProviderRegistry()
        registry.register("mock1", MockProvider)
        registry.register("mock2", AnotherMockProvider)

        assert len(registry._providers) == 2
        assert registry._providers["mock1"] == MockProvider
        assert registry._providers["mock2"] == AnotherMockProvider

    def test_register_overwrite_provider(self):
        """Test that registering same type overwrites previous."""
        registry = ProviderRegistry()
        registry.register("mock", MockProvider)
        registry.register("mock", AnotherMockProvider)

        assert registry._providers["mock"] == AnotherMockProvider

    def test_create_provider_success(self):
        """Test creating a provider instance."""
        registry = ProviderRegistry()
        registry.register("ollama", MockProvider)  # Use valid type

        config = ProviderConfig(
            name="test",
            type="ollama",  # Use valid type
            api_key_env_var="",
            default_model="test-model",
        )

        provider = registry.create(config)

        assert isinstance(provider, MockProvider)
        assert provider.config == config

    def test_create_provider_unknown_type(self):
        """Test creating provider with unregistered type raises error."""
        registry = ProviderRegistry()
        # Don't register any providers

        config = ProviderConfig(
            name="test",
            type="ollama",  # Valid type but not registered
            api_key_env_var="",
            default_model="test-model",
        )

        with pytest.raises(ValueError) as exc_info:
            registry.create(config)

        assert "Unknown provider type: ollama" in str(exc_info.value)
        assert "Available types:" in str(exc_info.value)

    def test_create_provider_error_message_lists_available(self):
        """Test that error message lists available provider types."""
        registry = ProviderRegistry()
        registry.register("anthropic", MockProvider)
        registry.register("gemini", AnotherMockProvider)

        config = ProviderConfig(
            name="test",
            type="ollama",  # Valid type but not registered
            api_key_env_var="",
            default_model="test-model",
        )

        with pytest.raises(ValueError) as exc_info:
            registry.create(config)

        error_message = str(exc_info.value)
        assert "anthropic" in error_message
        assert "gemini" in error_message

    def test_create_multiple_instances(self):
        """Test creating multiple instances from same provider class."""
        registry = ProviderRegistry()
        registry.register("ollama", MockProvider)

        config1 = ProviderConfig(
            name="test1",
            type="ollama",
            api_key_env_var="",
            default_model="model1",
        )

        config2 = ProviderConfig(
            name="test2",
            type="ollama",
            api_key_env_var="",
            default_model="model2",
        )

        provider1 = registry.create(config1)
        provider2 = registry.create(config2)

        assert isinstance(provider1, MockProvider)
        assert isinstance(provider2, MockProvider)
        assert provider1.config.name == "test1"
        assert provider2.config.name == "test2"
        assert provider1 is not provider2  # Different instances


class TestGlobalRegistry:
    """Test the global registry instance."""

    def test_global_registry_exists(self):
        """Test that global registry instance exists."""
        from src.providers.registry import registry

        assert registry is not None
        assert isinstance(registry, ProviderRegistry)

    def test_global_registry_is_singleton(self):
        """Test that importing registry multiple times returns same instance."""
        from src.providers.registry import registry as registry1
        from src.providers.registry import registry as registry2

        assert registry1 is registry2


class TestRegistryWithRealProviders:
    """Test registry with real provider types."""

    def test_register_anthropic_provider_type(self):
        """Test registering anthropic provider type."""
        from src.providers.anthropic import AnthropicProvider

        registry = ProviderRegistry()
        registry.register("anthropic", AnthropicProvider)

        assert "anthropic" in registry._providers
        assert registry._providers["anthropic"] == AnthropicProvider

    def test_register_all_provider_types(self):
        """Test registering all four provider types."""
        from src.providers.anthropic import AnthropicProvider
        from src.providers.gemini import GeminiProvider
        from src.providers.ollama import OllamaProvider
        from src.providers.openai_compatible import OpenAICompatibleProvider

        registry = ProviderRegistry()
        registry.register("anthropic", AnthropicProvider)
        registry.register("openai_compatible", OpenAICompatibleProvider)
        registry.register("gemini", GeminiProvider)
        registry.register("ollama", OllamaProvider)

        assert len(registry._providers) == 4
        assert "anthropic" in registry._providers
        assert "openai_compatible" in registry._providers
        assert "gemini" in registry._providers
        assert "ollama" in registry._providers
