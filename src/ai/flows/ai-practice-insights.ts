'use server';

import { getGenerativeModel } from '@/ai/google-genai';

type ReportInput = {
    timePeriod: 'daily' | 'weekly',
    clinicName: string,
    patients: any[],
    tasks: any[],
}

export async function generatePracticeInsightsReport(input: ReportInput) {
    const model = await getGenerativeModel();

    const prompt = `You are a brilliant data analyst AI for a medical clinic. Your task is to generate a practice insights report. Analyze the provided JSON data for patients and tasks to identify meaningful trends and generate actionable insights.

    Here is the data for your analysis:
    - Time Period for Report: ${input.timePeriod}
    - Clinic Name: ${input.clinicName}
    - Patient Data: ${JSON.stringify(input.patients, null, 2)}
    - Task Data: ${JSON.stringify(input.tasks, null, 2)}
    
    Current Date: ${new Date().toISOString()}

    Generate a report using markdown format. The report must include the following sections:
    1.  **Executive Summary:** A brief, high-level overview of the key findings for the ${input.timePeriod}.
    2.  **Patient & Revenue Analysis:**
        *   Calculate total revenue for the period (sum of 'consultationFee').
        *   Identify the number of new patients ('status: New').
        *   Analyze the breakdown of visit types ('visitType: OPD vs. Emergency').
        *   Highlight the top revenue sources based on visit types.
    3.  **Task & Staff Performance:**
        *   Calculate the number of tasks completed vs. pending ('status: Completed' vs. 'To Do'/'In Progress').
        *   Identify any overdue tasks (compare 'dueDate' with the current date).
        *   Mention which staff members ('assignee') have the most open tasks.
    4.  **Actionable Insights & Recommendations:** Based on your analysis, provide 2-3 specific, actionable recommendations. For example, if many tasks are pending for one staff member, suggest rebalancing workload. If OPD visits are low, suggest a marketing campaign.
    
    Be concise, data-driven, and professional in your output.`;
    
    try {
        console.info("Using model:", model.model);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return { report: text };
    } catch(e) {
        console.error("AI practice insights generation failed:", e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        throw new Error(`Failed to generate practice insights from AI. Reason: ${errorMessage}`);
    }
}
