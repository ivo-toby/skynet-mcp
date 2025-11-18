"""Provider configuration loading from YAML."""

import os
from pathlib import Path

import yaml

from src.config.models import ProviderConfig


def load_provider_configs(path: Path | str) -> dict[str, ProviderConfig]:
    """
    Load provider configurations from YAML file.

    Args:
        path: Path to providers.yaml file

    Returns:
        Dictionary mapping provider name to ProviderConfig

    Raises:
        FileNotFoundError: If config file doesn't exist
        ValueError: If config is invalid or required env vars missing
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Provider config not found: {path}")

    with open(path) as f:
        data = yaml.safe_load(f)

    if not data or "providers" not in data:
        raise ValueError(f"Invalid provider config: missing 'providers' key in {path}")

    configs = {}
    for name, config_data in data["providers"].items():
        config = ProviderConfig(name=name, **config_data)

        # Verify API key environment variable exists (if specified)
        if config.api_key_env_var and config.api_key_env_var not in os.environ:
            # Don't fail on missing key for Ollama (local, no key needed)
            if config.type != "ollama":
                raise ValueError(
                    f"Environment variable {config.api_key_env_var} "
                    f"not found for provider '{name}'"
                )

        configs[name] = config

    return configs
