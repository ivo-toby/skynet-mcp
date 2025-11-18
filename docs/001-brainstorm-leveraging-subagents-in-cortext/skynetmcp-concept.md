# SkynetMCP: Agent-Agnostic Subagent Orchestration

## Problem Statement

Current AI coding assistants (Claude Code, Cursor, Gemini CLI, etc.) each have their own subagent implementations or none at all. This creates:

- **Vendor lock-in** - Subagent workflows tied to specific platforms
- **Context window waste** - Main agent's context consumed by simple tasks (file searches, web fetches)
- **Inconsistent capabilities** - Some platforms have no subagent support at all
- **No cost optimization** - Can't route simple tasks to cheaper models

## Core Concept

**SkynetMCP** is an MCP Server that embeds an MCP Client, enabling any MCP-compatible agent to spawn and orchestrate subagents regardless of the host platform's native capabilities.

```
Host Agent (Claude Code, Cursor, etc.)
    ↓ MCP Protocol
SkynetMCP Server (contains MCP Client)
    ↓ Provider Abstraction Layer
    ↓ Spawns via pluggable providers
Subagent (Anthropic, OpenAI, Gemini, Ollama, etc.)
    ↓ Can access
Other MCP Servers (tools, databases, APIs)
```

### Agent-Agnostic Provider Architecture

SkynetMCP must be **completely provider-agnostic**, supporting:
- **Anthropic** (Claude models)
- **OpenAI-compatible APIs** (OpenAI, Azure OpenAI, local proxies, etc.)
- **Google Gemini**
- **Ollama** (local models)
- **Future providers** via pluggable architecture

This mirrors Cortext's agent-agnostic philosophy: the orchestration layer shouldn't care which LLM backend powers the subagent.

## Value Proposition

1. **Universal Subagent Access** - Any MCP-compatible tool gains subagent capabilities
2. **Context Preservation** - Offload token-heavy operations to cheap models
3. **Cost Optimization** - Route tasks by complexity to appropriate models
4. **Composable Architecture** - Chain specialized agents for complex workflows
5. **Platform Independence** - Same subagent patterns work everywhere

## Key Use Cases

### 1. Research & Search Delegation
```
Main Agent: "Research authentication patterns"
→ SkynetMCP spawns 3 Haiku agents in parallel:
  - Agent 1: Search documentation
  - Agent 2: Search GitHub issues
  - Agent 3: Search Stack Overflow
→ Returns: Consolidated 200-word summary (instead of 10K tokens of raw results)
```

### 2. Codebase Exploration
```
Main Agent: "Find where user permissions are checked"
→ SkynetMCP spawns Haiku with file access tools
→ Scans 50 files, returns: "Found in src/auth/permissions.ts:45-89 and src/middleware/auth.ts:12-34"
→ Main agent context preserved for reasoning
```

### 3. Batch Operations
```
Main Agent: "Analyze these 10 PRs for security issues"
→ SkynetMCP spawns 10 parallel agents
→ Each analyzes one PR
→ Returns: Consolidated findings
```

## Critical Design Questions

### 1. Tool & MCP Server Inheritance

How do subagents get access to tools?

**Option A: Explicit Configuration**
```json
{
  "subagent": {
    "model": "haiku",
    "tools": ["grep", "read_file", "web_fetch"],
    "mcp_servers": ["filesystem", "github"]
  }
}
```
- Pro: Full control, security
- Con: Verbose, must know all tools upfront

**Option B: Inherit from Parent**
```json
{
  "subagent": {
    "model": "haiku",
    "inherit_tools": true,
    "exclude_tools": ["write_file", "bash"]
  }
}
```
- Pro: Convenient, less config
- Con: Security risk, needs careful filtering

**Option C: Capability-Based**
```json
{
  "subagent": {
    "model": "haiku",
    "capabilities": ["read", "search", "fetch"],
    "deny_capabilities": ["write", "execute"]
  }
}
```
- Pro: Intent-based, flexible
- Con: Must map capabilities to tools

**Recommendation**: Hybrid approach - define capability profiles that map to tool sets, allow explicit overrides.

### 2. Configuration Model

Where does subagent configuration live?

