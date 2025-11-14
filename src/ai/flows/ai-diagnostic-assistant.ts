'use server';
// src/ai/flows/ai-diagnostic-assistant.ts
import { getGenerativeModel } from "../google-genai";

function normalizeModelId(resolverModel: string): string {
  if (!resolverModel || typeof resolverModel !== "string") {
    throw new Error("Empty or invalid model from resolver");
  }
  // Strip leading "models/" and any leading slashes to get the short ID
  return resolverModel.replace(/^models\//, "").replace(/^\//, "");
}

async function callGenerativeModel(promptText: string) {
  const model = await getGenerativeModel();
  const shortModelId = normalizeModelId(model.model);

  try {
    const result = await model.generateContent({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192, // Increased for detailed reports
            responseMimeType: "application/json",
        }
    });
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    console.error(`AI call failed for model ${shortModelId}:`, e);
    throw new Error(`Model call failed for ${shortModelId}. Reason: ${errorMessage}`);
  }
}

type DiagnosisResult = {
  summary?: string;
  keyAbnormalities?: Array<{ parameter: string; value: string; normalRange: string; interpretation: string; }>;
  potentialDiagnoses?: Array<{ diagnosis: string; confidenceScore?: number; reasoning?: string }>;
  recommendedFollowUps?: Array<{ recommendation: string; priority: string; }>;
  differentialDiagnosis?: Array<{ diagnosis: string; reasoning: string; }>;
  pathophysiologyInsights?: string;
};


// Example usage inside your existing diagnoseHealthReport function
export async function diagnoseHealthReport(reportText: string): Promise<DiagnosisResult> {
  const prompt = `You are a world-class AI diagnostician, embodying the combined expertise of the world's top physicians. Your thinking is not linear; it is a layered, dynamic process of pattern recognition, anomaly hunting, and probability adjustment.

  Your core thought process is as follows:
  1.  **System-Level Scan:** First, broadly determine the primary systems failing or involved (e.g., nervous, immune, metabolic, structural).
  2.  **Anomaly Triangulation:** Do not just match symptoms. Actively hunt for the contradictions and outliers—the clues that don't fit the most obvious pattern. Every piece of data (timing, location, trends) must be weighed for its diagnostic specificity.
  3.  **Dynamic Probability Stack:** As you analyze the report, maintain a mental "probability stack" of hypotheses. Constantly re-rank these hypotheses as new data is processed, discarding any that fail to explain ALL the facts. Your goal is to find the single, unifying story that fits every piece of evidence without contradiction.
  4.  **Final Output:** Your diagnosis is not just a label; it's the solution to a living equation: signs + time + response to treatment = truth.

  With this mindset, analyze the following health report. Generate a structured JSON object with the following keys, adhering strictly to the schema. Your reasoning should reflect your deep, multi-layered analysis.

  - "summary": (string) A concise, clinical summary of the patient's presentation, key findings, and primary diagnosis.
  - "keyAbnormalities": (Array of objects) List of critical abnormal findings. Each object must have:
    - "parameter": (string) The name of the finding (e.g., "TSH").
    - "value": (string) The reported value (e.g., "<0.005 mIU/L").
    - "normalRange": (string) The normal range for the parameter (e.g., "0.4-4.0 mIU/L").
    - "interpretation": (string) A brief clinical interpretation of the abnormality.
    *This MUST be an array, even if there is only one item. If none, return an empty array [].*
  - "potentialDiagnoses": (Array of objects) A list of possible diagnoses, ranked by confidence. Each object must have:
    - "diagnosis": (string) The name of the condition (e.g., "Graves' Disease").
    - "confidenceScore": (number) A numerical confidence score from 0.0 to 1.0 (e.g., 0.98). *This MUST be a number, not a string.*
    - "reasoning": (string) Brief justification for the diagnosis based on report findings.
    *This MUST be an array, even if there is only one item.*
  - "differentialDiagnosis": (Array of objects) A list of alternative diagnoses that were considered and why they are less likely. Each object must have:
    - "diagnosis": (string) The alternative diagnosis.
    - "reasoning": (string) Why this is less likely than the primary diagnosis.
    *This MUST be an array.*
  - "pathophysiologyInsights": (string) A deep insight into the underlying biological mechanisms of the primary diagnosis, connecting the patient's symptoms to the disease process.
  - "recommendedFollowUps": (Array of objects) Actionable next steps. Each object must have:
    - "recommendation": (string) The specific test, consult, or treatment.
    - "priority": (string, one of "High", "Medium", "Low") The urgency.
    *This MUST be an array.*

  Health Report:
  ${reportText}

  Return ONLY a valid JSON object. Do not include any introductory text or markdown formatting.`;

  try {
    const aiResultText = await callGenerativeModel(prompt);
    
    // The model is now configured to return JSON directly
    const parsed = JSON.parse(aiResultText);
    return parsed as DiagnosisResult;

  } catch (e) {
    console.error("AI diagnosis failed:", e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to get diagnosis from AI. Reason: ${errorMessage} (See server logs for chosen model)`);
  }
}

export async function askDiagnosticQuestion(
  reportText: string,
  question: string,
  chatHistory: Array<{role: 'user' | 'model', parts: {text: string}[]}>,
  diagnosisContext?: string,
) {
  try {
    // Use the robust getGenerativeModel to avoid 404 errors
    const model = await getGenerativeModel();

    const history = [
        {
            role: "user" as const,
            parts: [{ text: `You are an expert AI clinical assistant. Your knowledge is based on the following health report and initial diagnosis. Answer the user's questions concisely and accurately based *only* on this context.\n\n## Original Health Report:\n${reportText}\n\n## Initial Diagnosis Context:\n${diagnosisContext || 'N/A'}\n---` }],
        },
        {
            role: "model" as const,
            parts: [{ text: "I have reviewed the report and the initial diagnosis. I am ready to answer your follow-up questions about this specific case." }],
        },
        ...chatHistory
    ];

    const chat = model.startChat({
        history,
        generationConfig: {
            maxOutputTokens: 1000,
        }
    });

    const result = await chat.sendMessage(question);
    const response = await result.response;
    return { answer: response.text() };
  } catch (e) {
      console.error("AI chat question failed:", e);
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      throw new Error(`Failed to get answer from AI. Reason: ${errorMessage}`);
  }
}
