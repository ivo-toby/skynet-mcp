/**
 * Mastra Entry Point
 *
 * This file configures and exports the Mastra instance with agents and workflows.
 */
import { Mastra } from '@mastra/core';
import { workflowAgent } from './agents/workflow-agent';

/**
 * Create and export the Mastra instance
 */
export const mastra = new Mastra({
  agents: { workflowAgent },
});

/**
 * Helper function to get an agent by name
 */
export const getAgent = (agentName: string) => {
  return mastra.getAgent(agentName as any);
};

/**
 * Helper function to run a workflow
 */
export const runWorkflow = async (workflowName: string, triggerData: Record<string, any>) => {
  const workflow = mastra.getWorkflow(workflowName);
  if (!workflow) {
    throw new Error(`Workflow '${workflowName}' not found`);
  }

  const { runId, start } = workflow.createRun();
  return await start({ triggerData });
};
