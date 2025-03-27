/**
 * Dynamic Workflow Implementation for Skynet-MCP
 *
 * This module implements a Mastra-style dynamic workflow system, allowing agents
 * to design and execute their own workflows based on high-level task instructions.
 */

import { z } from 'zod';

/**
 * Configuration for a tool server
 */
export interface ToolServerConfig {
  url: string;
  name: string;
}

/**
 * Result of a workflow execution step
 */
export interface StepResult {
  id: string;
  status: 'completed' | 'failed' | 'skipped';
  output?: any;
  error?: string;
}

/**
 * Result of a workflow execution
 */
export interface WorkflowResult {
  success: boolean;
  output: string;
  steps: StepResult[];
}

/**
 * Configuration for the dynamic workflow
 */
export interface DynamicWorkflowConfig {
  llm: any; // AI model instance
  toolServers: ToolServerConfig[];
}

/**
 * Dynamic Workflow class implementing Mastra's approach
 */
export class DynamicWorkflow {
  private llm: any;
  private toolServers: ToolServerConfig[];
  private tools: Record<string, any> = {};
  
  /**
   * Creates a new dynamic workflow
   * 
   * @param config Configuration for the workflow
   */
  constructor(config: DynamicWorkflowConfig) {
    this.llm = config.llm;
    this.toolServers = config.toolServers;
    
    // Initialize mock tools
    this.initializeTools();
  }
  
  /**
   * Initialize available tools
   */
  private initializeTools() {
    // Mock tools for demonstration purposes
    this.tools = {
      search: {
        id: 'search',
        description: 'Search the web for information',
        inputSchema: z.object({
          query: z.string().describe('The search query')
        }),
        execute: async ({ query }: { query: string }) => {
          console.log(`Searching for: ${query}`);
          return `Search results for: ${query}`;
        }
      },
      summarize: {
        id: 'summarize',
        description: 'Summarize a text',
        inputSchema: z.object({
          text: z.string().describe('The text to summarize')
        }),
        execute: async ({ text }: { text: string }) => {
          console.log(`Summarizing text of length: ${text.length}`);
          return `Summary of text: ${text.substring(0, 50)}...`;
        }
      }
    };
  }
  
  /**
   * Execute the dynamic workflow
   * 
   * @param task The task to execute
   * @returns Result of the workflow execution
   */
  async execute(task: string): Promise<WorkflowResult> {
    console.log(`Executing dynamic workflow for task: ${task}`);
    
    try {
      // Step 1: Generate the dynamic workflow based on the task
      const workflowPlan = await this.generateWorkflowPlan(task);
      console.log('Generated workflow plan:', workflowPlan);
      
      // Step 2: Execute the workflow steps
      const results = await this.executeWorkflowSteps(workflowPlan.steps);
      
      // Step 3: Generate the final response
      const finalResponse = await this.generateFinalResponse(task, workflowPlan, results);
      
      return {
        success: true,
        output: finalResponse,
        steps: results
      };
    } catch (error) {
      console.error('Error executing dynamic workflow:', error);
      return {
        success: false,
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        steps: []
      };
    }
  }
  
  /**
   * Generate a workflow plan based on the task
   * 
   * @param task The task to plan for
   * @returns A workflow plan with steps
   */
  private async generateWorkflowPlan(task: string) {
    // Create a list of available tools to include in the prompt
    const toolDescriptions = Object.values(this.tools)
      .map(tool => `- ${tool.id}: ${tool.description}`)
      .join('\n');
    
    // Prompt the LLM to generate a workflow plan
    const prompt = `
You are an AI agent tasked with creating a workflow to accomplish the following task:

"${task}"

You have access to the following tools:
${toolDescriptions}

Create a detailed workflow with specific steps to execute this task. Your workflow should be formatted as a JSON object with the following structure:

{
  "goal": "Clear description of what you're trying to achieve",
  "steps": [
    {
      "id": "step1",
      "name": "Short step name",
      "description": "Detailed description of what this step does",
      "tool": "tool_id",  // Optional: ID of the tool to use
      "input": {          // Optional: Input parameters for the tool
        "key": "value"
      },
      "dependsOn": []     // IDs of steps that must be completed before this one
    },
    // More steps...
  ]
}

Each step should be specific and actionable. If a step uses a tool, specify the correct tool ID and input parameters.
`;

    try {
      // Get the workflow plan from the LLM
      const response = await this.llm.complete(prompt);
      
      // Extract and parse the JSON
      const responseText = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract workflow plan from response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error generating workflow plan:', error);
      throw new Error('Failed to generate workflow plan');
    }
  }
  
