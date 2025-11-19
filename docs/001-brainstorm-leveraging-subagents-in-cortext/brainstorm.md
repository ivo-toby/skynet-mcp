# Brainstorm: Leveraging Subagents in Cortext

**ID**: 001-brainstorm-leveraging-subagents-in-cortext
**Date**: 2025-11-17
**Status**: In Progress

---

## Goals

- Leverage subagents for parallel research/exploration
- Optimize context window management in main conversation
- Use cheaper/faster models (Haiku) for delegatable tasks
- Keep main context focused on high-level reasoning

---

## Ideas

### Context Window Optimization
- **Haiku for web searches** - Fetch and summarize, return only distilled insights
- **Parallel research delegation** - Multiple Haiku agents searching different angles simultaneously
- **File/grep operations** - Simple searches delegated to cheap models, return only relevant snippets
- **Research swarm pattern** - 3-4 Haiku agents each tackle different aspects (docs, GitHub issues, SO, blogs)
- **Batch file analysis** - Haiku scans 10 files, returns "here's what's relevant"

### Cross-Platform Challenge
- Claude Code: Native subagent support, easy to configure
- **Problem**: Other agents (Cursor, Gemini CLI, etc.) don't have this built-in
- How do we make subagent patterns portable across different AI coding tools?

### SkynetMCP - Subagent as a Service
- **MCP Client embedded IN an MCP Server** - mind-bending recursion!
- Network of MCP agents that can spawn/orchestrate other agents
- Any MCP-compatible tool gets subagent superpowers automatically
- Universal interface regardless of host agent platform
- Could support multiple model providers (Anthropic, OpenAI, local models)
- Agents calling agents calling agents... (Inception vibes)

### Potential Architectures
- **HTTP service wrapper** - Universal, any agent with web access can use
- **Bash script tools** - Works if agent can execute shell commands
- **Pure MCP approach** - Most elegant, but requires MCP support
- **Hybrid** - MCP server that also exposes HTTP endpoints?

### Key Design Questions (for SpecKit)
- **Tool inheritance** - Do subagents inherit parent's MCP servers? Selective inheritance?
- **Configuration model** - How to define agent capabilities, models, tool access?
- **Security boundaries** - What can subagents do vs main agent?
- **Communication patterns** - Request/response? Streaming? Events?
- **State management** - Do subagents share context? Isolated?
- **Cost controls** - Budget limits per subagent? Per task?

### Core Value Proposition
- **Agent-agnostic** - Works with any MCP-compatible host (Claude Code, Cursor, etc.)
- **Remove vendor lock-in** - Subagent patterns portable across platforms
- **Composable intelligence** - Mix models, specialize agents, chain capabilities

---

## Themes

[Patterns and connections between ideas]

---

## Next Steps

[Promising directions to pursue]

---

**Metadata**
- Created: 2025-11-17
- Tags: brainstorm, [topic]
