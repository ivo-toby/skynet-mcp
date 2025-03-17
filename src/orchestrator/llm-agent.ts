/**
 * LLM Agent - An agent that uses LangChain and LLMs to process prompts
 *
 * This agent enhances the SimpleAgent with LLM capabilities, making it
 * able to understand natural language prompts and decide which tools to use.
 */

import { SimpleAgent, SimpleAgentConfig, ToolResponse } from './simple-agent.js';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { DynamicTool } from '@langchain/core/tools';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

/**
 * LLM provider types supported by the agent
 */
export enum LlmProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

/**
 * Configuration for an LLM model
 */
export interface LlmModelConfig {
  provider: LlmProviderType;
  modelName: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Configuration for the LLM agent
 */
export interface LlmAgentConfig extends SimpleAgentConfig {
  model: LlmModelConfig;
  systemPrompt?: string;
  maxRetries?: number;
  verbose?: boolean;
}

/**
 * Mock tool servers and tools
 */
interface MockTool {
  name: string;
  description: string;
}

/**
 * LLM-powered agent that can process natural language prompts
 */
export class LlmAgent extends SimpleAgent {
  private llm: BaseChatModel;
  private executor: AgentExecutor | null = null;
  private langchainTools: DynamicTool[] = [];
  private systemPrompt: string;
  private llmConfig: LlmAgentConfig;
  private mockTools: Map<string, MockTool[]> = new Map();

  /**
   * Create a new LLM agent
   */
  constructor(config: LlmAgentConfig) {
    super(config);
    this.llmConfig = config;
    this.systemPrompt =
      config.systemPrompt ||
      'You are a helpful assistant that uses tools when appropriate to answer questions. ' +
        'If a tool call fails, try a different approach or tool. ' +
        "Respond directly and concisely to the user's request.";

    // Initialize the LLM based on the provider
    this.llm = this.initializeLlm(config.model);

    // Set up mock tools for demonstration
    this.setupMockTools();
  }

  /**
   * Set up mock tools for demonstration purposes
   */
  private setupMockTools(): void {
    // Mock calculator tools
    for (const server of this.config.toolServers) {
      this.mockTools.set(server.name, [
        {
          name: 'add',
          description: 'Add two numbers',
        },
        {
          name: 'subtract',
          description: 'Subtract second number from first number',
        },
        {
          name: 'calculate',
          description: 'Calculate mathematical expressions',
        },
      ]);
    }
  }

