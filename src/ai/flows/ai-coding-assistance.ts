'use server';

import { getGenerativeModel } from '@/ai/google-genai';

export type CodingAssistanceOutput = {
    suggestedCodes: { code: string; confidenceScore: number }[];
    changeHistory?: string;
}

export async function suggestCodes({ visitNotes }: { visitNotes: string }): Promise<CodingAssistanceOutput> {
    const model = await getGenerativeModel();

    const prompt = `You are an AI assistant specialized in medical coding. Given the following patient visit notes, suggest relevant ICD-10/CPT codes with confidence scores.

    Visit Notes:
    ${visitNotes}
    
    Output the suggested codes in a valid JSON format with a root object containing a "suggestedCodes" key, which is an array of objects. Each object should have "code" and "confidenceScore" (a number between 0 and 1) keys. For example: {"suggestedCodes": [{"code": "I10", "confidenceScore": 0.95}]}.`;

    try {
        console.info("Using model:", model.model);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/{[\s\S]*}/);
        if (jsonMatch) {
            const jsonString = jsonMatch[0];
            const parsed = JSON.parse(jsonString);
            if (Array.isArray(parsed.suggestedCodes)) {
                return parsed;
            }
        }
        console.error("AI response missing or malformed JSON payload:", text);
        throw new Error('Failed to get a valid JSON structure from AI for coding assistance');
    } catch (e) {
        console.error("AI coding assistance failed:", e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        throw new Error(`Failed to get code suggestions from AI. Reason: ${errorMessage}`);
    }
}
