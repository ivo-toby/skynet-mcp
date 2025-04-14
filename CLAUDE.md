# Skynet-MCP Development Plan

## Project Overview
Skynet-MCP is a hierarchical network of AI agents using the Model Context Protocol (MCP). Each agent can spawn child agents and provide tools to parent agents, creating a recursive agent network for complex task decomposition and execution.

## Current State (April 2025)
- Basic project structure complete
- MCP server implementation using FastMCP
- Simple agent orchestration framework
- SSE and STDIO transport support
- Docker containerization
- Asynchronous task management
- Mock implementation of dynamic workflows

## Key Components
1. **MCP Server Layer**: Implementation of MCP protocol server interface
2. **Dynamic Workflow System**: Generates and executes workflows based on tasks
3. **LLM Integration**: Supports OpenAI and Anthropic models
4. **Tool Execution**: Allows agents to use tools from connected MCP servers
5. **Hierarchical Agent Management**: Creates and manages child agents

## Development Roadmap

### Phase 1: Core Functionality Implementation
- [x] Project setup and structure
- [x] MCP server implementation
- [x] Basic agent orchestration
- [x] Docker support
- [ ] Implement real LLM integration in CompleteAdapter
- [ ] Add dynamic workflow generation with actual LLM calls
- [ ] Implement tool execution with MCP server connections
- [ ] Complete error handling and validation

### Phase 2: Advanced Features
- [ ] Implement agent state persistence
- [ ] Add hierarchical agent spawning
- [ ] Develop agent-to-agent communication
- [ ] Implement advanced task decomposition
- [ ] Create monitoring and observability tools
- [ ] Add security features and authentication

### Phase 3: Optimization and Scaling
- [ ] Performance optimization
- [ ] Memory management improvements
- [ ] Scaling for large agent networks
- [ ] Advanced caching strategies
- [ ] Distributed agent deployment

## Immediate Next Steps

### 1. Real LLM Integration
- ✅ Create mockable CompleteAdapter for workflow testing
- ⏳ Investigate AI SDK integration issues
    - Debug model instance structure and interface
    - Confirm correct API calls for each provider
    - Create test framework for API calls
- ⏳ Complete real LLM integration
    - Implement proper error handling and rate limiting
    - Add streaming support for real-time responses
    - Update prompt templates for workflow generation

```typescript
// Current mockable implementation in CompleteAdapter
async complete(prompt: string): Promise<CompletionResponse> {
  try {
    // Temporary implementation until we fully resolve the AI SDK integration issues
    console.log('Using mock completion function');
    
    // Generate a reasonable mock response based on the prompt
    let responsePlan = {
      task: `Process the task: ${prompt.substring(0, 100)}...`,
      steps: [
        {
          id: "step1",
          description: `Search for information about: ${prompt.substring(0, 50)}...`,
          tool: "web_search",
          toolParameters: {
            query: prompt.substring(0, 50)
          },
          nextSteps: ["step2"]
        },
        {
          id: "step2",
          description: "Analyze the search results",
          nextSteps: []
        }
      ],
      expectedOutput: `A comprehensive analysis of ${prompt.substring(0, 50)}...`
    };
    
    return { content: JSON.stringify(responsePlan, null, 2) };
  } catch (error) {
    console.error('Error completing prompt:', error);
    throw new Error(`Failed to complete prompt: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

### 2. Dynamic Workflow Generation
- Update workflow generation logic in DynamicWorkflow class
- Implement proper parsing of LLM-generated workflow plans
- Add validation and error correction for malformed workflows
- Create template library for common workflow patterns

### 3. Tool Execution Implementation
- Connect to actual MCP servers specified in configuration
- Implement tool discovery to find available tools
- Add parameter validation for tool calls
- Create response handling for tool execution results

```typescript
// Implementation for callToolIfAvailable method
async callToolIfAvailable(toolName: string, args: Record<string, unknown>): Promise<ToolResponse | null> {
  // Find the server that provides this tool
  const toolServer = this.findToolServer(toolName);
  if (!toolServer) {
    console.log(`Tool ${toolName} not available on any connected server`);
    return null;
  }
  
  try {
    // Connect to the MCP server
    const client = await createMcpClient(toolServer.url);
    
    // Call the tool
    const response = await client.callTool(toolName, args);
    
    return {
      serverName: toolServer.name,
      toolName,
      result: response,
    };
  } catch (error) {
    console.error(`Error calling tool ${toolName}:`, error);
    throw new Error(`Failed to call tool ${toolName}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

### 4. Agent State Persistence
- Design schema for agent state storage
- Implement state management system
- Add serialization/deserialization of agent state
- Create recovery mechanism for interrupted workflows

### 5. Hierarchical Agent Network
- Implement agent spawning mechanism
- Create communication protocol between agents
- Add resource management for child agents
- Implement task delegation and result aggregation

## Running the Project
- Start the MCP server: `./bin/mcp-server.js --port 3002`
- Use the agent CLI: `./bin/agent-cli.js`

## Development Commands
- Build: `npm run build`
- Tests: `npm run test`
- Docker: `npm run docker:up`

## Environment Variables
- `OPENAI_API_KEY`: API key for OpenAI
- `ANTHROPIC_API_KEY`: API key for Anthropic
- `SERVER_PORT`: Port for the MCP server