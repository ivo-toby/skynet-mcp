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
    toolServers: [
      {
        name: 'calculator',
        url: 'http://localhost:3000/mock-mcp',
      },
    ],
    maxToolCalls: 5,
  };

  // Create and initialize the agent
  const agent = new SimpleAgent(agentConfig);
  await agent.initialize();

  try {
    // Process some example prompts
    const examples = [
      'What is 5 + 3?',
      'Calculate 10 - 4',
      'Can you help me research quantum computing?',
    ];

    for (const prompt of examples) {
      console.log('\n-----------------------------------');
      console.log(`Prompt: "${prompt}"`);

      const response = await agent.processPrompt(prompt);
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
