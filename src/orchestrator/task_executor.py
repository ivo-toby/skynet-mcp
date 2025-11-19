"""Task execution logic for subagent tasks."""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, TypedDict

from src.config.models import LLMError, SpawnRequest, TaskExecution, TaskResult, TaskStatus, TokenUsage
from src.orchestrator.cost_tracker import calculate_cost
from src.orchestrator.tool_definitions import execute_tool, get_tools_for_request
from src.providers.base import LLMProvider
from src.types import GenerationParams, Message, ToolCall

logger = logging.getLogger(__name__)


class ToolResultDict(TypedDict):
    """Internal type for tool execution results."""

    tool_call_id: str
    tool_name: str
    result: str


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

        # Add tools if requested
        if request.tools:
            try:
                tools = get_tools_for_request(request.tools)
                params["tools"] = tools
            except ValueError as e:
                # Invalid tool requested
                return TaskResult(
                    success=False,
                    result="",
                    provider_used=provider_name,
                    model_used=model,
                    tokens_used=TokenUsage(),
                    cost=0.0,
                    duration_ms=0,
                    tools_called=[],
                    error=LLMError(code="INVALID_TOOL", message=str(e)),
                )

        # Execute with timeout
        timeout_seconds = request.timeout_ms / 1000

        # Tool calling loop - max 10 iterations to prevent infinite loops
        max_iterations = 10
        final_content = ""

        for iteration in range(max_iterations):
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

            # Update token usage (create new TokenUsage to recalculate total)
            execution.token_usage = TokenUsage(
                input=execution.token_usage.input + response["input_tokens"],
                output=execution.token_usage.output + response["output_tokens"],
            )

            # Calculate cost
            cost = calculate_cost(model, execution.token_usage)
            execution.estimated_cost = cost

            # Log cost estimation
            logger.info(
                f"Iteration {iteration + 1} cost: ${cost:.4f} | Tokens: {response['input_tokens']} in / "
                f"{response['output_tokens']} out | Model: {model}"
            )

            # Check budget limit
            if request.budget_limit is not None and cost > request.budget_limit:
                execution.status = TaskStatus.BUDGET_EXCEEDED
                execution.end_time = datetime.now()
                duration_ms = int(
                    (execution.end_time - execution.start_time).total_seconds() * 1000
                )

                logger.warning(
                    f"Budget exceeded! Cost ${cost:.4f} > limit ${request.budget_limit:.4f}"
                )

                return TaskResult(
                    success=False,
                    result="",
                    provider_used=provider_name,
                    model_used=model,
                    tokens_used=execution.token_usage,
                    cost=cost,
                    duration_ms=duration_ms,
                    tools_called=execution.tool_calls,
                    error=LLMError(
                        code="BUDGET_EXCEEDED",
                        message=f"Task stopped: cost ${cost:.4f} exceeds budget limit ${request.budget_limit:.4f}",
                    ),
                )

            # Store content
            if response["content"]:
                final_content = response["content"]

            # Check if LLM wants to call tools
            if response.get("tool_calls"):
                logger.info(f"LLM requested {len(response['tool_calls'])} tool calls")

                # Execute each tool
                tool_results: list[ToolResultDict] = []
                for tool_call in response["tool_calls"]:
                    tool_name = tool_call["name"]
                    tool_input = tool_call["input"]

                    # Track which tools were called
                    if tool_name not in execution.tool_calls:
                        execution.tool_calls.append(tool_name)

                    # Execute the tool
                    logger.info(f"Executing tool: {tool_name}")
                    try:
                        tool_result = await execute_tool(tool_name, tool_input)
                    except Exception as e:
                        logger.error(f"Tool execution failed: {e}")
                        tool_result = json.dumps({"error": f"Tool execution failed: {str(e)}"})

                    tool_results.append(
                        ToolResultDict(
                            tool_call_id=tool_call["id"],
                            tool_name=tool_name,
                            result=tool_result,
                        )
                    )

                # Add assistant message with tool calls to conversation
                assistant_msg: Message = {
                    "role": "assistant",
                    "content": response["content"] or "",
                    "tool_calls": response["tool_calls"],
                }
                messages.append(assistant_msg)

                # Add tool results to conversation
                for tool_result_item in tool_results:
                    tool_msg: Message = {
                        "role": "tool",
                        "tool_call_id": tool_result_item["tool_call_id"],
                        "content": tool_result_item["result"],
                    }
                    messages.append(tool_msg)

                # Continue loop to get next response with tool results
                continue

            # No tool calls - task is complete
            break

        # Success
        execution.status = TaskStatus.COMPLETED
        execution.end_time = datetime.now()
        duration_ms = int(
            (execution.end_time - execution.start_time).total_seconds() * 1000
        )

        logger.info(
            f"Task completed successfully in {duration_ms}ms | "
            f"Total cost: ${cost:.4f} | Tools called: {execution.tool_calls}"
        )

        return TaskResult(
            success=True,
            result=final_content,
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
