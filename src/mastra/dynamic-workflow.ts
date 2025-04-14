/**
 * Dynamic Workflow Implementation for Skynet-MCP
 *
 * This module implements a Mastra-style dynamic workflow system, allowing agents
 * to design and execute their own workflows based on high-level task instructions.
 */

import { z } from 'zod';
import { 
  DiscoveredTool, 
  discoverToolsFromServer, 
  executeToolOnServer 
} from './mock-mcp-client.js';

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
  enableRealTools?: boolean; // Whether to use real MCP server tools
}

/**
 * Dynamic Workflow class implementing Mastra's approach
 */
export class DynamicWorkflow {
  private llm: any;
  private toolServers: ToolServerConfig[];
  private tools: Record<string, any> = {};
  private discoveredTools: DiscoveredTool[] = [];
  private enableRealTools: boolean;
  private initialized: boolean = false;
  
  /**
   * Creates a new dynamic workflow
   * 
   * @param config Configuration for the workflow
   */
  constructor(config: DynamicWorkflowConfig) {
    this.llm = config.llm;
    this.toolServers = config.toolServers;
    this.enableRealTools = config.enableRealTools ?? false;
  }
  
  /**
   * Initialize available tools
   */
  private async initializeTools() {
    if (this.initialized) {
      return;
    }
    
    if (this.enableRealTools) {
      // Discover tools from MCP servers
      await this.discoverRealTools();
    } else {
      // Use mock tools for demonstration purposes
      this.initializeMockTools();
    }
    
    this.initialized = true;
  }
  
  /**
   * Initialize mock tools for offline testing
   */
  private initializeMockTools() {
    console.log('Initializing mock tools');
    
    this.tools = {
      web_search: {
        id: 'web_search',
        name: 'web_search',
        description: 'Search the web for information',
        parameters: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        execute: async ({ query }: { query: string }) => {
          console.log(`[MOCK] Searching for: ${query}`);
          return `Search results for: ${query}`;
        }
      },
      summarize: {
        id: 'summarize',
        name: 'summarize',
        description: 'Summarize a text',
        parameters: {
          text: {
            type: 'string',
            description: 'The text to summarize'
          }
        },
        execute: async ({ text }: { text: string }) => {
          console.log(`[MOCK] Summarizing text of length: ${text.length}`);
          return `Summary of text: ${text.substring(0, 50)}...`;
        }
      },
      tavily_search: {
        id: 'tavily_search',
        name: 'tavily_search',
        description: 'Search for information using Tavily',
        parameters: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        execute: async ({ query }: { query: string }) => {
          console.log(`[MOCK] Tavily searching for: ${query}`);
          return `Tavily search results for: ${query}`;
        }
      }
    };
  }
  
