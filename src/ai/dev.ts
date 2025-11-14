'use server';
/**
 * @fileOverview This file is the entry point for the Genkit development server.
 *
 * NOTE: As of a recent refactor, all AI capabilities now bypass Genkit and use the
 * `@google/generative-ai` SDK directly for stability and robust model selection. 
 * This dev server is no longer used for the core AI logic.
 */
import { config } from 'dotenv';
config();

// The following imports are commented out as they have been refactored to use the direct SDK.
// import '@/ai/flows/ai-coding-assistance.ts';
// import '@/ai/flows/ai-reception-assistant.ts';
// import '@/ai/flows/ai-practice-insights.ts';
// import '@/ai/flows/ai-diagnostic-assistant.ts';
// import '@/ai/flows/ai-diagnostic-chat.ts';

console.log("Genkit dev server started. Note: All AI flows now use the Google Generative AI SDK directly and are not registered with Genkit.");
