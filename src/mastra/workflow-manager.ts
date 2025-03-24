/**
 * Mastra Dynamic Workflow Manager for Skynet-MCP
 * 
 * This module implements a dynamic workflow system based on the Mastra approach,
 * enabling agents to generate and execute their own workflows based on high-level
 * instructions.
 */

import { LanguageModel } from './llm-interface.js';
import { ToolResponse } from './types.js';

/**
 * Structure for a workflow step
 */
export interface WorkflowStep {
  id: string;
  description: string;
  tool?: string;
  toolParameters?: Record<string, unknown>;
  condition?: {
    if: string;
    then: string[];
    else: string[];
  };
  childAgent?: {
    task: string;
    tools: string[];
  };
  nextSteps: string[];
}

/**
 * Structure for a dynamically generated workflow
 */
export interface DynamicWorkflow {
  task: string;
  steps: WorkflowStep[];
  expectedOutput: string;
}

/**
 * Status of a workflow execution
 */
export type WorkflowStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

/**
 * Result of a workflow execution
 */
export interface WorkflowResult {
  status: WorkflowStatus;
  data?: unknown;
  error?: string;
  completedSteps: string[];
  stepResults: Record<string, unknown>;
}

/**
 * Available tools from the connected MCP servers
 */
export interface AvailableTool {
  name: string;
  description: string;
  serverName: string;
}

/**
 * Configuration for the workflow manager
 */
export interface WorkflowManagerConfig {
  tools: AvailableTool[];
  maxSteps?: number;
  timeout?: number;
  maxChildAgents?: number;
}

/**
 * Manages dynamic workflow generation and execution
 */
export class WorkflowManager {
  private llm: LanguageModel;
  private config: WorkflowManagerConfig;
  
  /**
   * Creates a new workflow manager
   * 
   * @param llm The LLM to use for workflow generation and execution
   * @param config Configuration for the workflow manager
   */
  constructor(llm: LanguageModel, config: WorkflowManagerConfig) {
    this.llm = llm;
    this.config = {
      maxSteps: 10,
      timeout: 300000, // 5 minutes
      maxChildAgents: 3,
      ...config,
    };
  }
  
