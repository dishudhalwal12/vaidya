'use server';

import { getGenerativeModel } from '@/ai/google-genai';
import { z } from 'zod';

const GenerateInvoiceInputSchema = z.object({
  consultationNotes: z.string().describe('Detailed notes from the patient consultation, including services provided and medications prescribed.'),
  patientName: z.string().describe('The name of the patient.'),
  patientId: z.string().describe('Unique identifier for the patient.'),
  dateOfService: z.string().describe('The date the service was provided (e.g., YYYY-MM-DD).'),
  clinicName: z.string().describe('The name of the clinic.'),
  providerName: z.string().describe('The name of the healthcare provider.'),
});

export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceInputSchema>;

export async function generateInvoice(input: GenerateInvoiceInput) {
  const model = await getGenerativeModel();

  const prompt = `You are an AI assistant designed to automatically generate invoices based on consultation notes.

  Based on the following consultation details, generate an invoice with appropriate services, CPT codes, and fictional but realistic pricing.
  Ensure all fields from the input are included in the output.
  Use today's date as the invoiceDate.
  Set the paymentDueDate to be 30 days from today.
  Generate a unique invoiceNumber.

  Consultation Notes: ${input.consultationNotes}
  Patient Name: ${input.patientName}
  Patient ID: ${input.patientId}
  Date of Service: ${input.dateOfService}
  Clinic Name: ${input.clinicName}
  Provider Name: ${input.providerName}

  Respond in a valid JSON format. The root object should contain keys for: invoiceNumber, invoiceDate, patientName, patientId, dateOfService, clinicName, providerName, services (an array of objects with description, code, and price), totalAmount, and paymentDueDate.`;

  try {
    console.info("Using model:", model.model);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/{[\s\S]*}/);
    if (jsonMatch) {
      const jsonString = jsonMatch[0];
      const parsed = JSON.parse(jsonString);
      if (parsed.invoiceNumber && parsed.totalAmount && Array.isArray(parsed.services)) {
        return parsed;
      }
    }
    console.error("AI response missing or malformed JSON payload:", text);
    throw new Error('Failed to get a valid JSON response structure from AI for billing');
  } catch (e) {
    console.error("AI billing generation failed:", e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    throw new Error(`Failed to generate invoice from AI. Reason: ${errorMessage}`);
  }
}
