
'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { resolveModel } from "./genai-model-resolver";
import { getApiKey as getApiKeyFromServer } from "./actions/api-keys-actions";

/**
 * Return a new SDK client instance.
 * Exported as an async function (safe for "use server" context).
 */
export async function createGenaiClient(apiKey?: string) {
  const key = apiKey || await getApiKeyFromServer();
  if (!key) {
    console.warn("Warning: GOOGLE_API_KEY not configured in server environment.");
  }
  return new GoogleGenerativeAI(key);
}

/**
 * Return a model instance for calling generateContent.
 * This function now uses the robust model resolver to avoid 404s and correctly pick a model.
 * Always call this inside an async server action / API handler.
 */
export async function getGenerativeModel(options?: { apiKey?: string; [key: string]: any }) {
    const apiKey = options?.apiKey || await getApiKeyFromServer();
    if (!apiKey) {
      throw new Error("Could not get a valid generative model. API key is missing.");
    }
    const client = new GoogleGenerativeAI(apiKey);
    try {
        const resolved = await resolveModel(apiKey);
        // The resolver returns a fully-qualified model name like "models/gemini-2.5-flash-..."
        // We need to use just the ID part.
        const modelId = resolved.model.startsWith('models/') ? resolved.model.substring('models/'.length) : resolved.model;
        
        // Filter out the custom apiKey option before passing to the SDK
        const { apiKey: _, ...restOptions } = options || {};
        return client.getGenerativeModel({ model: modelId, ...restOptions });

    } catch (e) {
        console.error("Failed to resolve or get a generative model:", e);
        // Re-throw to make sure the calling function knows about the failure.
        throw new Error(`Could not get a valid generative model. ${e instanceof Error ? e.message : ''}`);
    }
}
