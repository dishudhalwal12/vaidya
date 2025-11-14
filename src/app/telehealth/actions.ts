
'use server';

import { getGenerativeModel } from "@/ai/google-genai";

/**
 * Transcribes audio and generates a SOAP note using Gemini.
 * @param audioBase64 The Base64-encoded audio data.
 * @param mimeType The MIME type of the audio.
 * @param apiKey The Google API key.
 * @returns A SOAP note generated from the audio transcript.
 */
export async function transcribeAndSummarize(
  audioBase64: string,
  mimeType: string,
  apiKey: string,
): Promise<{ note: string; error?: string }> {
  try {
    // getGenerativeModel will dynamically resolve the best available model.
    const model = await getGenerativeModel({ apiKey });

    const audioPart = {
      inlineData: {
        data: audioBase64,
        mimeType,
      },
    };

    const prompt = `You are an expert medical scribe. Listen to the following doctor-patient consultation and generate a concise but comprehensive SOAP note.

    Format the output as follows:
    
    ### S (Subjective)
    - Patient's chief complaint and history of present illness.
    
    ### O (Objective)
    - Key observations from the conversation.
    
    ### A (Assessment)
    - Your primary and differential diagnoses.
    
    ### P (Plan)
    - Recommended tests, treatments, and follow-up actions.
    
    Here is the consultation audio:`;

    const result = await model.generateContent([prompt, audioPart]);
    const response = await result.response;
    const text = response.text();
    
    return { note: text };

  } catch (error) {
    console.error('Error with Gemini transcription:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown server error occurred.';
    return {
      note: '',
      error: `Failed to transcribe and summarize audio. ${errorMessage}`,
    };
  }
}
