
"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, SendHorizonal, ListChecks, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { aiReceptionAssistant } from "@/ai/flows/ai-reception-assistant";
import ReactMarkdown from "react-markdown";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { Patient } from "@/app/patients/page";
import type { Task } from "@/app/tasks/page";
import { Checkbox } from "@/components/ui/checkbox";

type ChecklistItems = {
    reportCollected: boolean;
    paymentCompleted: boolean;
    patientUpdated: boolean;
    investigationScheduled: boolean;
}

type QueueItem = {
    id: string; // Patient ID
    token: string;
    name: string;
    type: "Appointment" | "Walk-In";
    status: "Waiting" | "In Consult" | "Finished";
    eta: string;
    checklist: ChecklistItems;
};

type ChatMessage = {
    role: 'user' | 'ai';
    text: string;
};

const initialMessages: ChatMessage[] = [
    { role: 'ai', text: "How can I help you today? I can manage the patient queue and handle staff tasks." },
];

function transformPatientToQueueItem(patient: Patient, index: number): QueueItem {
    return {
        id: patient.id,
        token: `A-${index + 1}`,
        name: patient.name,
        type: 'Appointment',
        status: 'Waiting',
        eta: `${5 * (index + 1)} min`,
        checklist: {
            reportCollected: false,
            paymentCompleted: false,
            patientUpdated: false,
            investigationScheduled: false,
        }
    };
}

export default function ReceptionPage() {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const { profile } = useUser();
    const firestore = useFirestore();

    // Fetch Patients for Queue
    const patientsQuery = useMemoFirebase(() => {
        if (!firestore || !profile?.orgId) return null;
        return query(collection(firestore, 'patients'), where('orgId', '==', profile.orgId));
    }, [firestore, profile?.orgId]);
    const { data: patients, isLoading: patientsLoading } = useCollection<Patient>(patientsQuery);

    // Fetch Tasks for AI Context
    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !profile?.orgId) return null;
        return query(collection(firestore, 'tasks'), where('orgId', '==', profile.orgId));
    }, [firestore, profile?.orgId]);
    const { data: tasks, isLoading: tasksLoading } = useCollection<Task>(tasksQuery);


    useEffect(() => {
        if (patients) {
            const liveQueue = patients.map(transformPatientToQueueItem);
            setQueue(liveQueue);
        }
    }, [patients]);

    const handleChecklistChange = (patientId: string, item: keyof ChecklistItems, checked: boolean) => {
        setQueue(prevQueue => 
            prevQueue.map(p => 
                p.id === patientId 
                    ? { ...p, checklist: { ...p.checklist, [item]: checked } } 
                    : p
            )
        );
    };


    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const newMessages: ChatMessage[] = [...messages, { role: 'user', text: input }];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            const result = await aiReceptionAssistant({
                query: input,
                currentQueue: queue,
                currentTasks: tasks || [],
            });
            
            setMessages(prev => [...prev, { role: 'ai', text: result.response }]);

            if (result.updatedQueue) {
                setQueue(result.updatedQueue);
                toast({
                    title: "Queue Updated",
                    description: "The patient queue has been modified by the AI assistant.",
                });
            }

        } catch (error) {
            console.error("AI Reception Assistant Error:", error);
            const errorMessage = error instanceof Error ? error.message : 'The AI assistant failed to process the request.';
            toast({
                variant: 'destructive',
                title: 'AI Error',
                description: errorMessage,
            });
            setMessages(prev => [...prev, { role: 'ai', text: `I'm sorry, I encountered an error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>AI Reception Assistant</CardTitle>
                    <CardDescription>A conversational copilot for managing queues and tasks.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col h-[70vh]">
                    <ScrollArea className="flex-grow space-y-4 pr-4">
                        {messages.map((message, index) => (
                             <div key={index} className={`flex gap-3 my-4 text-gray-600 text-sm flex-1 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                {message.role === 'ai' && (
                                     <span className="relative flex shrink-0 overflow-hidden rounded-full w-8 h-8">
                                        <div className="rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">AI</div>
                                    </span>
                                )}
                                <div className={`leading-relaxed p-3 rounded-lg prose prose-sm max-w-none ${message.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'bg-muted'}`}>
                                    <span className="block font-bold text-gray-700 not-prose">{message.role === 'ai' ? 'Vaidya AI' : 'You'}</span> 
                                    <ReactMarkdown>{message.text}</ReactMarkdown>
                                </div>
                                 {message.role === 'user' && (
                                     <span className="relative flex shrink-0 overflow-hidden rounded-full w-8 h-8">
                                        <div className="rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs">U</div>
                                    </span>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                             <div className="flex gap-3 my-4 text-gray-600 text-sm flex-1">
                                <span className="relative flex shrink-0 overflow-hidden rounded-full w-8 h-8">
                                    <div className="rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">AI</div>
                                </span>
                                <p className="leading-relaxed p-3 rounded-lg bg-muted">
                                   <Loader2 className="w-4 h-4 animate-spin" />
                                </p>
                            </div>
                        )}
                    </ScrollArea>
                    <div className="flex items-center gap-2 pt-4">
                        <Input 
                            placeholder="e.g., 'Create a task to call Mrs. Smith about her results'"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            disabled={isLoading}
                        />
                        <Button size="icon" onClick={handleSendMessage} disabled={isLoading}>
                            <SendHorizonal className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <div className="lg:col-span-4 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Patient Queue & Staff Controller</CardTitle>
                        <CardDescription>Real-time queue and staff checklist for today's patients.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Report</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead>Investigation</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {patientsLoading && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!patientsLoading && queue.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            No patients in the queue.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!patientsLoading && queue.map(p => (
                                    <TableRow key={p.token}>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={p.status === 'In Consult' ? 'destructive' : p.status === 'Finished' ? 'outline' : 'secondary'}>{p.status}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Checkbox
                                                checked={p.checklist.reportCollected}
                                                onCheckedChange={(checked) => handleChecklistChange(p.id, 'reportCollected', !!checked)}
                                                aria-label="Report Collected"
                                            />
                                        </TableCell>
                                         <TableCell>
                                            <Checkbox
                                                checked={p.checklist.paymentCompleted}
                                                onCheckedChange={(checked) => handleChecklistChange(p.id, 'paymentCompleted', !!checked)}
                                                aria-label="Payment Completed"
                                            />
                                        </TableCell>
                                         <TableCell>
                                            <Checkbox
                                                checked={p.checklist.patientUpdated}
                                                onCheckedChange={(checked) => handleChecklistChange(p.id, 'patientUpdated', !!checked)}
                                                aria-label="Patient Updated"
                                            />
                                        </TableCell>
                                         <TableCell>
                                            <Checkbox
                                                checked={p.checklist.investigationScheduled}
                                                onCheckedChange={(checked) => handleChecklistChange(p.id, 'investigationScheduled', !!checked)}
                                                aria-label="Investigation Scheduled"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ListChecks /> Clinic Tasks</CardTitle>
                        <CardDescription>Live overview of tasks assigned to staff.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Due</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {tasksLoading && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                )}
                                {!tasksLoading && (!tasks || tasks.length === 0) && (
                                     <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            No tasks found.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {tasks?.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.title}</TableCell>
                                        <TableCell>{task.assignee}</TableCell>
                                        <TableCell><Badge variant={task.status === 'Completed' ? 'outline' : 'secondary'}>{task.status}</Badge></TableCell>
                                        <TableCell>{task.dueDate}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