  /**
   * Initialize the LLM based on the provider
   */
  private initializeLlm(modelConfig: LlmModelConfig): BaseChatModel {
    const { provider, modelName, apiKey, temperature = 0.7, maxTokens = 1500 } = modelConfig;

    switch (provider) {
      case LlmProviderType.OPENAI:
        return new ChatOpenAI({
          modelName,
          openAIApiKey: apiKey,
          temperature,
          maxTokens,
        });

      case LlmProviderType.ANTHROPIC:
        return new ChatAnthropic({
          modelName,
          anthropicApiKey: apiKey,
          temperature,
          maxTokens,
        });

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  /**
   * Initialize the agent and connect to tool servers
   */
  async initialize(): Promise<void> {
    // First, initialize the SimpleAgent to connect to tool servers
    await super.initialize();

    // Create LangChain tools from the available MCP tools
    this.langchainTools = this.createLangChainTools();

    // Set up the LangChain agent
    await this.setupAgent();

    console.log(`LLM Agent initialized with ${this.langchainTools.length} tools`);
  }

  /**
   * Create LangChain tools from the MCP tools
   */
  private createLangChainTools(): DynamicTool[] {
    const tools: DynamicTool[] = [];

    // Convert each mock tool to a LangChain tool
    for (const [serverName, mockToolList] of this.mockTools.entries()) {
      for (const mockTool of mockToolList) {
        const toolName = mockTool.name;

        // Create tool based on the type
        if (toolName === 'add') {
          tools.push(
            new DynamicTool({
              name: `${serverName}_${toolName}`,
              description: `Add two numbers using the ${toolName} tool on the ${serverName} server. Input should be a JSON object with 'a' and 'b' properties, both numbers.`,
              func: async (input: string) => {
                try {
                  // Parse the input
                  const parsed = JSON.parse(input);
                  if (typeof parsed.a !== 'number' || typeof parsed.b !== 'number') {
                    return "Error: Input must have 'a' and 'b' properties, both numbers.";
                  }

                  const response = await this.callToolIfAvailable(toolName, parsed);
                  return response?.result || 'Tool call failed';
                } catch (error) {
                  console.error(`Error using ${toolName} tool:`, error);
                  return `Error: Failed to use ${toolName} tool. Make sure the input is valid JSON with 'a' and 'b' properties.`;
                }
              },
            }),
          );
        } else if (toolName === 'subtract') {
          tools.push(
            new DynamicTool({
              name: `${serverName}_${toolName}`,
              description: `Subtract the second number from the first using the ${toolName} tool on the ${serverName} server. Input should be a JSON object with 'a' and 'b' properties.`,
              func: async (input: string) => {
                try {
                  // Parse the input
                  const parsed = JSON.parse(input);
                  if (typeof parsed.a !== 'number' || typeof parsed.b !== 'number') {
                    return "Error: Input must have 'a' and 'b' properties, both numbers.";
                  }

                  const response = await this.callToolIfAvailable(toolName, parsed);
                  return response?.result || 'Tool call failed';
                } catch (error) {
                  console.error(`Error using ${toolName} tool:`, error);
                  return `Error: Failed to use ${toolName} tool. Make sure the input is valid JSON with 'a' and 'b' properties.`;
                }
              },
            }),
          );
        } else if (toolName === 'calculate') {
          tools.push(
            new DynamicTool({
              name: `${serverName}_${toolName}`,
              description: `Calculate a mathematical expression using the ${toolName} tool on the ${serverName} server. Input should be a JSON object with an 'expression' property.`,
              func: async (input: string) => {
                try {
                  // Parse input as parameters for the tool
                  const parsed = JSON.parse(input);
                  if (typeof parsed.expression !== 'string') {
                    return "Error: Input must have an 'expression' property with a string value.";
                  }

                  const response = await this.callToolIfAvailable(toolName, parsed);
                  return response?.result || 'Tool call failed';
                } catch (error) {
                  console.error(`Error using ${toolName} tool:`, error);
                  return `Error: Failed to use ${toolName} tool. Make sure the input is valid JSON.`;
                }
              },
            }),
          );
        }
      }
    }

    return tools;
  }

  /**
   * Set up the LangChain agent
   */
  private async setupAgent(): Promise<void> {
    try {
      // Create the prompt
      const prompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(this.systemPrompt),
        HumanMessagePromptTemplate.fromTemplate('{input}'),
      ]);

      // Create the agent
      const agent = await createOpenAIFunctionsAgent({
        llm: this.llm,
        tools: this.langchainTools,
        prompt,
      });

      // Create the executor
      this.executor = new AgentExecutor({
        agent,
        tools: this.langchainTools,
        maxIterations: this.llmConfig.maxRetries || 3,
        verbose: this.llmConfig.verbose || false,
      });
    } catch (error) {
      console.error('Error setting up LangChain agent:', error);
      throw new Error(`Failed to set up LLM agent: ${error}`);
    }
  }

  /**
   * Process a prompt using the LLM agent
   */
  async processPrompt(prompt: string): Promise<string> {
    if (!this.executor) {
      await this.initialize();
    }

    if (!this.executor) {
      throw new Error('Agent executor is not initialized');
    }

    try {
      console.log(`Processing prompt with LLM Agent: "${prompt}"`);

      // Invoke the agent
      const result = await this.executor.invoke({
        input: prompt,
      });

      return result.output as string;
    } catch (error) {
      console.error('Error processing prompt with LLM:', error);
      return `I encountered an error while processing your request: ${error}`;
    }
  }

  /**
   * Call a tool if it's available on any connected server
   */
  protected async callToolIfAvailable(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ToolResponse | null> {
    console.log(`Mock tool call: ${toolName} with args:`, args);

    // Simulate a calculator tool
    if (toolName === 'add' && typeof args.a === 'number' && typeof args.b === 'number') {
      return {
        serverName: 'calculator',
        toolName: 'add',
        result: `${args.a + args.b}`,
      };
    } else if (
      toolName === 'subtract' &&
      typeof args.a === 'number' &&
      typeof args.b === 'number'
    ) {
      return {
        serverName: 'calculator',
        toolName: 'subtract',
        result: `${args.a - args.b}`,
      };
    } else if (toolName === 'calculate' && typeof args.expression === 'string') {
      try {
        // Simple eval for demo purposes only - NEVER do this in production
        const result = Function('"use strict"; return (' + args.expression + ')')();
        return {
          serverName: 'calculator',
          toolName: 'calculate',
          result: `${result}`,
        };
      } catch (error) {
        console.error('Error evaluating expression:', error);
        return {
          serverName: 'calculator',
          toolName: 'calculate',
          result: `Error: Invalid expression`,
        };
      }
    }

    // No matching tool found
    return null;
  }

  /**
   * Register local tools that can be used without MCP server
   */
  registerLocalTools(tools: Record<string, unknown>): void {
    console.log('Local tools registered:', Object.keys(tools));
  }
}