  /**
   * Discover tools from connected MCP servers
   */
  private async discoverRealTools() {
    console.log('Discovering tools from MCP servers');
    
    try {
      // Reset discovered tools
      this.discoveredTools = [];
      
      // Discover tools from each server
      for (const server of this.toolServers) {
        console.log(`Discovering tools from server: ${server.name} (${server.url})`);
        
        const tools = await discoverToolsFromServer(server.url, server.name);
        
        if (tools.length > 0) {
          console.log(`Found ${tools.length} tools from server ${server.name}`);
          this.discoveredTools.push(...tools);
        } else {
          console.warn(`No tools found from server ${server.name}`);
        }
      }
      
      // Map tools by name for easy access
      this.tools = {};
      
      for (const tool of this.discoveredTools) {
        const toolId = `${tool.name}`;
        
        this.tools[toolId] = {
          id: toolId,
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          serverName: tool.serverName,
          serverUrl: tool.serverUrl,
          execute: async (args: Record<string, any>) => {
            return executeToolOnServer(tool, args);
          }
        };
      }
      
      console.log(`Discovered ${Object.keys(this.tools).length} tools from MCP servers`);
    } catch (error) {
      console.error('Error discovering tools:', error);
      // Fall back to mock tools
      console.warn('Falling back to mock tools');
      this.initializeMockTools();
    }
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
      // Initialize tools if not already done
      if (!this.initialized) {
        await this.initializeTools();
      }
      
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
      .map(tool => {
        const params = tool.parameters ? 
          Object.entries(tool.parameters)
            .map(([name, param]: [string, any]) => 
              `      - ${name}: ${param.description || 'No description'} (${param.type || 'any'})`)
            .join('\n') : 
          '      (No parameters)';
        
        return `- ${tool.name}: ${tool.description}\n    Parameters:\n${params}`;
      })
      .join('\n\n');
    
    // Prompt the LLM to generate a workflow plan
    const prompt = `
You are an AI agent tasked with creating a workflow to accomplish the following task:

"${task}"

You have access to the following tools:

${toolDescriptions}

Create a detailed workflow with specific steps to execute this task. Your workflow should be formatted as a JSON object with the following structure:

{
  "task": "Clear description of what the workflow will accomplish",
  "steps": [
    {
      "id": "step1",
      "description": "Detailed description of what this step does",
      "tool": "tool_name",  // Name of the tool to use
      "toolParameters": {  // Parameters for the tool, matching the required parameters
        "param1": "value1",
        "param2": "value2"
      },
      "nextSteps": ["step2"]  // IDs of the next steps to execute
    },
    {
      "id": "step2",
      "description": "Detailed description of what this step does",
      "nextSteps": ["step3"]
    },
    {
      "id": "step3",
      "description": "Final step that summarizes the results",
      "nextSteps": []  // Empty array for the final step
    }
  ],
  "expectedOutput": "Description of what the workflow will produce"
}

Guidelines for creating the workflow:
1. Make sure each step is specific and actionable
2. Use the appropriate tool for each step, with the correct parameters
3. Include both information gathering and analysis steps
4. Add a final step that summarizes or synthesizes the results
5. Ensure steps are connected properly with nextSteps
6. The final step should have an empty nextSteps array

IMPORTANT: Only use tools that are listed above. Do not make up or invent new tools.
If a task requires a tool that is not available, break it down into steps that can be done with available tools.
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
      
      const workflowPlan = JSON.parse(jsonMatch[0]);
      
      // Validate the workflow plan
      this.validateWorkflowPlan(workflowPlan);
      
      return workflowPlan;
    } catch (error) {
      console.error('Error generating workflow plan:', error);
      throw new Error('Failed to generate workflow plan');
    }
  }
  
  /**
   * Validates a workflow plan to ensure it's properly structured
   * 
   * @param plan The workflow plan to validate
   * @throws Error if the plan is invalid
   */
  private validateWorkflowPlan(plan: any): void {
    // Check that the plan has a task
    if (!plan.task) {
      throw new Error('Workflow plan must have a task');
    }
    
    // Check that the plan has steps
    if (!plan.steps || !Array.isArray(plan.steps) || plan.steps.length === 0) {
      throw new Error('Workflow plan must have at least one step');
    }
    
    // Check that all steps have IDs and descriptions
    for (const step of plan.steps) {
      if (!step.id) {
        throw new Error('All steps must have an ID');
      }
      
      if (!step.description) {
        throw new Error(`Step ${step.id} must have a description`);
      }
      
      // If the step has a tool, check that it exists
      if (step.tool && !this.tools[step.tool]) {
        console.warn(`Step ${step.id} references unknown tool: ${step.tool}`);
      }
      
      // Check that nextSteps is an array
      if (!step.nextSteps || !Array.isArray(step.nextSteps)) {
        throw new Error(`Step ${step.id} must have a nextSteps array (even if empty)`);
      }
      
      // Check that all next steps exist
      for (const nextStepId of step.nextSteps) {
        // Find the step with the given ID
        const nextStep = plan.steps.find((s: any) => s.id === nextStepId);
        
        if (!nextStep) {
          throw new Error(`Step ${step.id} references non-existent next step: ${nextStepId}`);
        }
      }
    }
    
    // Check that there's at least one end step (with empty nextSteps)
    if (!plan.steps.some((step: any) => step.nextSteps.length === 0)) {
      throw new Error('Workflow plan must have at least one end step (with empty nextSteps)');
    }
    
    // Check that all steps are reachable from the first step
    const reachableSteps = new Set<string>();
    
    const traverseSteps = (stepId: string) => {
      if (reachableSteps.has(stepId)) {
        return;
      }
      
      reachableSteps.add(stepId);
      
      const step = plan.steps.find((s: any) => s.id === stepId);
      if (step) {
        for (const nextStepId of step.nextSteps) {
          traverseSteps(nextStepId);
        }
      }
    };
    
    traverseSteps(plan.steps[0].id);
    
    const allStepIds = new Set(plan.steps.map((step: any) => step.id));
    const unreachableSteps = [...allStepIds].filter(id => !reachableSteps.has(id));
    
    if (unreachableSteps.length > 0) {
      throw new Error(`Some steps are unreachable from the first step: ${unreachableSteps.join(', ')}`);
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
    
    // Create a map of steps by ID for quick access
    const stepsById = new Map(steps.map(step => [step.id, step]));
    
    // Execute steps in order by following the nextSteps
    const pendingSteps = [steps[0]]; // Start with the first step
    
    while (pendingSteps.length > 0) {
      const step = pendingSteps.shift()!;
      
      console.log(`Executing step ${step.id}: ${step.description}`);
      
      // Skip if already completed
      if (completedSteps.has(step.id)) {
        console.log(`Step ${step.id} already completed, skipping`);
        continue;
      }
      
      try {
        let output;
        
        if (step.tool && this.tools[step.tool]) {
          // Execute tool
          const tool = this.tools[step.tool];
          console.log(`Executing tool ${step.tool} with parameters:`, step.toolParameters || {});
          output = await tool.execute(step.toolParameters || {});
          console.log(`Tool ${step.tool} execution completed`);
          console.log(`Result:`, typeof output === 'string' ? output.substring(0, 100) + '...' : 'Complex output');
        } else {
          // Process with LLM if no tool is specified
          console.log(`No tool specified for step ${step.id}, processing with LLM`);
          
          // Create a context for the LLM with previous step outputs
          const previousResults = {};
          for (const result of results) {
            previousResults[result.id] = result.output;
          }
          
          // Create the prompt for the LLM
          const prompt = `
Execute the following workflow step:

Step: ${step.description}

Previous step results:
${Object.entries(previousResults)
  .map(([id, output]) => `- ${id}: ${typeof output === 'string' ? output.substring(0, 100) + '...' : JSON.stringify(output).substring(0, 100) + '...'}`)
  .join('\n')}

Provide a concise and direct response that accomplishes this step.
Return ONLY the result, with no additional explanation.
`;
          
          const response = await this.llm.complete(prompt);
          output = typeof response.content === 'string' 
            ? response.content 
            : JSON.stringify(response.content);
          
          console.log(`LLM processing for step ${step.id} completed`);
        }
        
        // Add the result
        results.push({
          id: step.id,
          status: 'completed',
          output
        });
        
        // Mark the step as completed
        completedSteps.add(step.id);
        
        // Add next steps to the pending steps
        for (const nextStepId of step.nextSteps) {
          const nextStep = stepsById.get(nextStepId);
          if (nextStep) {
            pendingSteps.push(nextStep);
          } else {
            console.error(`Next step ${nextStepId} not found`);
          }
        }
      } catch (error) {
        console.error(`Error executing step ${step.id}:`, error);
        
        results.push({
          id: step.id,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
        
        // Even if a step fails, we'll try to continue with its next steps
        // so that the workflow can continue as much as possible
        for (const nextStepId of step.nextSteps) {
          const nextStep = stepsById.get(nextStepId);
          if (nextStep) {
            pendingSteps.push(nextStep);
          }
        }
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
