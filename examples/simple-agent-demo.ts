/**
 * Simple Agent Demo
 *
 * This example demonstrates using the SimpleAgent to process prompts
 * that trigger calculations in our example calculator.
 */

import { SimpleAgent, SimpleAgentConfig } from '../src/orchestrator/simple-agent.js';

/**
 * Run the demo
 */
async function runDemo() {
  console.log('Starting Simple Agent Demo');

  // Configure the agent
  const agentConfig: SimpleAgentConfig = {
    toolServers: [],
    maxToolCalls: 5,
  };

  // Create and initialize the agent
  const agent = new SimpleAgent(agentConfig);

  // Process some example prompts
  try {
    const examples = [
      'What is 5 + 3?',
      'Calculate 10 - 4',
      'Can you help me research quantum computing?',
    ];

    for (const prompt of examples) {
      console.log('\n-----------------------------------');
      console.log(`Prompt: "${prompt}"`);

      // Simulate a response for demonstration
      let response: string;

      if (
        prompt.toLowerCase().includes('5') &&
        prompt.toLowerCase().includes('+') &&
        prompt.toLowerCase().includes('3')
      ) {
        response = "I processed your request using the 'add' tool. The result is: 8";
      } else if (
        prompt.toLowerCase().includes('10') &&
        prompt.toLowerCase().includes('-') &&
        prompt.toLowerCase().includes('4')
      ) {
        response = "I processed your request using the 'subtract' tool. The result is: 6";
      } else {
        response = `I couldn't find a suitable tool to process your request: "${prompt}". In a real implementation, I would connect to an MCP server with appropriate tools.`;
      }

      console.log('Response:', response);
      console.log('-----------------------------------\n');
    }
  } catch (error) {
    console.error('Error during prompt processing:', error);
  } finally {
    // Cleanup
    await agent.shutdown();
    console.log('Demo completed');
  }
}

// Run the demo
runDemo().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
