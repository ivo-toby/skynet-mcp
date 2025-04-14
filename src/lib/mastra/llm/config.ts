import { LLMConfig, LLMProvider } from './interface';

/**
 * Default configurations for common models
 */
export const ModelConfigs = {
  // OpenAI models
  'gpt-4': {
    provider: LLMProvider.OPENAI,
    model: 'gpt-4',
  } as LLMConfig,
  
  'gpt-4o': {
    provider: LLMProvider.OPENAI,
    model: 'gpt-4o',
  } as LLMConfig,
  
  'gpt-4-turbo': {
    provider: LLMProvider.OPENAI,
    model: 'gpt-4-turbo-preview',
  } as LLMConfig,
  
  'gpt-3.5-turbo': {
    provider: LLMProvider.OPENAI,
    model: 'gpt-3.5-turbo',
  } as LLMConfig,

  // Anthropic models
  'claude-3-opus': {
    provider: LLMProvider.ANTHROPIC,
    model: 'claude-3-opus-20240229',
  } as LLMConfig,
  
  'claude-3-sonnet': {
    provider: LLMProvider.ANTHROPIC,
    model: 'claude-3-sonnet-20240229',
  } as LLMConfig,
  
  'claude-3-haiku': {
    provider: LLMProvider.ANTHROPIC,
    model: 'claude-3-haiku-20240307',
  } as LLMConfig,

  // Google models
  'gemini-pro': {
    provider: LLMProvider.GOOGLE,
    model: 'gemini-pro',
  } as LLMConfig,
  
  'gemini-ultra': {
    provider: LLMProvider.GOOGLE,
    model: 'gemini-1.5-pro',
  } as LLMConfig,
};

/**
 * Helper function to create a config with an API key
 */
export function createModelConfig(modelName: keyof typeof ModelConfigs, apiKey: string): LLMConfig {
  const baseConfig = ModelConfigs[modelName];
  if (!baseConfig) {
    throw new Error(`Unknown model: ${modelName}`);
  }
  
  return {
    ...baseConfig,
    apiKey,
  };
}

/**
 * Helper function to create a custom model config not in the predefined list
 */
export function createCustomModelConfig(
  provider: LLMProvider,
  model: string,
  apiKey: string,
  options?: Record<string, unknown>
): LLMConfig {
  return {
    provider,
    model,
    apiKey,
    options,
  } as LLMConfig;
}
