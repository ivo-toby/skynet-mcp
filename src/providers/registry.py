"""Provider registry for instantiating LLM providers."""

from typing import Any

from src.config.models import ProviderConfig


class ProviderRegistry:
    """Factory for creating provider instances."""

    def __init__(self):
        """Initialize empty registry."""
        self._providers: dict[str, type] = {}

    def register(self, provider_type: str, provider_class: type) -> None:
        """
        Register a provider class.

        Args:
            provider_type: Provider type identifier (e.g., "anthropic")
            provider_class: Provider class that implements LLMProvider protocol
        """
        self._providers[provider_type] = provider_class

    def create(self, config: ProviderConfig) -> Any:
        """
        Create a provider instance from configuration.

        Args:
            config: Provider configuration

        Returns:
            Provider instance

        Raises:
            ValueError: If provider type is not registered
        """
        provider_class = self._providers.get(config.type)
        if not provider_class:
            raise ValueError(
                f"Unknown provider type: {config.type}. "
                f"Available types: {', '.join(self._providers.keys())}"
            )

        return provider_class(config)


# Global registry instance
registry = ProviderRegistry()
