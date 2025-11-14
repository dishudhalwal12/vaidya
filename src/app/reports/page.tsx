"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generatePracticeInsightsReport } from "@/ai/flows/ai-practice-insights";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Patient } from "../patients/page";
import type { Task } from "../tasks/page";

type TimePeriod = 'daily' | 'weekly';

const initialReport = `
### Select a time period and click "Generate Report".

The AI will analyze your clinic's real-time patient and task data to generate insights on:
- **Patient Trends:** New patient volume and popular visit types.
- **Revenue Analysis:** Key revenue sources based on consultation fees.
- **Task & Staff Performance:** An overview of completed vs. pending tasks.
- **Actionable Insights:** AI-driven recommendations to improve clinic operations.
`;

export default function ReportsPage() {
    const [timePeriod, setTimePeriod] = useState<TimePeriod | null>(null);
    const [report, setReport] = useState<string>(initialReport);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { profile } = useUser();
    const firestore = useFirestore();

    // Fetch Patients for context
    const patientsQuery = useMemoFirebase(() => {
        if (!firestore || !profile?.orgId) return null;
        return query(collection(firestore, 'patients'), where('orgId', '==', profile.orgId));
    }, [firestore, profile?.orgId]);
    const { data: patients, isLoading: patientsLoading } = useCollection<Patient>(patientsQuery);

    // Fetch Tasks for context
    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !profile?.orgId) return null;
        return query(collection(firestore, 'tasks'), where('orgId', '==', profile.orgId));
    }, [firestore, profile?.orgId]);
    const { data: tasks, isLoading: tasksLoading } = useCollection<Task>(tasksQuery);


    const handleGenerateReport = async () => {
        if (!timePeriod) {
            toast({
                variant: 'destructive',
                title: 'Selection Required',
                description: 'Please select a time period to generate a report.',
            });
            return;
        }

        setIsLoading(true);
        setReport("");
        try {
            const result = await generatePracticeInsightsReport({
                timePeriod,
                clinicName: profile?.orgName || 'Your Clinic',
                patients: patients || [],
                tasks: tasks || []
            });
            setReport(result.report);
        } catch (error) {
            console.error("Failed to generate report:", error);
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: 'The AI assistant failed to generate the report.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>AI Practice Insights</CardTitle>
                <CardDescription>Generate a daily or weekly report on patient trends, treatment outcomes, marketing performance, and top revenue sources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Select onValueChange={(value: TimePeriod) => setTimePeriod(value)} disabled={isLoading || patientsLoading || tasksLoading}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Select time period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">Daily Report</SelectItem>
                            <SelectItem value="weekly">Weekly Report</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="rounded-lg border bg-muted p-4 min-h-[300px] prose prose-sm max-w-none prose-headings:font-semibold prose-p:m-0 prose-ul:m-0 prose-ol:m-0 prose-li:m-0">
                    {(isLoading || patientsLoading || tasksLoading) ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            <p className="mt-2 text-muted-foreground">
                                {isLoading ? "Generating your report..." : "Loading clinic data..."}
                            </p>
                        </div>
                    ) : (
                        <ReactMarkdown>{report}</ReactMarkdown>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleGenerateReport} disabled={isLoading || patientsLoading || tasksLoading}>
                    {(isLoading || patientsLoading || tasksLoading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Generate Report
                </Button>
            </CardFooter>
        </Card>
    );
}
