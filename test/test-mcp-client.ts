/**
 * Test script for Mastra MCP client integration
 *
 * This script demonstrates how Mastra can use MCP servers for agent orchestration.
 * It creates a coordinator agent that spawns child agents to work on subtasks.
 */
import dotenv from 'dotenv';
import { createCoordinatorAgent } from '../src/mastra/agents/mcp-agent-factory';

// Load environment variables
dotenv.config();

// Check for required environment variables
const checkEnv = () => {
  const provider = process.env.DEFAULT_PROVIDER || 'anthropic';

  if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required when using Anthropic');
  }

  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required when using OpenAI');
  }

  return { provider };
};

/**
 * Main test function
 */
async function main() {
  try {
    // Check environment variables
    const { provider } = checkEnv();

    console.log(`Running test with provider: ${provider}`);

    // Create a coordinator agent
    const { agent, mastra } = await createCoordinatorAgent({
      name: 'Test Coordinator Agent',
      modelConfig: {
        provider: provider as 'openai' | 'anthropic',
        modelId: provider === 'openai' ? 'gpt-4o' : 'claude-3-opus-20240229',
        temperature: 0.7,
      },
      port: 3000,
    });

    console.log('Coordinator agent created successfully');

    // Test the agent with a complex task
    const complexTask =
      'Create a comprehensive market analysis report for a new smart home device, including competitor analysis, pricing strategy, and target market demographics.';

    console.log(`Sending task to agent: ${complexTask}`);

    // Generate a response from the agent
    const response = await agent.generate([{ role: 'user', content: complexTask }], {
      maxSteps: 5, // Allow multiple tool calls
    });

    console.log('\nAgent response:');
    console.log(response.text);

    // Check for tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      console.log('\nTool calls:');

      for (const toolCall of response.toolCalls) {
        console.log(`\nTool: ${toolCall.name}`);
        console.log(`Input: ${JSON.stringify(toolCall.input, null, 2)}`);
        console.log(`Output: ${JSON.stringify(toolCall.output, null, 2)}`);
      }
    }

    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Test script failed:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(console.error);
}

export { main };
