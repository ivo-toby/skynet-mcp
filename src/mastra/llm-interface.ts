/**
 * Custom interface for language models to avoid dependency conflicts
 */

import { AnthropicProvider } from '@ai-sdk/anthropic';
import { OpenAIProvider } from '@ai-sdk/openai';

/**
 * Response from a language model completion
 */
export interface CompletionResponse {
  content: string;
  id: string;
  model: string;
  object: string;
  system_fingerprint?: string;
  usage?: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Interface for language model
 */
export type LanguageModel = OpenAIProvider | AnthropicProvider;
