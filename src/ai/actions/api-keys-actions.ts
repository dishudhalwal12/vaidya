'use server';

import { saveApiKeyToServer, getApiKeyForEditing } from "@/ai/services/api-key-service";

/**
 * Server Action to retrieve the current API key for the settings page.
 */
export async function getApiKey(): Promise<string> {
    // In a real app, you'd have permissions checks here.
    return await getApiKeyForEditing();
}

/**
 * Server Action to save the API key from the settings page.
 */
export async function saveApiKey(key: string): Promise<void> {
    // In a real app, you'd have permissions checks here.
    await saveApiKeyToServer(key);
}
