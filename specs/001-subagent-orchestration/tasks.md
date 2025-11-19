---

description: "Task list for agent-agnostic subagent orchestration"
---

# Tasks: Agent-Agnostic Subagent Orchestration

**Input**: Design documents from `/specs/001-subagent-orchestration/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are REQUIRED per Constitution Principle II (Test-Driven Development)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths use Python naming conventions (underscores, not hyphens)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project directory structure per plan.md
- [X] T002 Create requirements.txt with dependencies (mcp>=1.1.2, pydantic>=2.10.0, anthropic, openai, google-generativeai, ollama, pytest, pytest-asyncio)
- [X] T003 [P] Create pyproject.toml with project metadata and build configuration
- [X] T004 [P] Create pytest.ini with test configuration and markers
- [X] T005 [P] Create .gitignore for Python project (venv, __pycache__, .pytest_cache, .env)
- [X] T006 [P] Create config/providers.yaml template with example provider configurations
- [X] T007 [P] Create README.md with setup instructions (reference quickstart.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Create Pydantic models in src/config/models.py (ProviderConfig, SpawnRequest, TaskResult, TokenUsage, LLMError, TaskStatus enum)
- [X] T009 [P] Create LLMProvider protocol in src/providers/base.py (defines interface all providers must implement)
- [X] T010 [P] Create shared types in src/types.py (Message, GenerationParams, CompletionResponse type aliases)
- [X] T011 Create provider registry in src/providers/registry.py (factory pattern for provider instantiation)
- [X] T012 Create cost tracker in src/orchestrator/cost_tracker.py (PRICING dict and calculate_cost function)
- [X] T013 Create provider config loader in src/config/providers.py (load_provider_configs from YAML)
- [X] T014 [P] Create src/__init__.py and src/providers/__init__.py package markers
- [X] T015 [P] Create src/server/__init__.py and src/server/tools/__init__.py package markers
- [X] T016 [P] Create src/orchestrator/__init__.py and src/config/__init__.py package markers

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Spawn Single Subagent for Task (Priority: P1) 🎯 MVP

**Goal**: Enable host agents to spawn a subagent with a single provider (Anthropic) and receive results

**Independent Test**: Spawn a subagent with task "Say hello", receive result with token usage and cost

### Tests for User Story 1 (TDD - write FIRST, ensure they FAIL)

- [ ] T017 [P] [US1] Contract test for spawn_agent tool in tests/contract/test_spawn_agent.py (verify MCP tool schema, basic request/response)
- [ ] T018 [P] [US1] Integration test for Anthropic provider in tests/integration/test_anthropic.py (real API call with mock or small request)
- [ ] T019 [P] [US1] Unit test for task executor in tests/unit/orchestrator/test_task_executor.py (mock provider, test timeout logic)

### Implementation for User Story 1

- [X] T020 [P] [US1] Implement AnthropicProvider in src/providers/anthropic.py (generate_completion method, token extraction from response)
- [X] T021 [P] [US1] Implement TaskExecution model in src/config/models.py (state tracking: pending→running→completed/failed/timeout)
- [X] T022 [US1] Implement task executor in src/orchestrator/task_executor.py (execute_task function with timeout enforcement using asyncio.timeout)
- [X] T023 [US1] Implement spawn_agent MCP tool in src/server/tools/spawn_agent.py (accepts SpawnRequest, calls task executor, returns TaskResult)
- [X] T024 [US1] Implement MCP server in src/server/mcp_server.py (register spawn_agent tool, handle STDIO transport)
- [X] T025 [US1] Add request validation in spawn_agent tool (validate provider exists, task non-empty, timeout in range)
- [X] T026 [US1] Add error handling for provider API failures (map to LLMError with retryable flag)
- [ ] T027 [US1] Add timeout enforcement test scenario (verify task stops within 10s of limit)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Configure Multiple Providers (Priority: P2)

**Goal**: Support 4 different provider types (Anthropic, OpenAI-compatible, Gemini, Ollama)

**Independent Test**: Configure Anthropic and Ollama, spawn tasks with each, verify both work

### Tests for User Story 2 (TDD - write FIRST, ensure they FAIL)

- [ ] T028 [P] [US2] Integration test for OpenAI provider in tests/integration/test_openai.py
- [ ] T029 [P] [US2] Integration test for Gemini provider in tests/integration/test_gemini.py
- [ ] T030 [P] [US2] Integration test for Ollama provider in tests/integration/test_ollama.py
- [ ] T031 [P] [US2] Unit test for provider registry in tests/unit/providers/test_registry.py (test factory, unknown provider error)
- [ ] T032 [P] [US2] Unit test for config loader in tests/unit/config/test_providers.py (test YAML loading, env var resolution)

### Implementation for User Story 2

- [ ] T033 [P] [US2] Implement OpenAICompatibleProvider in src/providers/openai_compatible.py (support api_base override for Azure/custom endpoints)
- [ ] T034 [P] [US2] Implement GeminiProvider in src/providers/gemini.py (handle nested generationConfig parameters)
- [ ] T035 [P] [US2] Implement OllamaProvider in src/providers/ollama.py (local endpoint, zero cost)
- [ ] T036 [US2] Update provider registry to register all 4 provider types (anthropic, openai_compatible, gemini, ollama)
- [ ] T037 [US2] Add provider type validation in config loader (ensure type is one of 4 supported)
- [ ] T038 [US2] Add environment variable validation on startup (check API keys exist before server starts)
- [ ] T039 [US2] Add provider health check logging on startup (log configured providers and models)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Monitor Cost and Usage (Priority: P3)

**Goal**: Track token usage and enforce budget limits per task

**Independent Test**: Run tasks with budget limits, verify cost tracking and budget enforcement

### Tests for User Story 3

- [ ] T040 [P] [US3] Unit test for cost tracker in tests/unit/orchestrator/test_cost_tracker.py (test pricing table, cost calculation)
- [ ] T041 [P] [US3] Integration test for budget enforcement in tests/integration/test_budget.py (verify task stops when budget exceeded)
- [ ] T042 [P] [US3] Contract test for token usage in response in tests/contract/test_spawn_agent.py (extend existing test to verify token fields)

### Implementation for User Story 3

- [ ] T043 [US3] Add budget tracking to task executor (check cost before/after provider call, stop if exceeded)
- [ ] T044 [US3] Update PRICING table in cost_tracker.py with current rates for all models
- [ ] T045 [US3] Add budget_exceeded status to TaskStatus enum and TaskExecution model
- [ ] T046 [US3] Add cumulative usage tracking across multiple tasks (optional: persist in-memory for session)
- [ ] T047 [US3] Add cost estimation logging (log estimated cost for each completed task)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T048 [P] Add comprehensive error messages for all failure scenarios (provider not found, missing API key, invalid config, API errors)
- [ ] T049 [P] Add structured logging throughout (use logging module with INFO/DEBUG/ERROR levels)
- [ ] T050 [P] Add SSE transport support in mcp_server.py (in addition to STDIO)
- [ ] T051 [P] Add parameter normalization for provider-specific quirks (temperature ranges, top_k support)
- [ ] T052 [P] Create __main__.py for python -m src.server.mcp_server execution
- [ ] T053 Code cleanup and refactoring (remove debug prints, ensure consistent naming)
- [ ] T054 [P] Add docstrings to all public functions and classes
- [ ] T055 [P] Run mypy type checking and fix any type errors
- [ ] T056 [P] Run ruff linter and formatter on all source files
- [ ] T057 Validate quickstart.md instructions (ensure README matches actual setup)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Builds on US1 provider pattern but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances US1/US2 but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before tools
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Setup (Phase 1)**:
- T003, T004, T005, T006, T007 can all run in parallel

**Foundational (Phase 2)**:
- T009, T010, T012 can run in parallel (different files)
- T014, T015, T016 can run in parallel (package markers)

**User Story 1 Tests**:
- T017, T018, T019 can run in parallel

**User Story 1 Implementation**:
- T020, T021 can run in parallel (provider and model are independent)

**User Story 2 Tests**:
- T028, T029, T030, T031, T032 can all run in parallel

**User Story 2 Implementation**:
- T033, T034, T035 can run in parallel (different provider files)

**User Story 3 Tests**:
- T040, T041, T042 can run in parallel

**Polish (Phase 6)**:
- T048, T049, T050, T051, T052, T054, T055, T056 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Write all tests together (ensure they fail):
Task: "[US1] Contract test for spawn_agent in tests/contract/test_spawn_agent.py"
Task: "[US1] Integration test for Anthropic in tests/integration/test_anthropic.py"
Task: "[US1] Unit test for task executor in tests/unit/orchestrator/test_task_executor.py"

# Implement models and provider in parallel:
Task: "[US1] Implement AnthropicProvider in src/providers/anthropic.py"
Task: "[US1] Implement TaskExecution model in src/config/models.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- **[P] tasks** = different files, no dependencies
- **[Story] label** maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

## Constitution Compliance

All tasks align with project constitution:
- **Provider-Agnostic**: Tasks T020, T033-T035 implement pluggable provider pattern
- **Test-Driven**: Tests (T017-T019, T028-T032, T040-T042) written before implementation
- **Simplicity**: MVP scope (US1) delivers value, US2/US3 add incrementally
- **MCP Compliance**: Tasks T017, T024 ensure MCP protocol adherence