  /**
   * Execute the workflow steps
   * 
   * @param steps The steps to execute
   * @returns Results of the step executions
   */
  private async executeWorkflowSteps(steps: any[]): Promise<StepResult[]> {
    const results: StepResult[] = [];
    const completedSteps = new Set<string>();
    
    // Sort steps based on dependencies
    const sortedSteps = this.topologicalSort(steps);
    
    // Execute steps in order
    for (const step of sortedSteps) {
      // Check if all dependencies are completed
      const dependenciesMet = step.dependsOn?.every((depId: string) => 
        completedSteps.has(depId)
      ) ?? true;
      
      if (!dependenciesMet) {
        results.push({
          id: step.id,
          status: 'skipped',
          error: 'Dependencies not met'
        });
        continue;
      }
      
      try {
        let output;
        
        if (step.tool && this.tools[step.tool]) {
          // Execute tool
          const tool = this.tools[step.tool];
          output = await tool.execute(step.input || {});
        } else {
          // Process with LLM
          const prompt = `
Execute the following workflow step:

Step: ${step.description}

${step.input ? `Input: ${JSON.stringify(step.input)}` : ''}

Previous steps:
${results.map(r => `- ${r.id}: ${r.output || 'No output'}`).join('\n')}

Provide a concise and direct response that accomplishes this step.
`;
          
          const response = await this.llm.complete(prompt);
          output = typeof response.content === 'string' 
            ? response.content 
            : JSON.stringify(response.content);
        }
        
        results.push({
          id: step.id,
          status: 'completed',
          output
        });
        
        completedSteps.add(step.id);
      } catch (error) {
        results.push({
          id: step.id,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return results;
  }
  
  /**
   * Sort steps topologically based on dependencies
   * 
   * @param steps The steps to sort
   * @returns Sorted steps
   */
  private topologicalSort(steps: any[]): any[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: any[] = [];
    
    // Create a map of step ID to step
    const stepsMap = new Map(steps.map(step => [step.id, step]));
    
    // Define the visit function for depth-first search
    const visit = (stepId: string) => {
      // If we've already processed this step, return
      if (visited.has(stepId)) return;
      
      // Check for circular dependencies
      if (temp.has(stepId)) {
        throw new Error(`Circular dependency detected with step: ${stepId}`);
      }
      
      // Mark as being visited
      temp.add(stepId);
      
      // Visit all dependencies first
      const step = stepsMap.get(stepId);
      for (const depId of step.dependsOn || []) {
        visit(depId);
      }
      
      // Mark as visited and add to result
      temp.delete(stepId);
      visited.add(stepId);
      result.push(step);
    };
    
    // Visit all steps
    for (const step of steps) {
      if (!visited.has(step.id)) {
        visit(step.id);
      }
    }
    
    return result;
  }
  
  /**
   * Generate the final response summarizing the workflow execution
   * 
   * @param task The original task
   * @param workflowPlan The executed workflow plan
   * @param results The results of the step executions
   * @returns A final summary response
   */
  private async generateFinalResponse(
    task: string,
    workflowPlan: any,
    results: StepResult[]
  ): Promise<string> {
    const resultsText = results
      .map(r => `- ${r.id}: ${r.status === 'completed' ? 'Completed' : 'Failed'}\n  ${r.output || r.error || 'No output'}`)
      .join('\n\n');
    
    const prompt = `
Summarize the results of the following workflow:

Original task: "${task}"

Goal: ${workflowPlan.goal}

Steps executed:
${resultsText}

Provide a concise summary of the workflow execution, focusing on the key insights and addressing the original task directly. Do not include details about the workflow itself - focus on the answer to the original task.
`;
    
    try {
      const response = await this.llm.complete(prompt);
      return typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);
    } catch (error) {
      console.error('Error generating final response:', error);
      return `Error generating summary: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
