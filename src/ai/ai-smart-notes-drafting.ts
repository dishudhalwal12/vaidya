'use server';

import { getGenerativeModel } from '@/ai/google-genai';

export async function aiSmartNotesDrafting({ patientData }: { patientData: string }) {
    const model = await getGenerativeModel();

    const prompt = `You are an AI assistant that helps doctors draft progress notes. Given the patient data, generate suggestions for the assessment and plan sections of the note.

    Patient Data:
    ${patientData}

    Respond in JSON format with keys: "assessmentSuggestion" and "planSuggestion".`;

    try {
        console.info("Using model:", model.model);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/{[\s\S]*}/);
        if (jsonMatch) {
            const jsonString = jsonMatch[0];
            const parsed = JSON.parse(jsonString);
            if (parsed.assessmentSuggestion && parsed.planSuggestion) {
                 return {
                    ...parsed,
                    progress: 'Generated assessment and plan suggestions.'
                 };
            }
        }
        console.error("AI response missing or malformed JSON payload:", text);
        throw new Error('Failed to get a valid JSON response from AI for smart notes');
    } catch (e) {
        console.error("AI smart notes generation failed:", e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        throw new Error(`Failed to get smart notes from AI. Reason: ${errorMessage}`);
    }
}
