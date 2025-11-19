# Implementation Plan: Agent-Agnostic Subagent Orchestration

**Branch**: `001-subagent-orchestration` | **Date**: 2025-11-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-subagent-orchestration/spec.md`

## Summary

Implement an MCP server that enables any MCP-compatible host agent to spawn AI subagents across multiple LLM providers (Anthropic, OpenAI-compatible, Gemini, Ollama). The system provides a `spawn_agent` tool that accepts provider selection, task description, tool configuration, and constraints, returning results with token usage and cost tracking. This preserves host agent context while enabling task delegation and cost optimization through model routing.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: mcp (official SDK), pydantic (validation), asyncio
**Storage**: N/A (stateless request/response for MVP)
**Testing**: pytest, pytest-asyncio
**Target Platform**: Python 3.11+ (cross-platform CLI/server)
**Project Type**: Single project (MCP server)
**Performance Goals**: Task completion within 2 minutes, 95% success rate
**Constraints**: Environment variable credentials only, task timeout enforcement
**Scale/Scope**: Single-level spawning, 4 provider types, explicit tool configuration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Provider-Agnostic Architecture
- [x] **PASS**: Design uses pluggable provider interface with 4 implementations
- [x] **PASS**: No hardcoded provider logic in core orchestration
- [x] **PASS**: Environment variable pattern for credentials (`${PROVIDER_API_KEY}`)

### II. Test-Driven Development
- [x] **PASS**: Contract tests required for MCP tool interfaces
- [x] **PASS**: Integration tests for provider communication patterns
- [x] **PASS**: Mock providers for unit tests (no external API calls in tests)

### III. Simplicity & YAGNI
- [x] **PASS**: MVP scope (single-level, explicit config, request/response only)
- [x] **PASS**: No inheritance patterns (explicit tool lists)
- [x] **PASS**: Sensible defaults (provider default model when not specified)

### IV. MCP Protocol Compliance
- [x] **PASS**: Tool schemas use valid JSON Schema (via pydantic)
- [x] **PASS**: Standard content block responses
- [x] **PASS**: Support STDIO and SSE transports

## Project Structure

### Documentation (this feature)

```text
specs/001-subagent-orchestration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── providers/
│   ├── base.py              # LLMProvider protocol/ABC
│   ├── anthropic.py         # Anthropic implementation
│   ├── openai_compatible.py # OpenAI-compatible implementation
│   ├── gemini.py            # Google Gemini implementation
│   ├── ollama.py            # Ollama implementation
│   └── registry.py          # Provider registration and factory
├── server/
│   ├── mcp_server.py        # MCP server setup
│   └── tools/
│       └── spawn_agent.py   # spawn_agent MCP tool
├── orchestrator/
│   ├── task_executor.py     # Subagent task execution logic
│   └── cost_tracker.py      # Token usage and cost calculation
├── config/
│   ├── providers.py         # Provider configuration loading
│   └── models.py            # Pydantic models for validation
└── types.py                 # Shared type definitions

tests/
├── contract/
│   └── test_spawn_agent.py  # MCP tool contract tests
├── integration/
│   ├── test_anthropic.py    # Provider integration tests
│   ├── test_openai.py
│   ├── test_gemini.py
│   └── test_ollama.py
└── unit/
    ├── providers/           # Provider unit tests with mocks
    ├── orchestrator/        # Task executor unit tests
    └── config/              # Configuration validation tests
```

**Structure Decision**: Single project structure selected. MCP server acts as both server (to host agents) and client (to LLM providers). Provider-specific code isolated in `src/providers/` per Constitution Principle I. Tools exposed via Python MCP SDK in `src/server/`.

## Complexity Tracking

> No Constitution Check violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |
