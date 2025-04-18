import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Create a client
const client = new Client(
  {
    name: 'test-client',
    version: '1.0.0',
  },
  {
    capabilities: {},
  },
);

async function main() {
  try {
    // Connect to the server
    const transport = new SSEClientTransport(new URL('http://localhost:8080/sse'));

    console.log('Connecting to server...');
    await client.connect(transport);
    console.log('Connected to server');

    // List available tools
    console.log('Listing tools...');
    const tools = await client.listTools();
    console.log(
      'Available tools:',
      tools.tools.map((t) => t.name),
    );

    // Call spawn_agent tool
    console.log('Calling spawn_agent tool...');
    const result = await client.callTool({
      name: 'spawn_agent',
      arguments: {
        modelId: 'anthropic.claude-3-opus',
        temperature: 0.7,
        maxTokens: 4096,
        task: {
          description: 'Analyze the latest financial data and provide insights',
          context: 'Financial data for Q2 2023',
          expectedOutput: 'Summary and recommendations',
        },
        timeoutSeconds: 300,
      },
    });

    // Get the agent ID
    const agentId = result.content[0].text;
    console.log('Agent ID:', agentId);

    // Wait a bit for the agent to start
    console.log('Waiting for agent to initialize...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get agent status
    console.log('Getting agent status...');
    const statusResult = await client.callTool({
      name: 'get_agent_status',
      arguments: {
        agentId,
      },
    });
    console.log('Agent status:', statusResult.content[0].text);

    // Terminate the agent
    console.log('Terminating agent...');
    const terminateResult = await client.callTool({
      name: 'terminate_agent',
      arguments: {
        agentId,
      },
    });
    console.log('Terminate result:', terminateResult.content[0].text);

    // Close the connection
    await client.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
