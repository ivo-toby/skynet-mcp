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

        // Get the API key from config or environment
        const apiKey = openaiConfig.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OpenAI API key not provided');
        }
        
        // Create the OpenAI model instance using the provider factory
        const openaiInstance = openaiProvider.chat({
          apiKey,
          model: openaiConfig.model,
          ...openaiConfig.options,
        });

        // Pass the instance and config to the LLM wrapper
        return new ModularAILLM(openaiInstance, openaiConfig);
      }

      case LLMProvider.ANTHROPIC: {
        const anthropicConfig = config as AnthropicModelConfiguration;

        // Get the API key from config or environment
        const apiKey = anthropicConfig.apiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error('Anthropic API key not provided');
        }
        
        // Create the Anthropic model instance
        const anthropicInstance = anthropicProvider.messages({
          apiKey,
          model: anthropicConfig.model,
          ...anthropicConfig.options,
        });

        // Pass the instance and config to the LLM wrapper
        return new ModularAILLM(anthropicInstance, anthropicConfig);
      }

      case LLMProvider.GOOGLE: {
        const googleConfig = config as GoogleModelConfiguration;

        // Get the API key from config or environment
        const apiKey = googleConfig.apiKey || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          throw new Error('Google API key not provided');
        }
        
        // Create the Google model instance
        const googleInstance = googleProvider.gemini({
          apiKey,
          model: googleConfig.model,
          ...googleConfig.options,
        });

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
