#!/usr/bin/env node

/**
 * AI SDK Testing Script
 * 
 * This script tests the different AI SDKs to verify their API methods
 * and response formats. It helps identify the correct usage patterns.
 */

import { openai as openaiProvider } from '@ai-sdk/openai';
import { anthropic as anthropicProvider } from '@ai-sdk/anthropic';
import { google as googleProvider } from '@ai-sdk/google';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Enable or disable specific providers
const PROVIDERS = {
  OPENAI: true,
  ANTHROPIC: true,
  GOOGLE: true
};

/**
 * Utility function to inspect an object and its methods
 * @param {Object} obj The object to inspect
 * @param {string} name The name of the object for logging
 */
function inspectObject(obj, name) {
  console.log(`\n==== Inspecting ${name} ====`);
  console.log('Type:', typeof obj);
  console.log('Constructor:', obj.constructor?.name);
  
  // Get prototype methods
  const prototypeMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(obj) || {});
  console.log('\nPrototype methods:', prototypeMethods);
  
  // Get own properties and methods
  const ownProps = Object.getOwnPropertyNames(obj);
  console.log('\nOwn properties:', ownProps);
  
  // Check for functions
  console.log('\nFunctions:');
  for (const key of ownProps) {
    const value = obj[key];
    if (typeof value === 'function') {
      console.log(`- ${key}: function`);
    }
  }
  
  // Check for objects (potential sub-APIs)
  console.log('\nObjects:');
  for (const key of ownProps) {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      console.log(`- ${key}: object`);
    }
  }
}

/**
 * Test OpenAI SDK
 */
async function testOpenAI() {
  if (!PROVIDERS.OPENAI) return;
  
  console.log('\n============= TESTING OPENAI SDK =============');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY not provided');
    return;
  }
  
  try {
    // Inspect the provider
    inspectObject(openaiProvider, 'openaiProvider');
    
    // Create the model instance
    const model = openaiProvider.chat({
      apiKey,
      model: 'gpt-4o',
    });
    
    // Inspect the model instance
    inspectObject(model, 'openaiModel');
    
    // Try to find a method to generate completions
    console.log('\nTrying to generate a completion...');
    
    // Try different possible methods
    try {
      if (typeof model.run === 'function') {
        console.log('Using model.run()...');
        const result = await model.run({
          messages: [{ role: 'user', content: 'Hello, world!' }]
        });
        console.log('Result type:', typeof result);
        console.log('Result:', result);
      } else {
        console.log('model.run is not available');
      }
    } catch (error) {
      console.error('Error with run():', error.message);
    }
    
    try {
      if (typeof model.generateContent === 'function') {
        console.log('Using model.generateContent()...');
        const result = await model.generateContent({
          messages: [{ role: 'user', content: 'Hello, world!' }]
        });
        console.log('Result type:', typeof result);
        console.log('Result:', result);
      } else {
        console.log('model.generateContent is not available');
      }
    } catch (error) {
      console.error('Error with generateContent():', error.message);
    }
    
  } catch (error) {
    console.error('Error testing OpenAI SDK:', error);
  }
}

/**
 * Test Anthropic SDK
 */
async function testAnthropic() {
  if (!PROVIDERS.ANTHROPIC) return;
  
  console.log('\n============= TESTING ANTHROPIC SDK =============');
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY not provided');
    return;
  }
  
  try {
    // Inspect the provider
    inspectObject(anthropicProvider, 'anthropicProvider');
    
    // Create the model instance
    const model = anthropicProvider.messages({
      apiKey,
      model: 'claude-3-opus-20240229',
    });
    
    // Inspect the model instance
    inspectObject(model, 'anthropicModel');
    
    // Try to find a method to generate completions
    console.log('\nTrying to generate a completion...');
    
    // Try different possible methods
    try {
      if (typeof model.run === 'function') {
        console.log('Using model.run()...');
        const result = await model.run({
          messages: [{ role: 'user', content: 'Hello, world!' }]
        });
        console.log('Result type:', typeof result);
        console.log('Result:', result);
      } else {
        console.log('model.run is not available');
      }
    } catch (error) {
      console.error('Error with run():', error.message);
    }
    
    try {
      if (typeof model.generateContent === 'function') {
        console.log('Using model.generateContent()...');
        const result = await model.generateContent({
          messages: [{ role: 'user', content: 'Hello, world!' }]
        });
        console.log('Result type:', typeof result);
        console.log('Result:', result);
      } else {
        console.log('model.generateContent is not available');
      }
    } catch (error) {
      console.error('Error with generateContent():', error.message);
    }
    
  } catch (error) {
    console.error('Error testing Anthropic SDK:', error);
  }
}

/**
 * Test Google SDK
 */
async function testGoogle() {
  if (!PROVIDERS.GOOGLE) return;
  
  console.log('\n============= TESTING GOOGLE SDK =============');
  
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_API_KEY not provided');
    return;
  }
  
  try {
    // Inspect the provider
    inspectObject(googleProvider, 'googleProvider');
    
    // Create the model instance
    const model = googleProvider.gemini({
      apiKey,
      model: 'gemini-pro',
    });
    
    // Inspect the model instance
    inspectObject(model, 'googleModel');
    
    // Try to find a method to generate completions
    console.log('\nTrying to generate a completion...');
    
    // Try different possible methods
    try {
      if (typeof model.run === 'function') {
        console.log('Using model.run()...');
        const result = await model.run({
          prompt: 'Hello, world!'
        });
        console.log('Result type:', typeof result);
        console.log('Result:', result);
      } else {
        console.log('model.run is not available');
      }
    } catch (error) {
      console.error('Error with run():', error.message);
    }
    
    try {
      if (typeof model.generateContent === 'function') {
        console.log('Using model.generateContent()...');
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: 'Hello, world!' }] }]
        });
        console.log('Result type:', typeof result);
        console.log('Result:', result);
      } else {
        console.log('model.generateContent is not available');
      }
    } catch (error) {
      console.error('Error with generateContent():', error.message);
    }
    
  } catch (error) {
    console.error('Error testing Google SDK:', error);
  }
}

/**
 * Main function to run all tests
 */
async function main() {
  console.log('Starting AI SDK Tests');
  
  await testOpenAI();
  await testAnthropic();
  await testGoogle();
  
  console.log('\n===== Test Completed =====');
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error in main:', error);
});