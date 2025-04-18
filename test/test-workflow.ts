/**
 * Test Script for Mastra and Vercel AI SDK Integration
 *
 * This script tests the integration of Mastra dynamic workflows with Vercel AI SDK.
 * It demonstrates creating and executing workflows with different LLM providers.
 */
import dotenv from 'dotenv';
import { mastra } from '../src/mastra';
import { createWorkflowAgent } from '../src/mastra/agents/workflow-agent';
import {
  createTaskAnalysisWorkflow,
  createGenericTaskWorkflow,
} from '../src/mastra/workflows/dynamic-workflow';
import { ModelProvider } from '../src/mastra/utils/model-config';

// Load environment variables
dotenv.config();

// Ensure required environment variables are set
const checkEnv = () => {
  const requiredVars: Record<ModelProvider, string[]> = {
    openai: ['OPENAI_API_KEY'],
    anthropic: ['ANTHROPIC_API_KEY'],
  };

  // Check for at least one provider's keys
  const missingVars: string[] = [];

  Object.entries(requiredVars).forEach(([provider, vars]) => {
    const missing = vars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      console.warn(`Missing environment variables for ${provider}: ${missing.join(', ')}`);
      missingVars.push(...missing);
    }
  });

  if (Object.keys(requiredVars).length === missingVars.length) {
    throw new Error('No LLM provider API keys found in environment');
  }
};

/**
 * Test the workflow agent
 */
const testWorkflowAgent = async () => {
  console.log('\n=== Testing Workflow Agent ===\n');

  try {
    // Get the agent from Mastra
    const agent = mastra.getAgent('workflowAgent');

    // Use the agent to generate a response
    const response = await agent.generate(
      [
        {
          role: 'user',
          content:
            'I need to analyze a dataset with customer reviews and extract sentiment and key topics.',
        },
      ],
      {
        maxSteps: 3, // Allow multiple tool calls
      },
    );

    console.log('Agent response:', response.text);

    if (response.toolCalls && response.toolCalls.length > 0) {
      console.log('\nTool calls:');
      response.toolCalls.forEach((call, i) => {
        console.log(`- Tool ${i + 1}: ${call.name}`);
        console.log(`  Input: ${JSON.stringify(call.input, null, 2)}`);
        console.log(`  Output: ${JSON.stringify(call.output, null, 2)}`);
      });
    }

    return response;
  } catch (error) {
    console.error('Error testing workflow agent:', error);
    throw error;
  }
};

/**
 * Test the task analysis workflow
 */
const testTaskAnalysisWorkflow = async (provider: ModelProvider) => {
  console.log(`\n=== Testing Task Analysis Workflow (${provider}) ===\n`);

  try {
    // Create a task analysis workflow
    const workflow = createTaskAnalysisWorkflow(mastra, {
      taskDescription: 'Build a recommendation system for an e-commerce website',
      provider: provider,
    });

    // Execute the workflow
    const { runId, start } = workflow.createRun();
    const result = await start({
      triggerData: {
        taskDescription: 'Build a recommendation system for an e-commerce website',
        additionalContext: 'The website sells fashion items and has about 5,000 products',
      },
    });

    console.log('Workflow execution complete');
    console.log('Run ID:', runId);
    console.log('Status:', result.status);

    // Display results
    Object.entries(result.results).forEach(([stepId, stepResult]) => {
      console.log(`\nStep: ${stepId}`);
      console.log(`Status: ${stepResult.status}`);
      if (stepResult.status === 'success' && stepResult.output) {
        console.log('Output:', JSON.stringify(stepResult.output, null, 2));
      } else if (stepResult.error) {
        console.log('Error:', stepResult.error);
      }
    });

    return result;
  } catch (error) {
    console.error(`Error testing task analysis workflow (${provider}):`, error);
    throw error;
  }
};

/**
 * Test the content generation workflow
 */
const testContentGenerationWorkflow = async (provider: ModelProvider) => {
  console.log(`\n=== Testing Content Generation Workflow (${provider}) ===\n`);

  try {
    // Create a content generation workflow
    const workflow = createGenericTaskWorkflow(mastra, {
      taskType: 'content-generation',
      provider: provider,
    });

    // Execute the workflow
    const { runId, start } = workflow.createRun();
    const result = await start({
      triggerData: {
        input: 'Write a product description for a smart water bottle that tracks hydration',
      },
    });

    console.log('Workflow execution complete');
    console.log('Run ID:', runId);
    console.log('Status:', result.status);

    // Display results
    Object.entries(result.results).forEach(([stepId, stepResult]) => {
      console.log(`\nStep: ${stepId}`);
      console.log(`Status: ${stepResult.status}`);
      if (stepResult.status === 'success' && stepResult.output) {
        console.log('Output:');
        if (stepResult.output.generatedContent) {
          console.log(stepResult.output.generatedContent);
        } else {
          console.log(JSON.stringify(stepResult.output, null, 2));
        }
      } else if (stepResult.error) {
        console.log('Error:', stepResult.error);
      }
    });

    return result;
  } catch (error) {
    console.error(`Error testing content generation workflow (${provider}):`, error);
    throw error;
  }
};

/**
 * Test creating a custom workflow agent with specific model configuration
 */
const testCustomWorkflowAgent = async () => {
  console.log('\n=== Testing Custom Workflow Agent ===\n');

  try {
    // Create a custom workflow agent
    const customAgent = createWorkflowAgent({
      provider: 'openai',
      modelId: 'gpt-4o-mini',
      temperature: 0.7,
      maxSteps: 5,
    });

    // Use the agent to generate a response
    const response = await customAgent.generate(
      [
        {
          role: 'user',
          content: 'Create a data processing pipeline for customer transaction data',
        },
      ],
      {
        maxSteps: 5,
      },
    );

    console.log('Custom agent response:', response.text);

    return response;
  } catch (error) {
    console.error('Error testing custom workflow agent:', error);
    throw error;
  }
};

/**
 * Main function to run all tests
 */
const main = async () => {
  try {
    // Check environment variables
    checkEnv();

    // Determine which providers to test
    const providers: ModelProvider[] = [];
    if (process.env.OPENAI_API_KEY) providers.push('openai');
    if (process.env.ANTHROPIC_API_KEY) providers.push('anthropic');

    console.log(`Running tests with providers: ${providers.join(', ')}`);

    // Test the workflow agent
    await testWorkflowAgent();

    // Test workflows with each available provider
    for (const provider of providers) {
      await testTaskAnalysisWorkflow(provider);
      await testContentGenerationWorkflow(provider);
    }

    // Test custom workflow agent if OpenAI is available
    if (providers.includes('openai')) {
      await testCustomWorkflowAgent();
    }

    console.log('\n=== All tests completed successfully ===\n');
  } catch (error) {
    console.error('Test script failed:', error);
    process.exit(1);
  }
};

// Run the main function
if (require.main === module) {
  main().catch(console.error);
}

export {
  testWorkflowAgent,
  testTaskAnalysisWorkflow,
  testContentGenerationWorkflow,
  testCustomWorkflowAgent,
};
