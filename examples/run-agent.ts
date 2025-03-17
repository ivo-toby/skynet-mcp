/**
 * Run Agent
 *
 * A simple script that runs the SimpleAgent with predefined MCP servers.
 * This can connect to any external MCP servers that you have access to.
 */

import { SimpleAgent, SimpleAgentConfig } from '../src/orchestrator/simple-agent.js';
import readline from 'readline';

// Configure the agent with your MCP servers
const agentConfig: SimpleAgentConfig = {
  toolServers: [
    // Example:
    // {
    //   name: 'calculator',
    //   url: 'http://localhost:3000/mcp',
    // },
    // Add your MCP servers here
  ],
  maxToolCalls: 5,
};

/**
 * Interactive command line interface for the agent
 */
async function runInteractiveAgent() {
  // Check if we have any servers configured
  if (agentConfig.toolServers.length === 0) {
    console.log('No MCP servers configured.');
    console.log('Please edit examples/run-agent.ts to add your MCP servers.');
    process.exit(1);
  }

  console.log('Initializing SimpleAgent...');
  const agent = new SimpleAgent(agentConfig);

  try {
    await agent.initialize();

    console.log('\nSimpleAgent initialized with the following servers:');
    for (const server of agentConfig.toolServers) {
      console.log(`- ${server.name} (${server.url})`);
    }

    // Set up readline interface for interactive prompts
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Function to ask for a prompt
    const askForPrompt = () => {
      rl.question('\nEnter a prompt (or "exit" to quit): ', async (prompt) => {
        if (prompt.toLowerCase() === 'exit') {
          await agent.shutdown();
          rl.close();
          console.log('Agent shutdown complete.');
          return;
        }

        try {
          console.log('Processing prompt...');
          const response = await agent.processPrompt(prompt);
          console.log('\nResponse:');
          console.log(response);
        } catch (error) {
          console.error('Error processing prompt:', error);
        }

        // Ask for another prompt
        askForPrompt();
      });
    };

    // Start the interactive loop
    console.log('\nSimpleAgent is ready. Type a prompt to interact with available tools.');
    console.log('For example: "What is 5 + 3?" or "Calculate 10 - 4"');
    askForPrompt();
  } catch (error) {
    console.error('Failed to initialize agent:', error);
    process.exit(1);
  }
}

// Run the interactive agent
runInteractiveAgent().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
