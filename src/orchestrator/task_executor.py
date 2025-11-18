"""Task execution logic for subagent tasks."""

import asyncio
from datetime import datetime

from src.config.models import LLMError, SpawnRequest, TaskExecution, TaskResult, TaskStatus, TokenUsage
from src.orchestrator.cost_tracker import calculate_cost
from src.providers.base import LLMProvider
from src.types import GenerationParams, Message


async def execute_task(
    request: SpawnRequest, provider: LLMProvider, provider_name: str, model: str
) -> TaskResult:
    """
    Execute a subagent task with the given provider.

    Args:
        request: Spawn request with task details
        provider: LLM provider instance
        provider_name: Name of the provider being used
        model: Model identifier

    Returns:
        TaskResult with execution outcome

    Raises:
        asyncio.TimeoutError: If task exceeds timeout
    """
    # Create task execution tracking
    execution = TaskExecution(request=request, provider_name=provider_name)
    execution.status = TaskStatus.RUNNING
    execution.start_time = datetime.now()

    try:
        # Prepare message with task
        messages: list[Message] = [{"role": "user", "content": request.task}]

        # Prepare generation parameters
        params = GenerationParams(
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            top_p=request.top_p,
            top_k=request.top_k,
            system_prompt=request.system_prompt,
        )

        # Execute with timeout
        timeout_seconds = request.timeout_ms / 1000

        try:
            response = await asyncio.wait_for(
                provider.generate_completion(messages, params), timeout=timeout_seconds
            )
        except asyncio.TimeoutError:
            execution.status = TaskStatus.TIMEOUT
            execution.end_time = datetime.now()
            duration_ms = int(
                (execution.end_time - execution.start_time).total_seconds() * 1000
            )

            return TaskResult(
                success=False,
                result="",
                provider_used=provider_name,
                model_used=model,
                tokens_used=execution.token_usage,
                cost=0.0,
                duration_ms=duration_ms,
                tools_called=[],
                error=LLMError(code="TIMEOUT", message=f"Task exceeded timeout of {request.timeout_ms}ms"),
            )

        # Update token usage
        execution.token_usage = TokenUsage(
            input=response["input_tokens"], output=response["output_tokens"]
        )

        # Calculate cost
        cost = calculate_cost(model, execution.token_usage)
        execution.estimated_cost = cost

        # Check budget limit
        if request.budget_limit is not None and cost > request.budget_limit:
            execution.status = TaskStatus.BUDGET_EXCEEDED
            execution.end_time = datetime.now()
            duration_ms = int(
                (execution.end_time - execution.start_time).total_seconds() * 1000
            )

            return TaskResult(
                success=False,
                result="",
                provider_used=provider_name,
                model_used=model,
                tokens_used=execution.token_usage,
                cost=cost,
                duration_ms=duration_ms,
                tools_called=[],
                error=LLMError(
                    code="BUDGET_EXCEEDED",
                    message=f"Task stopped: cost ${cost:.4f} exceeds budget limit ${request.budget_limit:.4f}",
                ),
            )

        # Success
        execution.status = TaskStatus.COMPLETED
        execution.end_time = datetime.now()
        duration_ms = int(
            (execution.end_time - execution.start_time).total_seconds() * 1000
        )

        return TaskResult(
            success=True,
            result=response["content"],
            provider_used=provider_name,
            model_used=model,
            tokens_used=execution.token_usage,
            cost=cost,
            duration_ms=duration_ms,
            tools_called=execution.tool_calls,
        )

    except Exception as e:
        # Handle provider errors
        execution.status = TaskStatus.FAILED
        execution.end_time = datetime.now()
        duration_ms = int(
            (execution.end_time - execution.start_time).total_seconds() * 1000
        )

        return TaskResult(
            success=False,
            result="",
            provider_used=provider_name,
            model_used=model,
            tokens_used=execution.token_usage,
            cost=execution.estimated_cost,
            duration_ms=duration_ms,
            tools_called=[],
            error=LLMError(code="PROVIDER_ERROR", message=str(e)),
        )
