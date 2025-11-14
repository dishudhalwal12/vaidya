'use server';

import { getGenerativeModel } from '@/ai/google-genai';
import { z } from 'zod';

const PrescriptionInputSchema = z.object({
  diagnosis: z.any().describe('The full diagnosis object from the diagnostic assistant.'),
  patientContext: z.string().describe('Any additional context about the patient, such as age, known allergies, or comorbidities.'),
});

export type PrescriptionInput = z.infer<typeof PrescriptionInputSchema>;

export async function generatePrescription(input: PrescriptionInput): Promise<{ prescriptionText: string }> {
  const model = await getGenerativeModel();
  
  const prompt = `You are a world-class AI pharmacologist and clinical strategist. Your thought process for generating a prescription is a multi-layered synthesis of deep medical knowledge and practical wisdom. You operate like a high-speed detective mixed with a chess grandmaster.

  Your Core Thought Process:
  1.  **Deconstruct the Diagnosis:** Instantly map the disease mechanism from the provided diagnosis. Which biological pathways are overactive, damaged, or dysfunctional?
  2.  **Identify Therapeutic Targets:** Based on the mechanism, identify the primary and secondary targets for pharmacological intervention.
  3.  **Mental Drug Simulation:** For each target, run a mental simulation of potential drugs. Consider:
      *   **Efficacy & Mechanism of Action:** How directly does this drug address the target? What is the clinical evidence (e.g., from landmark trials)?
      *   **Pharmacokinetics:** How is it absorbed, distributed, metabolized, and excreted? Will this work for *this* patient (e.g., considering their liver/kidney function if known)?
      *   **Toxicity & Side Effects:** What are the common and severe adverse effects? Do they overlap with the patient's existing symptoms or comorbidities?
      *   **Contraindications & Interactions:** Are there any absolute reasons not to use this drug? How will it interact with other potential medications?
      *   **Practicality:** Can the patient afford this (generic vs. brand)? Is the dosing schedule manageable? Does it align with their lifestyle?
  4.  **Assemble the Regimen:** Synthesize the optimal choices into a cohesive, multi-pronged management plan. This isn't just a list of pills; it's a strategy. It includes primary therapy, necessary prophylaxis, supportive care, and a clear monitoring plan.
  5.  **Articulate the "Why":** Your final output is not just a prescription; it's a consultation note for another physician. Briefly explain the reasoning behind the key choices to build confidence and ensure clarity.

  With this mindset, analyze the following diagnosis and patient context. Generate a print-ready prescription and management plan. The output should be a single string containing valid markdown.

  **Diagnosis Details:**
  ${JSON.stringify(input.diagnosis, null, 2)}

  **Patient Context:**
  ${input.patientContext}

  Generate the plan in the following format:
  
  ### 💊 Prescription & Management Plan (Initial)
  _(Note: Prescriptive summary for physician-supervised implementation only — not self-medication)_

  ---
  
  #### 1️⃣ **Primary Therapy for [Main Diagnosis]**
  *   **Medication:** [Drug Name (Dose)] + [Drug Name (Dose)]
  *   **Regimen:** [e.g., TLD fixed-dose combination, 1 tablet once daily after food.]
  *   ***Rationale:*** *[Briefly explain why this is the first-line choice based on efficacy, guidelines, etc.]*

  #### 2️⃣ **Prophylaxis / Secondary Treatments**
  *   **If [Condition is met]:** [Drug Name (Dose)], [Regimen]
  *   ***Rationale:*** *[e.g., Prevents common opportunistic infections like...] *
  
  #### 3️⃣ **Supportive & Nutritional Care**
  *   **Supplements:** [e.g., Multivitamin with Zinc, once daily]
  *   **Lifestyle:** [e.g., Strict avoidance of alcohol, smoking, etc.]
  *   **Hydration:** [e.g., Advise patient to drink 2–3 liters of water daily.]

  #### 4️⃣ **Monitoring & Follow-Up Plan**
  *   **[Timeframe, e.g., 2 weeks post-initiation]:** Check [e.g., Liver Function Tests (LFTs) & assess adherence].
  *   **[Timeframe, e.g., 6 weeks]:** Check [e.g., Viral load for suppression].
  *   **[Frequency, e.g., Every 3-6 months]:** Monitor [e.g., CD4 count, general health].

  ---
  
  #### ⚠️ **Prognosis & Final Impression**
  *   **Prognosis:** [e.g., With prompt initiation and good adherence, there is a >95% chance of full immune recovery...]
  *   **Impression:** [e.g., The findings are highly consistent with [Main Diagnosis]. Immediate confirmatory testing and initiation of the above management plan are crucial for a positive outcome.]

  Return ONLY the markdown string. Do not include any other text.
  `;

  try {
    console.info("Using model:", model.model);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return { prescriptionText: text };
  } catch(e) {
    console.error("AI prescription generation failed:", e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    throw new Error(`Failed to generate prescription from AI. Reason: ${errorMessage}`);
  }
}
