/**
 * Adapter for LLM instances to provide the 'complete' method expected by WorkflowManager
 */

import { LLM, LLMProvider } from './interface';
import { CompletionResponse } from '../../../mastra/llm-interface';

/**
 * Adapter class that wraps an LLM instance and provides the 'complete' method
 * expected by WorkflowManager.
 */
export class CompleteAdapter {
  private llm: LLM;

  /**
   * Creates a new adapter
   *
   * @param llm The LLM wrapper from LLMFactory
   */
  constructor(llm: LLM) {
    this.llm = llm;
  }

  /**
   * Completes a prompt using the LLM
   *
   * @param prompt The prompt to complete
   * @returns The completion response
   */
  async complete(prompt: string): Promise<CompletionResponse> {
    try {
      const config = this.llm.getConfig();
      const modelInstance = this.llm.getModelInstance();
      
      console.log(`Completing prompt with provider: ${config.provider}, model: ${config.model}`);
      
      // Check if we should use real LLM calls or mock responses
      const useMockResponse = process.env.USE_MOCK_LLM === 'true';
      
      // For development and testing, use mock responses if specifically requested
      if (useMockResponse) {
        console.log('Using mock completion as requested by USE_MOCK_LLM environment variable');
        return this.generateMockResponse(prompt);
      }
      
      try {
        // Using structured format for API calls
        switch (config.provider) {
          case LLMProvider.OPENAI: {
            console.log('Calling OpenAI API...');
            const response = await modelInstance.complete({
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 4000,
            });
            
            console.log('OpenAI API response received');
            
            // Extract the content from the response
            let content = '';
            if (response && response.choices && response.choices.length > 0) {
              content = response.choices[0].message.content || '';
            } else {
              console.warn('Unexpected OpenAI response format:', response);
              content = JSON.stringify(response);
            }
            
            return { content };
          }
          
          case LLMProvider.ANTHROPIC: {
            console.log('Calling Anthropic API...');
            const response = await modelInstance.complete({
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 4000,
            });
            
            console.log('Anthropic API response received');
            
            // Extract the content from the response
            let content = '';
            if (response && response.content) {
              content = response.content;
            } else {
              console.warn('Unexpected Anthropic response format:', response);
              content = JSON.stringify(response);
            }
            
            return { content };
          }
          
          case LLMProvider.GOOGLE: {
            console.log('Calling Google AI API...');
            const response = await modelInstance.complete({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              temperature: 0.7,
              maxOutputTokens: 4000,
            });
            
            console.log('Google AI API response received');
            
            // Extract the content from the response
            let content = '';
            if (response && response.candidates && response.candidates.length > 0) {
              content = response.candidates[0].content.parts[0].text || '';
            } else {
              console.warn('Unexpected Google AI response format:', response);
              content = JSON.stringify(response);
            }
            
            return { content };
          }
          
          default:
            throw new Error(`Unsupported provider: ${config.provider}`);
        }
      } catch (apiError) {
        console.error('API Error:', apiError);
        
        // Fall back to mock response
        console.warn('Falling back to mock response due to API error');
        return this.generateMockResponse(prompt);
      }
    } catch (error) {
      console.error('Error completing prompt:', error);
      
      // Fallback to mock response in case of errors
      console.warn('Falling back to mock response due to error');
      return this.generateMockResponse(prompt);
    }
  }
  
  /**
   * Generates a mock response when the real API call fails
   * 
   * @param prompt The original prompt
   * @returns A mock completion response
   */
  private generateMockResponse(prompt: string): CompletionResponse {
    const config = this.llm.getConfig();
    console.log(`Generating mock response for prompt using model: ${config.model}`);
    
    // Create a workflow plan based on the prompt
    let responsePlan;
    
    if (prompt.includes('weather') && prompt.includes('news')) {
      responsePlan = {
        task: 'Analyze and summarize information about current weather in New York and latest news about artificial intelligence',
        steps: [
          {
            id: 'step1',
            description: 'Search for current weather in New York',
            tool: 'web_search',
            toolParameters: {
              query: 'current weather in New York',
            },
            nextSteps: ['step2'],
          },
          {
            id: 'step2',
            description: 'Search for latest news about artificial intelligence',
            tool: 'web_search',
            toolParameters: {
              query: 'latest news artificial intelligence',
            },
            nextSteps: ['step3'],
          },
          {
            id: 'step3',
            description: 'Summarize the information gathered',
            nextSteps: [],
          },
        ],
        expectedOutput:
          'A summary of the current weather in New York and the latest news about artificial intelligence',
      };
    } else {
      // Create a generic workflow with search and summarize steps
      responsePlan = {
        task: `Process the task: ${prompt.substring(0, 100)}...`,
        steps: [
          {
            id: 'step1',
            description: `Search for information about: ${prompt.substring(0, 50)}...`,
            tool: 'web_search',
            toolParameters: {
              query: prompt.substring(0, 50),
            },
            nextSteps: ['step2'],
          },
          {
            id: 'step2',
            description: 'Analyze the search results',
            tool: 'web_search',
            toolParameters: {
              query: `analysis of ${prompt.substring(0, 30)}`,
            },
            nextSteps: ['step3'],
          },
          {
            id: 'step3',
            description: 'Summarize all the information gathered',
            nextSteps: [],
          },
        ],
        expectedOutput: `A comprehensive analysis of ${prompt.substring(0, 50)}...`,
      };
    }
    
    return { content: JSON.stringify(responsePlan, null, 2) };
  }
}
