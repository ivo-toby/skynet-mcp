import { LanguageModelV1 } from '@ai-sdk/provider'; // Import LanguageModelV1

export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
}

// LLMInstance should represent the actual model instance, not the factory function type.
// Using LanguageModelV1 from @ai-sdk/provider provides a common interface.
export type LLMInstance = LanguageModelV1;

export interface BaseModelConfiguration {
  provider: LLMProvider;
  model: string;
  apiKey: string;
}

export interface OpenAIModelConfiguration extends BaseModelConfiguration {
  provider: LLMProvider.OPENAI;
  options?: {
    organization?: string;
    apiVersion?: string;
    baseURL?: string;
  };
}

export interface AnthropicModelConfiguration extends BaseModelConfiguration {
  provider: LLMProvider.ANTHROPIC;
  options?: {
    baseURL?: string;
  };
}

export interface GoogleModelConfiguration extends BaseModelConfiguration {
  provider: LLMProvider.GOOGLE;
  options?: {
    apiVersion?: string;
  };
}

export type LLMConfig =
  | OpenAIModelConfiguration
  | AnthropicModelConfiguration
  | GoogleModelConfiguration;

export interface LLMOptions {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLM {
  getModelInstance(): LLMInstance;
  getConfig(): LLMConfig;
}
