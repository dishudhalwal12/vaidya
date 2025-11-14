'use server';

/**
 * @fileoverview Service for managing the Google AI API key.
 *
 * This service handles fetching and updating the API key, reading from and
 * writing to environment variables for the current server process.
 */

/**
 * Retrieves the API key for display/management in the UI.
 * @returns The current primary API key.
 */
export async function getApiKeyForEditing(): Promise<string> {
    return process.env.GOOGLE_API_KEY || '';
}

/**
 * Saves the API key. In a real-world scenario, this would write to a secure
 * vault or a .env file and require a server restart.
 * This is a placeholder for a more robust implementation.
 * @param key The API key string.
 */
export async function saveApiKeyToServer(key: string): Promise<void> {
    // This is a simulation. In a real app, you would need a secure way
    // to update environment variables and likely restart the server process.
    // For this prototype, we can't update process.env at runtime effectively
    // across all server instances, but this simulates it for the current process.
    console.log('API key "saved" on the server (simulation). A server restart would be needed to apply it consistently.');
    if (key) {
      process.env.GOOGLE_API_KEY = key;
    }
}
