// Use clearer aliases for provider factory functions
import { openai as openaiProvider } from '@ai-sdk/openai';
import { anthropic as anthropicProvider } from '@ai-sdk/anthropic';
import { google as googleProvider } from '@ai-sdk/google';
import {
  LLM,
  LLMConfig,
  LLMProvider,
  LLMInstance,
  OpenAIModelConfiguration,
  AnthropicModelConfiguration,
  GoogleModelConfiguration,
} from './interface';

class ModularAILLM implements LLM {
  private instance: LLMInstance;
  private config: LLMConfig;

  constructor(instance: LLMInstance, config: LLMConfig) {
    this.instance = instance;
    this.config = config;
  }

  getModelInstance(): LLMInstance {
    return this.instance;
  }

  getConfig(): LLMConfig {
    return this.config;
  }
}

export class LLMFactory {
  /**
   * Create an LLM instance based on the provided configuration
   * @param config The LLM configuration
   * @returns An LLM instance that works with the AI SDK
   * @throws Error if the provider is not supported
   */
  static create(config: LLMConfig): LLM {
    switch (config.provider) {
      case LLMProvider.OPENAI: {
        const openaiConfig = config as OpenAIModelConfiguration;

        // Create the OpenAI model instance using the provider factory
        // Pass model ID (string) first, then settings (only valid ones)
        const openaiInstance = openaiProvider(
          openaiConfig.model, // Pass model string directly
          {
            // apiKey, organization, apiVersion, baseURL removed
            // These are likely handled by provider config/env vars
          },
        );

        // Pass the instance and config to the LLM wrapper
        return new ModularAILLM(openaiInstance, openaiConfig);
      }

      case LLMProvider.ANTHROPIC: {
        const anthropicConfig = config as AnthropicModelConfiguration;

        // Create the Anthropic model instance
        // Pass model ID (string) first, then settings (only valid ones)
        const anthropicInstance = anthropicProvider(
          anthropicConfig.model, // Pass model string directly
          {
            // apiKey, baseURL removed
            // These are likely handled by provider config/env vars
          },
        );

        // Pass the instance and config to the LLM wrapper
        return new ModularAILLM(anthropicInstance, anthropicConfig);
      }

      case LLMProvider.GOOGLE: {
        const googleConfig = config as GoogleModelConfiguration;

        // Create the Google model instance
        // Pass model ID (string) first, then settings (only valid ones)
        const googleInstance = googleProvider(
          googleConfig.model, // Pass model string directly
          {
            // apiKey, apiVersion removed
            // These are likely handled by provider config/env vars
          },
        );

        // Pass the instance and config to the LLM wrapper
        return new ModularAILLM(googleInstance, googleConfig);
      }

      default: {
        // Exhaustiveness check: If config reaches here, it's 'never'
        // because all known providers are handled above.
        // The previous error was likely due to errors within the cases.
        const _exhaustiveCheck: never = config;
        throw new Error(`Unsupported LLM provider: ${_exhaustiveCheck}`);
      }
    }
  }
}
