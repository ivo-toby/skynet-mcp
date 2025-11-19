"""Unit tests for provider configuration loading."""

import os
import tempfile
from pathlib import Path

import pytest

from src.config.models import ProviderConfig
from src.config.providers import load_provider_configs


class TestLoadProviderConfigs:
    """Test loading provider configurations from YAML."""

    def test_load_valid_config(self, tmp_path):
        """Test loading a valid configuration file."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  anthropic:
    type: anthropic
    api_key_env_var: ANTHROPIC_API_KEY
    default_model: claude-3-haiku-20240307
    default_temperature: 0.7
    default_max_tokens: 1000
""")

        # Set the environment variable
        os.environ["ANTHROPIC_API_KEY"] = "test-key"

        try:
            configs = load_provider_configs(config_file)

            assert len(configs) == 1
            assert "anthropic" in configs

            config = configs["anthropic"]
            assert config.name == "anthropic"
            assert config.type == "anthropic"
            assert config.api_key_env_var == "ANTHROPIC_API_KEY"
            assert config.default_model == "claude-3-haiku-20240307"
            assert config.default_temperature == 0.7
            assert config.default_max_tokens == 1000
        finally:
            del os.environ["ANTHROPIC_API_KEY"]

    def test_load_multiple_providers(self, tmp_path):
        """Test loading multiple provider configurations."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  anthropic:
    type: anthropic
    api_key_env_var: ANTHROPIC_API_KEY
    default_model: claude-3-haiku-20240307
    default_temperature: 0.7
    default_max_tokens: 1000

  openai:
    type: openai_compatible
    api_key_env_var: OPENAI_API_KEY
    api_base: https://api.openai.com/v1
    default_model: gpt-4o-mini
    default_temperature: 0.7
    default_max_tokens: 2000
""")

        os.environ["ANTHROPIC_API_KEY"] = "test-key-1"
        os.environ["OPENAI_API_KEY"] = "test-key-2"

        try:
            configs = load_provider_configs(config_file)

            assert len(configs) == 2
            assert "anthropic" in configs
            assert "openai" in configs

            assert configs["anthropic"].type == "anthropic"
            assert configs["openai"].type == "openai_compatible"
            assert configs["openai"].api_base == "https://api.openai.com/v1"
        finally:
            del os.environ["ANTHROPIC_API_KEY"]
            del os.environ["OPENAI_API_KEY"]

    def test_load_ollama_without_api_key(self, tmp_path):
        """Test loading Ollama config which doesn't require API key."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  local:
    type: ollama
    api_base: http://localhost:11434
    api_key_env_var: ""
    default_model: llama3.2:3b
    default_temperature: 0.7
    default_max_tokens: 2000
""")

        configs = load_provider_configs(config_file)

        assert len(configs) == 1
        assert "local" in configs
        assert configs["local"].type == "ollama"
        assert configs["local"].api_base == "http://localhost:11434"

    def test_missing_file_raises_error(self):
        """Test that missing config file raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError) as exc_info:
            load_provider_configs("/nonexistent/path/providers.yaml")

        assert "Provider config not found" in str(exc_info.value)

    def test_missing_providers_key(self, tmp_path):
        """Test that config without 'providers' key raises error."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
something_else:
  foo: bar