  /**
   * Generates a dynamic workflow based on the task description
   * 
   * @param task The task to generate a workflow for
   * @returns A dynamic workflow
   */
  async generateWorkflow(task: string): Promise<DynamicWorkflow> {
    console.log(`Generating workflow for task: ${task}`);
    
    // Create a prompt for workflow generation
    const toolDescriptions = this.config.tools
      .map(tool => `- ${tool.name} (from ${tool.serverName}): ${tool.description}`)
      .join('\n');
    
    const workflowPrompt = `
You are an AI agent tasked with creating a detailed workflow to accomplish the following task:

"${task}"

You have access to the following tools:

${toolDescriptions}

Create a structured workflow with specific steps to complete this task. Your workflow should be formatted as a JSON object with the following structure:

{
  "task": "The main task description",
  "steps": [
    {
      "id": "step1",
      "description": "Detailed description of the first step",
      "tool": "tool_name", // Optional, name of the tool to use
      "toolParameters": {}, // Optional, parameters for the tool
      "nextSteps": ["step2"] // IDs of the next steps to execute
    },
    ...
  ],
  "expectedOutput": "Description of the expected output of the workflow"
}

Guidelines:
1. Be specific and detailed in your step descriptions
2. Only include tools that are actually available
3. Ensure steps are in a logical sequence
4. Provide appropriate parameters for each tool
5. Make sure all step IDs are unique
6. Ensure all steps are connected (no orphaned steps)
7. The workflow should have a clear end (steps with empty nextSteps)

Think carefully about the most efficient way to accomplish this task.
`;

    try {
      // Get the workflow from the LLM
      const response = await this.llm.complete(workflowPrompt);
      const responseText = response.content;
      
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON workflow from LLM response');
      }
      
      // Parse the workflow
      const workflow = JSON.parse(jsonMatch[0]) as DynamicWorkflow;
      
      // Validate the workflow
      this.validateWorkflow(workflow);
      
      console.log(`Generated workflow with ${workflow.steps.length} steps`);
      return workflow;
    } catch (error) {
      console.error('Error generating workflow:', error);
      throw new Error(`Failed to generate workflow: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Validates a workflow to ensure it's properly structured
   * 
   * @param workflow The workflow to validate
   * @throws Error if the workflow is invalid
   */
  private validateWorkflow(workflow: DynamicWorkflow): void {
    // Check that the workflow has a task
    if (!workflow.task) {
      throw new Error('Workflow must have a task');
    }
    
    // Check that the workflow has steps
    if (!workflow.steps || !Array.isArray(workflow.steps) || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }
    
    // Check that all steps have IDs and descriptions
    for (const step of workflow.steps) {
      if (!step.id) {
        throw new Error('All steps must have an ID');
      }
      
      if (!step.description) {
        throw new Error(`Step ${step.id} must have a description`);
      }
      
      // Check that the tool is valid if provided
      if (step.tool && !this.config.tools.some(t => t.name === step.tool)) {
        throw new Error(`Step ${step.id} uses an unknown tool: ${step.tool}`);
      }
      
      // Check that nextSteps is an array
      if (!step.nextSteps || !Array.isArray(step.nextSteps)) {
        throw new Error(`Step ${step.id} must have a nextSteps array (even if empty)`);
      }
      
      // Check that all next steps exist
      for (const nextStep of step.nextSteps) {
        if (!workflow.steps.some(s => s.id === nextStep)) {
          throw new Error(`Step ${step.id} references non-existent next step: ${nextStep}`);
        }
      }
    }
    
    // Check for circular references
    this.checkForCircularReferences(workflow);
    
    // Check that there's at least one end step
    if (!workflow.steps.some(step => step.nextSteps.length === 0)) {
      throw new Error('Workflow must have at least one end step');
    }
    
    // Check that all steps are reachable from the first step
    const reachableSteps = this.findReachableSteps(workflow);
    const unreachableSteps = workflow.steps.filter(step => !reachableSteps.includes(step.id));
    
    if (unreachableSteps.length > 0) {
      throw new Error(`Some steps are unreachable: ${unreachableSteps.map(s => s.id).join(', ')}`);
    }
  }
  
  /**
   * Finds all steps reachable from the first step
   * 
   * @param workflow The workflow to check
   * @returns Array of reachable step IDs
   */
  private findReachableSteps(workflow: DynamicWorkflow): string[] {
    const reachable: string[] = [];
    const firstStep = workflow.steps[0];
    
    const traverse = (stepId: string) => {
      if (reachable.includes(stepId)) {
        return;
      }
      
      reachable.push(stepId);
      
      const step = workflow.steps.find(s => s.id === stepId);
      if (step) {
        for (const nextStep of step.nextSteps) {
          traverse(nextStep);
        }
      }
    };
    
    traverse(firstStep.id);
    
    return reachable;
  }
  
  /**
   * Checks for circular references in the workflow
   * 
   * @param workflow The workflow to check
   * @throws Error if circular references are found
   */
  private checkForCircularReferences(workflow: DynamicWorkflow): void {
    const visited: Set<string> = new Set();
    const recStack: Set<string> = new Set();
    
    const checkStep = (stepId: string): boolean => {
      if (!visited.has(stepId)) {
        visited.add(stepId);
        recStack.add(stepId);
        
        const step = workflow.steps.find(s => s.id === stepId);
        if (step) {
          for (const nextStep of step.nextSteps) {
            if (!visited.has(nextStep) && checkStep(nextStep)) {
              return true;
            } else if (recStack.has(nextStep)) {
              throw new Error(`Circular reference detected: ${nextStep} is referenced in a cycle`);
            }
          }
        }
      }
      
      recStack.delete(stepId);
      return false;
    };
    
    // Start checking from the first step
    if (workflow.steps.length > 0) {
      checkStep(workflow.steps[0].id);
    }
  }
  
  /**
   * Executes a dynamic workflow
   * 
   * @param workflow The workflow to execute
   * @param toolExecutor Function to execute tools
   * @param spawnChildAgent Function to spawn a child agent
   * @returns Result of the workflow execution
   */
  async executeWorkflow(
    workflow: DynamicWorkflow,
    toolExecutor: (toolName: string, args: Record<string, unknown>) => Promise<ToolResponse | null>,
    spawnChildAgent: (task: string, tools: string[]) => Promise<string>,
  ): Promise<WorkflowResult> {
    console.log(`Executing workflow for task: ${workflow.task}`);
    
    const result: WorkflowResult = {
      status: 'in-progress',
      completedSteps: [],
      stepResults: {},
    };
    
    try {
      // Start with the first step
      const firstStep = workflow.steps[0];
      const finalResult = await this.executeStep(
        workflow,
        firstStep.id,
        result,
        toolExecutor,
        spawnChildAgent,
      );
      
      finalResult.status = 'completed';
      return finalResult;
    } catch (error) {
      console.error('Error executing workflow:', error);
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }
  
  /**
   * Executes a single step in the workflow
   * 
   * @param workflow The workflow being executed
   * @param stepId ID of the step to execute
   * @param result Current workflow result
   * @param toolExecutor Function to execute tools
   * @param spawnChildAgent Function to spawn a child agent
   * @returns Updated workflow result
   */
  private async executeStep(
    workflow: DynamicWorkflow,
    stepId: string,
    result: WorkflowResult,
    toolExecutor: (toolName: string, args: Record<string, unknown>) => Promise<ToolResponse | null>,
    spawnChildAgent: (task: string, tools: string[]) => Promise<string>,
  ): Promise<WorkflowResult> {
    // Find the step
    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in workflow`);
    }
    
