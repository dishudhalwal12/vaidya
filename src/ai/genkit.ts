/**
 * @fileoverview This file contains the core Genkit configuration.
 *
 * NOTE: As of the recent refactor, all AI flows are bypassing Genkit and using the
 * `@google/generative-ai` SDK directly. This is to ensure stability and avoid
 * model resolution issues by allowing for dynamic model selection.
 *
 * This file is being kept for any potential future use but is no longer the central
 * point for AI model interactions in this application.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_API_KEY || '',
    }),
  ],
});
