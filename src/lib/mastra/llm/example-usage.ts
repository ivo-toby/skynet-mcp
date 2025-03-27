// This is an example file to demonstrate usage
import { LLMFactory } from './factory';
import { createModelConfig } from './config';
import { LLMOptions } from './interface';
import { GenerateParams } from 'ai';

// Client implementation example
export async function generateWithMastra(prompt: string, modelName: string, options?: LLMOptions) {
  // Get API key from environment or configuration
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_API_KEY || '';
  
  // Create model config with API key
  const config = createModelConfig(modelName as any, apiKey);
  
  // Get LLM instance from factory
  const llm = LLMFactory.create(config);
  
  // Get the provider instance (OpenAI, Anthropic, etc.)
  const modelInstance = llm.getModelInstance();
  
  // Get model configuration
  const modelConfig = llm.getConfig();
  
  // Prepare messages
  const messages: GenerateParams['messages'] = [];
  
  // Add system message if provided
  if (options?.systemPrompt) {
    messages.push({
      role: 'system',
      content: options.systemPrompt,
    });
  }
  
  // Add user message
  messages.push({
    role: 'user', 
    content: prompt,
  });
  
  // Generate response using appropriate method based on provider
  if (modelConfig.provider === 'anthropic') {
    // For Anthropic
    const response = await modelInstance.messages.create({
      model: modelConfig.model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      stream: options?.stream,
    });
    
    return response;
  } 
  else if (modelConfig.provider === 'google') {
    // For Google
    const response = await modelInstance.generateContent({
      model: modelConfig.model,
      messages,
      temperature: options?.temperature,
      max_output_tokens: options?.maxTokens,
      stream: options?.stream,
    });
    
    return response;
  }
  else {
    // Default for OpenAI
    const response = await modelInstance.chat.completions.create({
      model: modelConfig.model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      stream: options?.stream,
    });
    
    return response;
  }
}
