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
- Real LLM integration with OpenAI, Anthropic, and Google
- Dynamic workflow generation and execution
- Real MCP client implementation with SDK integration
- Server health monitoring and connection management
- Environment-configurable mock/real behavior

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
- [x] Implement real LLM integration in CompleteAdapter
- [x] Add dynamic workflow generation with actual LLM calls
- [x] Implement tool execution with MCP server connections
- [x] Complete error handling and validation

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

### 1. Real LLM Integration ✅
- ✅ Create real API integration with fallback to mock responses
- ✅ Implement support for OpenAI, Anthropic and Google APIs
- ✅ Add proper error handling and fallback mechanisms
- ✅ Support for environment configuration through .env file
- ✅ Command-line and environment variable parameter control

```typescript
// Real implementation with fallback for CompleteAdapter
async complete(prompt: string): Promise<CompletionResponse> {
  try {
    const config = this.llm.getConfig();
    const modelInstance = this.llm.getModelInstance();
    
    console.log(`Completing prompt with provider: ${config.provider}, model: ${config.model}`);
    
    // Check if we should use real LLM calls or mock responses
    const useMockResponse = process.env.USE_MOCK_LLM === 'true';
    
    // For development and testing, use mock responses if requested
    if (useMockResponse) {
      console.log('Using mock completion as requested by USE_MOCK_LLM environment variable');
      return this.generateMockResponse(prompt);
    }
    
    try {
      // Using structured format for API calls
      switch (config.provider) {
        case LLMProvider.OPENAI: {
          console.log('Calling OpenAI API...');
          const response = await modelInstance.complete({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 4000,
          });
          
          // Extract content from response
          const content = response.choices[0].message.content || '';          
          return { content };
        }
        
        // Similar implementations for Anthropic and Google AI
      }
    } catch (apiError) {
      // Fall back to mock response on API errors
      console.warn('Falling back to mock response due to API error');
      return this.generateMockResponse(prompt);
    }
  } catch (error) {
    // Fallback to mock response on any errors
    console.warn('Falling back to mock response due to error');
    return this.generateMockResponse(prompt);
  }
}
```

### 2. Dynamic Workflow Generation ✅ 
- ✅ Update workflow generation logic in DynamicWorkflow class
- ✅ Implement proper parsing of LLM-generated workflow plans
- ✅ Add validation and error correction for malformed workflows
- ✅ Create detailed prompt for workflow creation

### 3. Tool Execution Implementation ✅
- ✅ Create MCP client connector for server communication
- ✅ Implement tool discovery from MCP servers
- ✅ Add execution of tools with parameters
- ✅ Create fallback to mock tools when servers are unavailable
- ✅ Improved step execution with better error handling
- ✅ Added server health monitoring and connection management
- ✅ Created real MCP client implementation using ModelContextProtocol SDK

```typescript
// Real MCP client implementation with the SDK
class RealMcpClient implements Client {
  private mcpClient: McpClient;
  private isConnected: boolean = false;
  private serverName: string;
  private serverUrl: string;

  constructor(mcpClient: McpClient, serverName: string, serverUrl: string) {
    this.mcpClient = mcpClient;
    this.serverName = serverName;
    this.serverUrl = serverUrl;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.mcpClient.connect();
      this.isConnected = true;
      console.log(`Connected to MCP server: ${this.serverName} (${this.serverUrl})`);
    } catch (error) {
      console.error(`Failed to connect to MCP server ${this.serverName} (${this.serverUrl}):`, error);
      throw new Error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async describeTools(): Promise<McpTool[]> {
    await this.connect();

    try {
      const response = await this.mcpClient.request('list_tools', {});
      
      // Process and return the tools
      return response.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || `Tool: ${tool.name}`,
        parameters: tool.parameters || {}
      }));
    } catch (error) {
      console.error(`Failed to list tools from MCP server ${this.serverName}:`, error);
      throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    await this.connect();

    try {
      const response = await this.mcpClient.request('call_tool', {
        name: toolName,
        parameters: args
      });

      return response.result;
    } catch (error) {
      console.error(`Failed to execute tool ${toolName} on MCP server ${this.serverName}:`, error);
      throw new Error(`Failed to execute tool: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
```

Features now available:
- Dynamic discovery of tools from MCP servers
- Improved workflow generation with better tool descriptions
- More robust validation of workflow plans
- Client-side caching of MCP connections
- Support for both mock and real tools (with `--real-tools` flag)
- Server health monitoring and automatic fallback
- Real MCP SDK integration with SSE transport
- Configurable timeouts and health check intervals

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
- `GOOGLE_API_KEY`: API key for Google AI
- `USE_MOCK_LLM`: Set to "true" to use mock LLM responses
- `DEFAULT_LLM_MODEL`: Default model to use (gpt-4, claude-3-opus, etc.)
- `ENABLE_REAL_TOOLS`: Set to "true" to connect to real MCP servers
- `USE_MOCK_TOOLS`: Set to "true" to use mock tool implementations
- `MCP_CLIENTS_CONFIG_PATH`: Path to MCP clients configuration
- `MCP_HEALTH_CHECK_INTERVAL_MS`: Interval for MCP server health checks
- `MCP_CONNECTION_TIMEOUT_MS`: Timeout for MCP server connections
- `SERVER_PORT`: Port for the MCP server