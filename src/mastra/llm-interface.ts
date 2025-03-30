/**
 * Custom interface for language models used by the Mastra agent components.
 */

// Import the actual instance type definition from the library's interface
import { LLMInstance } from '../lib/mastra/llm/interface';

/**
 * Response from a language model completion.
 * Note: This might need adjustment based on the actual structure returned
 * by the different clients' completion methods.
 */
export interface CompletionResponse {
  content: string;
  // Add other common fields if needed, or handle variations
  [key: string]: unknown; // Allow for provider-specific fields, using unknown for type safety
}

/**
 * Interface for the language model client instance expected by Mastra components.
 * Re-exporting the type from the library's interface file.
 */
export type LanguageModel = LLMInstance;

// Keep CompletionResponse definition if it's used, otherwise remove.
// For now, assuming it might be used by the agent/workflow manager later.
