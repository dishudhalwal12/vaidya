"use client"

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { suggestCodes, type CodingAssistanceOutput } from "@/ai/flows/ai-coding-assistance";
import { Loader2, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";


export default function BillingPage() {
    const [visitNotes, setVisitNotes] = useState("Patient is a 58-year-old male with a history of hypertension and type 2 diabetes, presenting for a 3-month follow-up. Reports occasional headaches and fatigue. BP is 145/90, and recent A1c was 7.8%. Physical exam is otherwise unremarkable. Assessment: Uncontrolled hypertension, poorly controlled type 2 diabetes.");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<CodingAssistanceOutput | null>(null);
    const { toast } = useToast();

    const handleSuggestCodes = async () => {
        if (!visitNotes.trim()) {
            toast({
                variant: 'destructive',
                title: 'Input Required',
                description: 'Please enter visit notes before suggesting codes.',
            });
            return;
        }

        setIsLoading(true);
        setResult(null);
        try {
            const output = await suggestCodes({ visitNotes });
            setResult(output);
        } catch (error) {
            console.error("Error suggesting codes:", error);
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: 'Failed to get suggestions from the AI assistant.',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Claims & Coding Assistant</CardTitle>
                    <CardDescription>
                        Use AI to map visit notes to ICD/CPT codes. The AI provides confidence scores and a change history for audit purposes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        placeholder="Paste patient visit notes here..."
                        className="min-h-[200px]"
                        value={visitNotes}
                        onChange={(e) => setVisitNotes(e.target.value)}
                    />
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSuggestCodes} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Suggest Codes
                    </Button>
                </CardFooter>
            </Card>

            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle>AI Suggestions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Confidence</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {result.suggestedCodes.map((code, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-mono">{code.code}</TableCell>
                                        <TableCell>{(code.confidenceScore * 100).toFixed(0)}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {result.changeHistory && (
                             <Alert className="mt-4">
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Change History</AlertTitle>
                                <AlertDescription className="prose prose-sm max-w-none">
                                    <ReactMarkdown>{result.changeHistory}</ReactMarkdown>
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

    