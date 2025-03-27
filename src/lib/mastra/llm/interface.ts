import { AIModelType, GenerateOptions, ModelConfigurationOptions, Provider } from '@/lib/ai';

export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
}

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  options?: ModelConfigurationOptions;
}

export interface LLMOptions extends Partial<GenerateOptions> {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLM {
  getModelInstance(): Provider;
  getConfig(): AIModelType;
}
