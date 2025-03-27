import { AIModelType, Provider } from '@/lib/ai';
import { openai as OpenAI } from '@ai-sdk/openai';
import { anthropic as Anthropic } from '@ai-sdk/anthropic';
import { google as GoogleGenerativeAI } from '@ai-sdk/google';
import { LLM, LLMConfig, LLMProvider } from './interface';

class VercelAILLM implements LLM {
  private provider: Provider;
  private config: AIModelType;

  constructor(provider: Provider, config: AIModelType) {
    this.provider = provider;
    this.config = config;
  }

  getModelInstance(): Provider {
    return this.provider;
  }

  getConfig(): AIModelType {
    return this.config;
  }
}

export class LLMFactory {
  /**
   * Create an LLM instance based on the provided configuration
   * @param config The LLM configuration
   * @returns An LLM instance that works with Vercel AI SDK
   * @throws Error if the provider is not supported
   */
  static create(config: LLMConfig): LLM {
    switch (config.provider) {
      case LLMProvider.OPENAI: {
        const openai = OpenAI({
          apiKey: config.apiKey,
          ...config.options,
        });

        return new VercelAILLM(openai, {
          provider: config.provider,
          model: config.model,
          apiKey: config.apiKey,
          ...config.options,
        });
      }

      case LLMProvider.ANTHROPIC: {
        const anthropic = Anthropic({
          apiKey: config.apiKey,
          ...config.options,
        });

        return new VercelAILLM(anthropic, {
          provider: config.provider,
          model: config.model,
          apiKey: config.apiKey,
          ...config.options,
        });
      }

      case LLMProvider.GOOGLE: {
        const googleGenAI = GoogleGenerativeAI({
          apiKey: config.apiKey,
          ...config.options,
        });

        return new VercelAILLM(googleGenAI, {
          provider: config.provider,
          model: config.model,
          apiKey: config.apiKey,
          ...config.options,
        });
      }

      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }
}