    console.log(`Executing step ${stepId}: ${step.description}`);
    
    // Skip if already completed
    if (result.completedSteps.includes(stepId)) {
      console.log(`Step ${stepId} already completed, skipping`);
      return result;
    }
    
    // Execute the step based on its type
    let stepResult: unknown = null;
    
    try {
      if (step.tool) {
        // Execute a tool
        console.log(`Executing tool ${step.tool} with parameters:`, step.toolParameters || {});
        const toolResponse = await toolExecutor(step.tool, step.toolParameters || {});
        stepResult = toolResponse?.result || null;
      } else if (step.childAgent) {
        // Spawn a child agent
        console.log(`Spawning child agent for task: ${step.childAgent.task}`);
        const childAgentResponse = await spawnChildAgent(
          step.childAgent.task,
          step.childAgent.tools || [],
        );
        stepResult = childAgentResponse;
      } else {
        // Direct LLM processing
        console.log(`Processing step with LLM: ${step.description}`);
        const processingPrompt = `
Execute the following step in a workflow:

${step.description}

Context:
Task: ${workflow.task}
Completed steps: ${result.completedSteps.join(', ')}

Previous results:
${Object.entries(result.stepResults)
  .map(([id, res]) => `${id}: ${JSON.stringify(res)}`)
  .join('\n')}

Provide a concise and direct response that accomplishes this step.
`;
        
        const llmResponse = await this.llm.complete(processingPrompt);
        stepResult = llmResponse.content;
      }
      
      // Record the result
      result.stepResults[stepId] = stepResult;
      result.completedSteps.push(stepId);
      
      // Check if there are conditions
      let nextSteps = step.nextSteps;
      if (step.condition) {
        // Use LLM to evaluate the condition
        const conditionPrompt = `
Evaluate the following condition in the context of a workflow step:

Condition: ${step.condition.if}

Step result: ${JSON.stringify(stepResult)}

Return ONLY the string "true" if the condition is met, or "false" if not.
`;
        
        const conditionResponse = await this.llm.complete(conditionPrompt);
        const conditionResult = conditionResponse.content.toLowerCase().includes('true');
        
        nextSteps = conditionResult ? step.condition.then : step.condition.else;
      }
      
      // Execute the next steps
      for (const nextStepId of nextSteps) {
        await this.executeStep(
          workflow,
          nextStepId,
          result,
          toolExecutor,
          spawnChildAgent,
        );
      }
      
      return result;
    } catch (error) {
      console.error(`Error executing step ${stepId}:`, error);
      throw new Error(`Failed to execute step ${stepId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generates a summary of the workflow execution
   * 
   * @param workflow The executed workflow
   * @param result The workflow execution result
   * @returns Summary of the workflow execution
   */
  async generateSummary(workflow: DynamicWorkflow, result: WorkflowResult): Promise<string> {
    console.log('Generating summary of workflow execution');
    
    const summaryPrompt = `
Summarize the results of the following workflow execution:

Task: ${workflow.task}

Expected output: ${workflow.expectedOutput}

Completed steps:
${result.completedSteps.map(stepId => {
  const step = workflow.steps.find(s => s.id === stepId);
  return `- ${stepId}: ${step?.description || 'Unknown step'}`;
}).join('\n')}

Step results:
${Object.entries(result.stepResults)
  .map(([id, res]) => `${id}: ${JSON.stringify(res)}`)
  .join('\n')}

Status: ${result.status}
${result.error ? `Error: ${result.error}` : ''}

Provide a concise summary of what was accomplished, the key findings, and whether the overall task was successful.
`;
    
    try {
      const summaryResponse = await this.llm.complete(summaryPrompt);
      return summaryResponse.content;
    } catch (error) {
      console.error('Error generating summary:', error);
      return `Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
