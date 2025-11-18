"""MCP tool for spawning subagents."""

from src.config.models import LLMError, SpawnRequest, TaskResult, TokenUsage
from src.config.providers import load_provider_configs
from src.orchestrator.task_executor import execute_task
from src.providers.registry import registry


async def spawn_agent(request: SpawnRequest, config_path: str = "config/providers.yaml") -> TaskResult:
    """
    Spawn a subagent to perform a task.

    Args:
        request: Spawn request with task details
        config_path: Path to provider configuration file

    Returns:
        TaskResult with execution outcome
    """
    try:
        # Load provider configurations
        provider_configs = load_provider_configs(config_path)

        # Validate provider exists
        if request.provider not in provider_configs:
            return TaskResult(
                success=False,
                result="",
                provider_used=request.provider,
                model_used="",
                tokens_used=TokenUsage(),
                cost=0.0,
                duration_ms=0,
                tools_called=[],
                error=LLMError(
                    code="PROVIDER_NOT_FOUND",
                    message=f"Provider '{request.provider}' not configured. "
                    f"Available providers: {', '.join(provider_configs.keys())}",
                ),
            )

        # Get provider config
        provider_config = provider_configs[request.provider]

        # Create provider instance
        provider = registry.create(provider_config)

        # Determine model to use
        model = request.model or provider_config.default_model

        # Execute task
        result = await execute_task(request, provider, request.provider, model)

        return result

    except Exception as e:
        # Handle unexpected errors
        return TaskResult(
            success=False,
            result="",
            provider_used=request.provider if request else "",
            model_used="",
            tokens_used=TokenUsage(),
            cost=0.0,
            duration_ms=0,
            tools_called=[],
            error=LLMError(code="INTERNAL_ERROR", message=str(e)),
        )