**Provider Configuration** (global):
```yaml
# .skynetmcp/providers.yaml
providers:
  anthropic:
    type: anthropic
    api_key: ${ANTHROPIC_API_KEY}
    default_model: claude-sonnet-4-5-20250929

  openai:
    type: openai_compatible
    api_base: https://api.openai.com/v1
    api_key: ${OPENAI_API_KEY}
    default_model: gpt-4o

  azure_openai:
    type: openai_compatible
    api_base: https://mycompany.openai.azure.com
    api_key: ${AZURE_OPENAI_KEY}
    default_model: gpt-4

  gemini:
    type: google
    api_key: ${GOOGLE_AI_KEY}
    default_model: gemini-1.5-pro

  local:
    type: ollama
    api_base: http://localhost:11434
    default_model: llama3.2

  custom_proxy:
    type: openai_compatible
    api_base: https://my-proxy.company.com/v1
    api_key: ${PROXY_API_KEY}
    default_model: mixtral-8x7b
```

**Agent Templates** (project-level):
```yaml
# .skynetmcp/agents.yaml
agents:
  researcher:
    provider: anthropic
    model: claude-3-haiku-20240307
    system_prompt: "You are a research assistant..."
    capabilities: [search, fetch, summarize]
    max_tokens: 1000
    budget_limit: 0.10
    # Model parameters
    temperature: 0.3
    top_p: 0.9
    top_k: 40

  code_analyzer:
    provider: openai
    model: gpt-4o
    capabilities: [read_code, analyze]
    max_tokens: 4000
    temperature: 0.1  # Low temp for deterministic analysis

  fast_local:
    provider: local
    model: llama3.2:3b
    capabilities: [simple_search]
    max_tokens: 2000
    temperature: 0.7
    # Ollama-specific
    num_ctx: 4096

  gemini_researcher:
    provider: gemini
    model: gemini-1.5-flash
    capabilities: [search, summarize]
    temperature: 0.4
    top_p: 0.95
    top_k: 64
```

**Inline** (per request with overrides):
```json
{
  "task": "Find all TODO comments",
  "agent_config": {
    "provider": "local",
    "model": "codellama:7b",
    "tools": ["grep"],
    "temperature": 0.0,
    "top_p": 1.0
  }
}
```

**Questions**:
- Can subagents define their own subagents? (recursion depth limits?)
- How to handle config conflicts?
- Version control for agent configs?
- Provider failover? (If Anthropic is down, fall back to OpenAI?)

### 3. Security Boundaries

**What CAN subagents do?**
- Read files (scoped to project?)
- Make web requests (allowlisted domains?)
- Call other MCP servers
- Access environment variables?

**What CANNOT subagents do?**
- Write/modify files (unless explicitly granted)
- Execute arbitrary code
- Access credentials/secrets
- Make unlimited API calls

**Sandboxing Model**:
```yaml
security:
  file_access: read_only
  allowed_paths: ["src/", "docs/"]
  network:
    allowed_domains: ["github.com", "stackoverflow.com"]
  max_cost_per_task: 0.05
  max_duration: 60s
```

### 4. Communication Patterns

**Request/Response** (simple):
```
Parent: "Summarize this file"
→ Subagent: "The file contains..."
```

**Streaming** (for long tasks):
```
Parent: "Analyze codebase"
→ Subagent: [progress updates]
→ Subagent: [partial results]
→ Subagent: [final summary]
```

**Events** (for monitoring):
```
Subagent emits: tool_called, tokens_used, error_occurred
Parent can: pause, cancel, adjust
```

### 5. State Management

**Isolated** (default):
- Each subagent is stateless
- No shared memory
- Clean context per task
- Pro: Predictable, secure
- Con: Can't build on previous work

**Shared Context** (opt-in):
- Subagents can read shared state
- Previous results available
- Pro: More capable
- Con: Context leak risks

**Session-Based**:
- Create named sessions for related tasks
- State persists within session
- Explicit cleanup

### 6. Cost Controls

```yaml
cost_management:
  global_budget: 10.00  # per day
  per_task_limit: 0.50
  per_subagent_limit: 0.10

  alerts:
    warn_at: 0.80  # 80% of budget
    pause_at: 0.95

  model_routing:
    simple_search: haiku      # $0.001
    code_analysis: sonnet     # $0.015
    architecture: opus        # $0.075
```

## Technical Architecture

### MCP Server Interface

