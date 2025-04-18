/**
 * Model configuration for Vercel AI SDK
 */
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';

export type ModelProvider = 'openai' | 'anthropic';

/**
 * Available model options for each provider
 */
export const MODEL_OPTIONS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
};

/**
 * Gets the appropriate model from the specified provider
 */
export const getModel = (provider: ModelProvider, modelId?: string) => {
  if (provider === 'openai') {
    const model = modelId || MODEL_OPTIONS.openai[0];
    return openai(model);
  } else {
    const model = modelId || MODEL_OPTIONS.anthropic[0];
    return anthropic(model);
  }
};

/**
 * Configuration for model usage
 */
export interface ModelConfig {
  provider: ModelProvider;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Creates a model from configuration
 */
export const getModelFromConfig = (config: ModelConfig) => {
  return getModel(config.provider, config.modelId);
};
