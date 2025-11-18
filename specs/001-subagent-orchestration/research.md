# Research: Agent-Agnostic Subagent Orchestration

**Date**: 2025-11-17
**Branch**: 001-subagent-orchestration

## Provider API Abstraction Layer

### Decision: Adapter Pattern for Provider Implementations

**Rationale**: Each LLM provider has unique authentication, request structure, parameter nesting, and response formats. An adapter pattern with a common `LLMProvider` interface allows provider-specific mappers while maintaining core orchestration logic that is provider-agnostic.

**Alternatives Considered**:
- Direct SDK usage (rejected: couples to specific libraries, violates Constitution Principle I)
- Single generic HTTP client (rejected: too low-level, doesn't handle provider-specific quirks)
- LangChain abstraction (rejected: heavy dependency, YAGNI for MVP scope)

## Authentication Patterns

### Decision: Configurable Header Strategy

| Provider | Header Name | Format |
|----------|-------------|--------|
| Anthropic | `x-api-key` | Plain API key |
| OpenAI-compatible | `Authorization` | `Bearer {key}` |
| Google Gemini | `x-goog-api-key` | Plain API key |
| Ollama | None (local) | Optional bearer token |
| Azure OpenAI | `api-key` | Plain API key |

**Rationale**: Different providers require different HTTP headers. Configuration-based approach allows runtime selection without code changes.

## Request/Response Normalization

### Decision: Flat Parameter Interface with Provider-Specific Mappers

Common interface:
```typescript
interface LLMGenerationParams {
  temperature?: number;      // 0.0-2.0 (normalize from Anthropic 0-1)
  maxTokens?: number;        // Required for Anthropic, optional elsewhere
  topP?: number;             // 0.0-1.0
  topK?: number;             // Not supported by OpenAI
  stopSequences?: string[];
}
```

**Rationale**:
- Anthropic: uses `max_tokens` (required), `top_p`, `top_k`
- OpenAI: uses `max_tokens`, `top_p` (no `top_k`)
- Gemini: nests in `generationConfig` as `maxOutputTokens`, `topP`, `topK`
- Ollama: nests in `options` object

Flat structure is developer-friendly; adapters handle provider-specific nesting.

## Token Usage Tracking

### Decision: Extract from Response, No Pre-Request Counting

| Provider | Token Data Location |
|----------|---------------------|
| Anthropic | `usage.input_tokens`, `usage.output_tokens` |
| OpenAI | `usage.prompt_tokens`, `usage.completion_tokens` |
| Gemini | `usageMetadata.promptTokenCount`, `candidatesTokenCount` |
| Ollama | `prompt_eval_count`, `eval_count` |

**Rationale**: All providers return token counts in completion response. Anthropic offers pre-request token counting API (`/messages/count_tokens`), but for MVP simplicity, extract post-completion only. Cost estimation can use token counts with provider-specific pricing tables.

**Alternatives Considered**:
- Pre-request token counting (rejected: adds latency, only Anthropic supports it directly)
- Third-party tokenizer libraries (rejected: YAGNI, response data sufficient)

## Error Handling

### Decision: Normalized Error Interface

```typescript
interface LLMError {
  status: number;        // HTTP status code
  code: string;          // Provider-specific error code
  message: string;       // Human-readable description
  retryable: boolean;    // Whether retry makes sense
}
```

**Rationale**: Provider error formats differ significantly:
- Anthropic: `{"type": "error", "error": {"type": "...", "message": "..."}}`
- OpenAI: `{"error": {"message": "...", "type": "...", "code": "..."}}`
- Gemini: `{"error": {"code": 400, "message": "...", "status": "..."}}`
- Ollama: `{"error": "..."}`

Normalization allows consistent error handling in orchestration layer.

## Cost Calculation

### Decision: Static Pricing Tables with Provider-Specific Rates

**Rationale**: LLM providers publish per-token pricing. Store as configuration:
- Anthropic: Input/output token pricing per model
- OpenAI: Input/output token pricing per model
- Gemini: Input/output token pricing per model
- Ollama: $0.00 (local models, no API cost)

Cost = (input_tokens * input_rate) + (output_tokens * output_rate)

**Accuracy target**: Within 5% of actual billing (rate tables updated periodically).

## Tool Configuration for Subagents

### Decision: Explicit Tool Lists, No Inheritance

**Rationale**: Per Constitution Principle III (Simplicity), MVP uses explicit tool configuration:
```typescript
interface SpawnRequest {
  tools?: string[];  // Explicit list: ["grep", "read_file", "web_fetch"]
}
```

No tool inheritance or capability-based inference for MVP. Host agent explicitly specifies which tools the subagent can access.

**Alternatives Considered**:
- Inherit from parent (rejected: security risk, complex permission model)
- Capability-based mapping (rejected: requires capability taxonomy, YAGNI)

## Timeout and Budget Enforcement

### Decision: Task-Level Constraints with Hard Cutoff

```typescript
interface TaskConstraints {
  timeoutMs: number;      // Default: 120000 (2 minutes)
  budgetLimit?: number;   // In USD, checked before/after each provider call
}
```

**Rationale**: Prevents runaway tasks and cost overruns. Timeout uses Promise.race pattern. Budget tracking accumulates across provider calls and stops if limit exceeded.

## MCP Tool Schema Design

### Decision: Pydantic-Based Schema with JSON Schema Export

**Rationale**: Python MCP SDK supports JSON Schema for tool definitions. Pydantic provides:
- Runtime validation
- Type hints and IDE support
- Automatic JSON Schema generation via `.model_json_schema()`
- Native async support

Satisfies Constitution Principle IV (MCP Protocol Compliance).

## Provider Registry Pattern

### Decision: Factory Pattern with Type Registry

```typescript
const registry = new ProviderRegistry();
registry.register("anthropic", AnthropicProvider);
registry.register("openai", OpenAICompatibleProvider);
registry.register("gemini", GeminiProvider);
registry.register("ollama", OllamaProvider);

// Usage
const provider = registry.create(config);
```

**Rationale**: Satisfies Constitution Principle I (Provider-Agnostic). New providers added by implementing `LLMProvider` interface and registering without modifying core code.

## Python-Specific Implementation Details

### Provider SDKs

```python
# Required packages
anthropic==0.39.0          # Official Anthropic SDK
openai==1.54.0             # OpenAI SDK (works with Azure, custom endpoints)
google-generativeai==0.8.3 # Google Gemini SDK
ollama==0.4.0              # Ollama Python SDK
mcp==1.1.2                 # Official MCP SDK
pydantic==2.10.0           # Validation and schemas
httpx==0.28.0              # Async HTTP client (already used by most SDKs)
```

### Async Architecture

All provider APIs support async/await:
- Anthropic: `async with AsyncAnthropic() as client: await client.messages.create(...)`
- OpenAI: `async with AsyncOpenAI() as client: await client.chat.completions.create(...)`
- Gemini: `await model.generate_content_async(...)`
- Ollama: `await ollama.chat(...)`

Use `asyncio.timeout()` for task timeouts, `asyncio.gather()` for potential future parallel execution.

### Protocol/ABC Pattern

```python
from typing import Protocol
from abc import ABC, abstractmethod

class LLMProvider(Protocol):
    async def generate_completion(
        self, messages: list[dict], params: GenerationParams
    ) -> CompletionResponse: ...
```

Use Protocol for static typing, ABC for runtime enforcement if needed.

## Summary of Key Technical Decisions

1. **Adapter pattern** for provider abstraction (4 implementations)
2. **Environment variables** for credentials (secure, standard practice)
3. **Flat parameter interface** with provider-specific mappers
4. **Post-completion token extraction** (no pre-request counting for MVP)
5. **Normalized error interface** across all providers
6. **Static pricing tables** for cost estimation
7. **Explicit tool lists** (no inheritance for MVP)
8. **Task-level timeouts and budgets** with hard enforcement via `asyncio.timeout()`
9. **Pydantic models** for MCP tool validation and JSON Schema generation
10. **Factory registry** for provider instantiation
11. **Native async/await** throughout (Python 3.11+ asyncio)