```typescript
// Tools exposed by SkynetMCP
interface SkynetMCPTools {
  // Spawn a subagent for a task
  spawn_agent(config: AgentConfig): Promise<AgentResult>;

  // Spawn multiple agents in parallel
  spawn_swarm(tasks: Task[]): Promise<AgentResult[]>;

  // Define reusable agent templates
  define_agent(name: string, config: AgentConfig): void;

  // Monitor running agents
  list_agents(): AgentStatus[];
  cancel_agent(id: string): void;

  // Provider management
  list_providers(): ProviderInfo[];
  test_provider(name: string): ProviderStatus;
}

interface ProviderConfig {
  type: "anthropic" | "openai_compatible" | "google" | "ollama";
  api_base?: string;  // Required for openai_compatible and ollama
  api_key?: string;   // From env var or direct
  default_model: string;
  // Provider-specific options
  options?: Record<string, unknown>;
}

interface AgentConfig {
  // Provider selection (references providers.yaml)
  provider: string;
  model?: string;  // Override provider's default

  // Task definition
  task: string;
  system_prompt?: string;

  // Tool access
  tools?: string[];
  mcp_servers?: string[];
  capabilities?: string[];

  // Model parameters (provider-agnostic where possible)
  temperature?: number;      // 0.0 - 2.0
  top_p?: number;           // 0.0 - 1.0
  top_k?: number;           // Provider-specific support
  max_tokens?: number;
  stop_sequences?: string[];

  // Constraints
  budget_limit?: number;
  timeout?: number;
}

interface AgentResult {
  success: boolean;
  result: string;
  provider_used: string;
  model_used: string;
  tokens_used: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  duration: number;
  tools_called: string[];
}

interface ProviderInfo {
  name: string;
  type: string;
  status: "available" | "unavailable" | "rate_limited";
  models_available: string[];
}
```

### Pluggable Provider Architecture

```typescript
// Base provider interface - all providers implement this
interface LLMProvider {
  name: string;
  type: string;

  // Core operations
  initialize(config: ProviderConfig): Promise<void>;
  complete(messages: Message[], params: ModelParams): Promise<Completion>;
  listModels(): Promise<string[]>;
  healthCheck(): Promise<boolean>;

  // Cost tracking (provider-specific)
  estimateCost(tokens: TokenUsage): number;
}

// Provider implementations
class AnthropicProvider implements LLMProvider { ... }
class OpenAICompatibleProvider implements LLMProvider { ... }
class GoogleProvider implements LLMProvider { ... }
class OllamaProvider implements LLMProvider { ... }

// Registry for dynamic provider loading
class ProviderRegistry {
  registerProvider(type: string, factory: ProviderFactory): void;
  createProvider(config: ProviderConfig): LLMProvider;
}

// Future providers just implement LLMProvider interface
// and register with the registry
```

### Internal MCP Client

The server internally manages:
- **Provider abstraction layer** - Unified interface to all LLM backends
- **Model API connections** - Anthropic, OpenAI, Gemini, Ollama, etc.
- **Parameter normalization** - Map common params (temp, top_p) to provider-specific formats
- **Tool execution for subagents**
- **MCP server connections for inherited tools**
- **Result aggregation and summarization**
- **Cost tracking across different pricing models**

## Open Questions

1. **Recursive Depth** - How many levels deep can agents spawn agents?
2. **Failure Handling** - What if a subagent fails? Retry? Fallback model? Automatic provider failover?
3. **Result Formats** - Standardized output schema or free-form?
4. **Observability** - How to debug agent chains? Logging? Tracing?
5. **Caching** - Cache subagent results? For how long? Invalidation?
6. **Rate Limits** - How to handle API rate limits across multiple providers and subagents?
7. **Parameter Compatibility** - Not all providers support top_k, top_p equally. How to handle gracefully?
8. **Prompt Injection** - How to prevent subagents from being hijacked?
9. **Provider Discovery** - Auto-detect available Ollama models? List OpenAI models via API?
10. **API Key Management** - Secure storage? Per-project vs global? Environment variables vs secrets manager?
11. **Provider-Specific Features** - How to expose unique capabilities (e.g., Anthropic's extended thinking, OpenAI's function calling)?

## MVP Scope

For initial implementation, focus on:

1. **Single-level spawning** - Parent → Subagent (no recursion initially)
2. **Explicit tool configuration** - No inheritance, full control
3. **Request/response only** - No streaming
4. **Four core providers** - Anthropic, OpenAI-compatible, Gemini, Ollama
5. **Basic model parameters** - temperature, top_p, max_tokens (common across all providers)
6. **Basic cost tracking** - Log usage, simple limits
7. **File read + web fetch** - Most common use cases
8. **Environment variable API keys** - Simple, secure, standard practice

## Future Vision

- **Agent marketplace** - Share specialized agent configs
- **Learning agents** - Improve based on task success
- **Cross-project memory** - Agents that remember across sessions
- **Multi-model consensus** - Multiple models vote on answers
- **Self-healing workflows** - Agents that retry with different strategies

---

*Document prepared for SpecKit specification process*
*Brainstorm session: 2025-11-17*