""")

        with pytest.raises(ValueError) as exc_info:
            load_provider_configs(config_file)

        assert "missing 'providers' key" in str(exc_info.value)

    def test_empty_config(self, tmp_path):
        """Test that empty config file raises error."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("")

        with pytest.raises(ValueError) as exc_info:
            load_provider_configs(config_file)

        assert "missing 'providers' key" in str(exc_info.value)

    def test_missing_api_key_env_var(self, tmp_path):
        """Test that missing API key environment variable raises error."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  anthropic:
    type: anthropic
    api_key_env_var: MISSING_API_KEY
    default_model: claude-3-haiku-20240307
    default_temperature: 0.7
    default_max_tokens: 1000
""")

        # Make sure the key doesn't exist
        if "MISSING_API_KEY" in os.environ:
            del os.environ["MISSING_API_KEY"]

        with pytest.raises(ValueError) as exc_info:
            load_provider_configs(config_file)

        assert "Environment variable MISSING_API_KEY" in str(exc_info.value)
        assert "not found" in str(exc_info.value)

    def test_invalid_provider_type(self, tmp_path):
        """Test that invalid provider type raises error."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  invalid:
    type: invalid_type
    api_key_env_var: TEST_KEY
    default_model: test-model
    default_temperature: 0.7
    default_max_tokens: 1000
""")

        os.environ["TEST_KEY"] = "test-value"

        try:
            with pytest.raises(ValueError) as exc_info:
                load_provider_configs(config_file)

            assert "unsupported type 'invalid_type'" in str(exc_info.value)
            assert "Supported types:" in str(exc_info.value)
        finally:
            del os.environ["TEST_KEY"]

    def test_missing_provider_type(self, tmp_path):
        """Test that missing provider type raises error."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  test:
    api_key_env_var: TEST_KEY
    default_model: test-model
    default_temperature: 0.7
    default_max_tokens: 1000
""")

        os.environ["TEST_KEY"] = "test-value"

        try:
            with pytest.raises(ValueError) as exc_info:
                load_provider_configs(config_file)

            assert "missing required 'type' field" in str(exc_info.value)
        finally:
            del os.environ["TEST_KEY"]

    def test_provider_type_validation_lists_supported(self, tmp_path):
        """Test that validation error lists all supported types."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  test:
    type: unsupported
    api_key_env_var: TEST_KEY
    default_model: test-model
""")

        os.environ["TEST_KEY"] = "test-value"

        try:
            with pytest.raises(ValueError) as exc_info:
                load_provider_configs(config_file)

            error_msg = str(exc_info.value)
            assert "anthropic" in error_msg
            assert "openai_compatible" in error_msg
            assert "gemini" in error_msg
            assert "ollama" in error_msg
        finally:
            del os.environ["TEST_KEY"]

    def test_load_with_all_optional_fields(self, tmp_path):
        """Test loading config with all optional fields specified."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  openai:
    type: openai_compatible
    api_key_env_var: OPENAI_API_KEY
    api_base: https://custom-endpoint.com/v1
    default_model: gpt-4o
    default_temperature: 0.5
    default_max_tokens: 4000
""")

        os.environ["OPENAI_API_KEY"] = "test-key"

        try:
            configs = load_provider_configs(config_file)

            config = configs["openai"]
            assert config.api_base == "https://custom-endpoint.com/v1"
            assert config.default_temperature == 0.5
            assert config.default_max_tokens == 4000
        finally:
            del os.environ["OPENAI_API_KEY"]

    def test_load_config_returns_dict(self, tmp_path):
        """Test that load_provider_configs returns a dictionary."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  test:
    type: ollama
    api_key_env_var: ""
    default_model: test-model
""")

        configs = load_provider_configs(config_file)

        assert isinstance(configs, dict)
        assert all(isinstance(k, str) for k in configs.keys())
        assert all(isinstance(v, ProviderConfig) for v in configs.values())

    def test_load_config_with_pathlib_path(self, tmp_path):
        """Test loading config using pathlib.Path object."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  test:
    type: ollama
    api_key_env_var: ""
    default_model: test-model
""")

        # Pass as Path object
        configs = load_provider_configs(Path(config_file))

        assert len(configs) == 1

    def test_load_config_with_string_path(self, tmp_path):
        """Test loading config using string path."""
        config_file = tmp_path / "providers.yaml"
        config_file.write_text("""
providers:
  test:
    type: ollama
    api_key_env_var: ""
    default_model: test-model
""")

        # Pass as string
        configs = load_provider_configs(str(config_file))

        assert len(configs) == 1
