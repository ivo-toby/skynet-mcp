<!--
SYNC IMPACT REPORT
==================
Version change: 0.0.0 → 1.0.0
List of modified principles:
  - NEW: Provider-Agnostic Architecture
  - NEW: Test-Driven Development
  - NEW: Simplicity & YAGNI
  - NEW: MCP Protocol Compliance
Added sections:
  - Core Principles (4 principles)
  - Development Workflow
  - Quality Gates
  - Governance
Removed sections: None (initial constitution)
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ reviewed (Constitution Check section present)
  - .specify/templates/spec-template.md ✅ reviewed (no direct constitution references)
  - .specify/templates/tasks-template.md ✅ reviewed (no direct constitution references)
  - .specify/templates/commands/*.md ✅ reviewed (no files present)
Follow-up TODOs: None
==================
-->

# SkynetMCP Constitution

## Core Principles

### I. Provider-Agnostic Architecture

All agent orchestration MUST be independent of specific LLM providers.

- Provider abstraction layer MUST support Anthropic, OpenAI-compatible APIs, Google Gemini, and Ollama
- Configuration MUST use environment variables for API keys (`${PROVIDER_API_KEY}` pattern)
- No hardcoded provider-specific logic in core orchestration code
- New providers MUST be addable via pluggable interface without modifying existing code
- Provider-specific features MAY be exposed through optional configuration, not core abstractions

**Rationale**: SkynetMCP's value proposition depends on universal subagent access across platforms. Coupling to specific providers defeats the core purpose.

### II. Test-Driven Development

Code changes MUST follow test-first discipline for all non-trivial functionality.

- Write contract tests for MCP tool interfaces before implementation
- Integration tests MUST verify provider communication patterns
- Unit tests MUST cover provider abstraction layer boundaries
- Red-Green-Refactor cycle: test fails first, then implement, then refactor
- Tests MUST be runnable without external API calls (mock providers for unit tests)

**Rationale**: Agent orchestration involves complex async flows and multiple failure modes. Test discipline prevents regressions and documents expected behavior.

### III. Simplicity & YAGNI

Start with the simplest viable implementation; add complexity only when proven necessary.

- MVP scope: single-level spawning, explicit tool configuration, request/response only
- Avoid premature abstractions (no inheritance patterns until 3+ concrete cases exist)
- Configuration MUST have sensible defaults (zero-config for common cases)
- Features MUST NOT be added speculatively; wait for real usage demand
- Each abstraction layer MUST be justified by concrete use cases in documentation

**Rationale**: SkynetMCP is experimental. Premature complexity will slow iteration and obscure the core value proposition during early development.

### IV. MCP Protocol Compliance

All MCP interfaces SHOULD follow Model Context Protocol standards and best practices.

- MCP tool schemas MUST be valid JSON Schema
- Tool responses SHOULD follow standard content block patterns
- Transport layer MUST support both STDIO and SSE modes as documented
- Error responses SHOULD use MCP-standard error codes where applicable
- Tool discovery SHOULD be automatic and transparent to parent agents

**Rationale**: Interoperability with existing MCP clients (Claude Code, Cursor, etc.) is essential. Non-standard implementations break the universal access goal.

## Development Workflow

### Code Organization

- Provider implementations live in `src/providers/` with one file per provider type
- MCP server logic lives in `src/server/`
- Shared utilities MUST NOT contain provider-specific logic
- Configuration schemas defined in `src/config/` with validation

### Branching & Review

- Feature branches named `<issue>-<short-description>` or `<feature-name>`
- Pull requests MUST include test coverage for new functionality
- Code review SHOULD verify principle compliance before merge
- Breaking changes MUST be documented in PR description

## Quality Gates

### Pre-Merge Requirements

- All tests pass (`npm test`)
- Linting passes (`npm run lint`)
- Type checks pass (`npm run build`)
- No provider-specific code in core modules (verify abstraction layer)
- Configuration defaults documented if changed

### Documentation Standards

- Public MCP tools MUST have schema descriptions
- Provider configuration options MUST be documented in README or config guide
- Breaking changes MUST update migration notes
- New features SHOULD include usage examples

## Governance

This constitution establishes non-negotiable principles for SkynetMCP development.

- Amendments require: documented rationale, approval via PR review, migration plan for existing code
- All PRs SHOULD verify compliance with core principles
- Complexity violations MUST be justified in writing (see Constitution Check in plan template)
- Principle violations MAY be accepted temporarily with TODO comments and tracked issues

**Version**: 1.0.0 | **Ratified**: 2025-11-17 | **Last Amended**: 2025-11-17
