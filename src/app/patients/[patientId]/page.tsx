
'use client';

import * as React from 'react';
import { useState, useRef, ChangeEvent, KeyboardEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, UploadCloud, Bot, AlertTriangle, FileText, FlaskConical, Stethoscope, SendHorizonal, User, Pilcrow, HeartPulse, UserCheck, CalendarDays, Pill, AlertCircle } from 'lucide-react';
import { diagnoseHealthReport, askDiagnosticQuestion } from '@/ai/flows/ai-diagnostic-assistant';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { generatePrescription } from '@/ai/flows/ai-prescription-generator';
import { useDoc, useMemoFirebase } from '@/firebase';
import { doc, type DocumentData } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Patient } from '@/app/patients/page';
import { useParams } from 'next/navigation';

type DiagnosisOutput = {
    summary: string;
    keyAbnormalities: {
        parameter: string;
        value: string;
        normalRange: string;
        interpretation: string;
    }[];
    potentialDiagnoses: {
        diagnosis: string;
        confidenceScore: number;
        reasoning: string;
    }[];
    recommendedFollowUps: {
        recommendation: string;
        priority: 'High' | 'Medium' | 'Low';
    }[];
    differentialDiagnosis?: Array<{ diagnosis: string; reasoning: string; }>;
    pathophysiologyInsights?: string;
};

type ChatMessage = {
    role: 'user' | 'model';
    parts: { text: string }[];
};

type StoredDiagnosis = {
    id: string;
    patientId: string;
    diagnosis: DiagnosisOutput;
    createdAt: string;
}

type Medication = {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  times: { id: string; time: string }[];
  startDate: string;
  endDate: string;
  notes: string;
};

const DIAGNOSIS_STORAGE_KEY = 'vaidya-diagnoses';
const MEDS_STORAGE_KEY = 'vaidya-medications';

function PatientSummaryCard({ patient, patientId }: { patient: Patient | null, patientId: string }) {
    const [lastDiagnosis, setLastDiagnosis] = useState<DiagnosisOutput | null>(null);
    const [activeMedications, setActiveMedications] = useState<Medication[]>([]);

    useEffect(() => {
        if (patientId) {
            // Load last diagnosis from local storage
            try {
                const storedDiagnoses: StoredDiagnosis[] = JSON.parse(localStorage.getItem(`${DIAGNOSIS_STORAGE_KEY}-${patientId}`) || '[]');
                if (storedDiagnoses.length > 0) {
                    // Get the most recent one
                    setLastDiagnosis(storedDiagnoses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].diagnosis);
                }
            } catch (e) { console.error("Failed to load diagnoses from local storage", e); }

            // Load medications from local storage
            // In a real app with multiple users, we'd filter by patientId, but for prototype it's ok.
             try {
                const allStoredMeds: Medication[] = JSON.parse(localStorage.getItem(`${MEDS_STORAGE_KEY}-${patientId}`) || '[]');
                setActiveMedications(allStoredMeds);
            } catch (e) { console.error("Failed to load medications from local storage", e); }
        }
    }, [patientId]);
    
    if (!patient) {
        return (
            <Card>
                <CardHeader><CardTitle>Patient Summary</CardTitle></CardHeader>
                <CardContent><Loader2 className="animate-spin" /></CardContent>
            </Card>
        );
    }
    
    const calculateAge = (dob: string) => {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };


    return (
        <Card className="mb-6">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <HeartPulse /> Patient Summary: {patient.name}
                        </CardTitle>
                        <CardDescription>
                            {calculateAge(patient.dob)} years old &bull; Last Visit: {new Date(patient.lastVisit).toLocaleDateString()}
                        </CardDescription>
                    </div>
                    <Badge variant={patient.status === 'Active' ? 'secondary' : 'outline'}>{patient.status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2"><Pill /> Active Medications</h4>
                     {activeMedications.length > 0 ? (
                        <ul className="list-disc list-inside text-muted-foreground">
                            {activeMedications.map(med => (
                                <li key={med.id}>{med.name} ({med.dose})</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">No active medications found.</p>
                    )}
                </div>

                <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2"><Stethoscope /> Last Diagnosis</h4>
                    {lastDiagnosis ? (
                        <p className="font-bold text-primary">{lastDiagnosis.potentialDiagnoses[0]?.diagnosis || 'N/A'}</p>
                    ) : (
                        <p className="text-muted-foreground">No AI diagnosis on file.</p>
                    )}
                </div>
                
                 <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2"><AlertCircle /> Key Abnormalities</h4>
                     {lastDiagnosis && lastDiagnosis.keyAbnormalities.length > 0 ? (
                        <ul className="list-disc list-inside text-muted-foreground">
                             {lastDiagnosis.keyAbnormalities.slice(0, 3).map((item, index) => (
                                <li key={index}>{item.parameter}: <span className="font-semibold text-destructive">{item.value}</span></li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">No key abnormalities from last report.</p>
                    )}
                </div>

            </CardContent>
        </Card>
    );
}


function IntelligencePanel({
    diagnosis,
    isDiagnosing,
    reportContent,
    patientId
}: {
    diagnosis: DiagnosisOutput | null;
    isDiagnosing: boolean;
    reportContent: string | null;
    patientId: string;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isReplying, setIsReplying] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [prescription, setPrescription] = useState<string | null>(null);
    const [isGeneratingRx, setIsGeneratingRx] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const prescriptionRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const handlePrint = () => {
        toast({
            title: "Print Feature",
            description: "The print functionality will be enabled in a future update.",
        });
    };


    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages, isReplying]);
    
    useEffect(() => {
        if (diagnosis) {
             try {
                const storedDiagnoses: StoredDiagnosis[] = JSON.parse(localStorage.getItem(`${DIAGNOSIS_STORAGE_KEY}-${patientId}`) || '[]');
                const newDiagnosis: StoredDiagnosis = {
                    id: crypto.randomUUID(),
                    patientId: patientId,
                    diagnosis: diagnosis,
                    createdAt: new Date().toISOString(),
                };
                // Keep only the last 5 diagnoses
                const updatedDiagnoses = [newDiagnosis, ...storedDiagnoses].slice(0, 5);
                localStorage.setItem(`${DIAGNOSIS_STORAGE_KEY}-${patientId}`, JSON.stringify(updatedDiagnoses));
            } catch (error) {
                console.error("Failed to save diagnosis to local storage:", error);
            }
        }
    }, [diagnosis, patientId]);

    const getPriorityVariant = (priority: 'High' | 'Medium' | 'Low') => {
        switch (priority) {
            case 'High': return 'destructive';
            case 'Medium': return 'secondary';
            case 'Low': return 'outline';
            default: return 'outline';
        }
    };

    const handleGeneratePrescription = async () => {
        if (!diagnosis) return;

        setIsGeneratingRx(true);
        setPrescription(null);
        try {
            const result = await generatePrescription({
                diagnosis: diagnosis,
                patientContext: "Patient is a 45-year-old male. No known drug allergies."
            });
            
            setPrescription(result.prescriptionText);
            toast({
                title: "Prescription Generated",
                description: "A draft prescription has been created based on the diagnosis."
            })
        } catch (error) {
            console.error("Prescription generation failed:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to generate prescription."
            toast({
                variant: "destructive",
                title: "AI Error",
                description: errorMessage,
            });
        } finally {
            setIsGeneratingRx(false);
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !reportContent || !diagnosis) {
            return;
        }

        const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: chatInput }] };
        const currentMessages = [...messages, newUserMessage];
        setMessages(currentMessages);
        setChatInput('');
        setIsReplying(true);

        try {
            const result = await askDiagnosticQuestion(
                reportContent,
                chatInput,
                currentMessages,
                JSON.stringify(diagnosis)
            );
            const newModelMessage: ChatMessage = { role: 'model', parts: [{ text: result.answer }] };
            setMessages(prev => [...prev, newModelMessage]);
        } catch (error) {
            console.error("Chat failed:", error);
            toast({
                variant: "destructive",
                title: "AI Chat Error",
                description: "The assistant could not respond to your question."
            });
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setIsReplying(false);
        }
    };
    
    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSendMessage();
        }
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot /> AI Diagnostic Copilot</CardTitle>
                <CardDescription>Expert analysis from an AI Clinical Assistant.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="h-[calc(80vh-220px)]" ref={scrollAreaRef}>
                 <ScrollArea className="h-full pr-4">
                    {!diagnosis && !isDiagnosing && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                            <Bot className="w-16 h-16 mb-4" />
                            <p>Upload a health report and click "Start AI Diagnosis" to generate a clinical intelligence summary.</p>
                        </div>
                    )}
                    {isDiagnosing && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <Loader2 className="w-16 h-16 mb-4 animate-spin" />
                            <p>Analyzing report... Please wait.</p>
                        </div>
                    )}
                    {diagnosis && (
                        <div className="space-y-6 text-sm">
                            <div>
                                <h3 className="font-semibold text-base flex items-center gap-2 mb-2"><FileText className="w-4 h-4" /> AI Summary</h3>
                                <div className="p-3 bg-muted rounded-lg prose prose-sm max-w-none">
                                    <ReactMarkdown>{diagnosis.summary}</ReactMarkdown>
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <h3 className="font-semibold text-base flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Key Abnormalities</h3>
                                <div className="space-y-2">
                                    {Array.isArray(diagnosis.keyAbnormalities) && diagnosis.keyAbnormalities.map((item, index) => (
                                        <div key={index} className="p-3 border rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold">{item.parameter}: <span className="font-bold text-destructive">{item.value}</span></p>
                                                <p className="text-xs text-muted-foreground">Normal: {item.normalRange}</p>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 prose prose-sm max-w-none">
                                                <ReactMarkdown>{item.interpretation}</ReactMarkdown>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <h3 className="font-semibold text-base flex items-center gap-2 mb-2"><Stethoscope className="w-4 h-4" /> Potential Diagnoses</h3>
                                <div className="space-y-3">
                                    {Array.isArray(diagnosis.potentialDiagnoses) && diagnosis.potentialDiagnoses.map((diag, index) => (
                                        <div key={index} className="p-3 bg-muted rounded-lg">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="font-semibold text-primary">{diag.diagnosis}</p>
                                                <Badge variant="default">{(diag.confidenceScore * 100).toFixed(0)}%</Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground prose prose-sm max-w-none">
                                                <ReactMarkdown>{diag.reasoning}</ReactMarkdown>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {diagnosis.differentialDiagnosis && diagnosis.differentialDiagnosis.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                <h3 className="font-semibold text-base flex items-center gap-2 mb-2"><FlaskConical className="w-4 h-4" /> Differential Diagnosis</h3>
                                <div className="space-y-3">
                                    {diagnosis.differentialDiagnosis.map((diag, index) => (
                                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                                        <p className="font-semibold text-primary/90">{diag.diagnosis}</p>
                                        <div className="text-xs text-muted-foreground prose prose-sm max-w-none">
                                            <ReactMarkdown>{diag.reasoning}</ReactMarkdown>
                                        </div>
                                    </div>
                                    ))}
                                </div>
                                </div>
                            </>
                            )}

                             {diagnosis.pathophysiologyInsights && (
                            <>
                            <Separator />
                            <div>
                                <h3 className="font-semibold text-base flex items-center gap-2 mb-2"><Stethoscope className="w-4 h-4" /> Pathophysiology Insights</h3>
                                <div className="p-3 bg-muted/50 rounded-lg prose prose-sm max-w-none">
                                    <ReactMarkdown>{diagnosis.pathophysiologyInsights}</ReactMarkdown>
                                </div>
                            </div>
                            </>
                            )}

                             <Separator />
                            <div>
                                <h3 className="font-semibold text-base flex items-center gap-2 mb-2"><FlaskConical className="w-4 h-4" /> Recommended Follow-ups</h3>
                                <div className="space-y-2">
                                     {Array.isArray(diagnosis.recommendedFollowUps) && diagnosis.recommendedFollowUps.map((followUp, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                                            <p>{followUp.recommendation}</p>
                                            <Badge variant={getPriorityVariant(followUp.priority)}>{followUp.priority}</Badge>
                                        </div>
                                    ))}
                                </div>
                                <Button 
                                    onClick={handleGeneratePrescription} 
                                    disabled={isGeneratingRx || !diagnosis} 
                                    className="w-full mt-4"
                                >
                                    {isGeneratingRx ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pilcrow className="mr-2 h-4 w-4" />}
                                    Generate Prescription
                                </Button>
                            </div>
                            
                            {isGeneratingRx && (
                                <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                                    <Loader2 className="w-8 h-8 mb-2 animate-spin" />
                                    <p>Generating prescription...</p>
                                </div>
                            )}
                            {prescription && (
                                <>
                                <Separator />
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Pilcrow /> Generated Prescription</CardTitle>
                                    </CardHeader>
                                    <CardContent ref={prescriptionRef} className="prose prose-sm max-w-none bg-muted p-4 rounded-lg">
                                        <ReactMarkdown>{prescription}</ReactMarkdown>
                                    </CardContent>
                                    <CardFooter>
                                        <Button variant="outline" onClick={handlePrint} disabled>Print / Save as PDF</Button>
                                    </CardFooter>
                                </Card>
                                </>
                            )}
                            
                            {messages.length > 0 && <Separator />}
                            <div className="space-y-4">
                                {messages.map((message, index) => (
                                    <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                        {message.role === 'model' && <Bot className="w-6 h-6 flex-shrink-0" />}
                                        <div className={`p-3 rounded-lg max-w-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                            <div className="prose prose-sm max-w-none">
                                                <ReactMarkdown>{message.parts[0].text}</ReactMarkdown>
                                            </div>
                                        </div>
                                        {message.role === 'user' && <User className="w-6 h-6 flex-shrink-0" />}
                                    </div>
                                ))}
                                {isReplying && (
                                     <div className="flex items-start gap-3">
                                        <Bot className="w-6 h-6 flex-shrink-0" />
                                        <div className="p-3 rounded-lg bg-muted">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                 </ScrollArea>
                </div>
            </CardContent>
            <CardFooter>
                <div className="flex items-center gap-2 w-full">
                    <Input
                        placeholder="Ask a follow-up question..."
                        disabled={!diagnosis || isDiagnosing || isReplying}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <Button size="icon" disabled={!diagnosis || isDiagnosing || isReplying || !chatInput.trim()} onClick={handleSendMessage}>
                        <SendHorizonal className="w-4 h-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}

export default function PatientProfilePage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const [reportContent, setReportContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisOutput | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const patientDocRef = useMemoFirebase(() => {
      if (!firestore || !patientId) return null;
      return doc(firestore, 'patients', patientId);
  }, [firestore, patientId]);

  const { data: patient, isLoading: isPatientLoading } = useDoc<Patient>(patientDocRef);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'text/plain' || file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/zip')) {
      setIsUploading(true);
      setFileName(file.name);
      
      if (file.type === 'text/plain') {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            setReportContent(content);
            setIsUploading(false);
            setDiagnosis(null);
            toast({
                title: "File Uploaded",
                description: `${file.name} has been successfully uploaded and is ready for analysis.`
            })
          };
          reader.onerror = () => {
            setIsUploading(false);
            toast({
                variant: "destructive",
                title: "Upload Error",
                description: "Failed to read the uploaded file."
            });
          };
          reader.readAsText(file);
      } else {
          setReportContent(`--- This is a placeholder for the content of ${file.name} --- \n\n File type ${file.type} is supported for upload, but client-side parsing is only implemented for .txt files in this prototype.`);
          setIsUploading(false);
          setDiagnosis(null);
           toast({
                title: "File Uploaded",
                description: `${file.name} has been successfully uploaded.`
            })
      }
    } else {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please upload a valid .txt, .pdf, .docx, or .zip file."
        });
    }
  };

  const handleDiagnose = async () => {
    if (!reportContent) {
        toast({
            variant: "destructive",
            title: "No Report",
            description: "Please upload a health report before starting the diagnosis."
        });
      return;
    }
    setIsDiagnosing(true);
    setDiagnosis(null);
    try {
        const result = await diagnoseHealthReport(reportContent);
        setDiagnosis(result);
    } catch (error) {
        console.error("Diagnosis failed:", error);
        toast({
            variant: "destructive",
            title: "AI Diagnosis Failed",
            description: `The AI assistant could not complete the diagnosis. ${error instanceof Error ? error.message : ''}`
        });
    } finally {
        setIsDiagnosing(false);
    }
  };
  
   if (isPatientLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <PatientSummaryCard patient={patient} patientId={patientId} />
       <div className="grid gap-6 lg:grid-cols-10">
          <div className="lg:col-span-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Patient Health Report</CardTitle>
                <CardDescription>
                  Upload a .txt, .pdf, .docx, or .zip file containing the patient's health report for AI analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted-foreground/50 rounded-lg text-center">
                  <UploadCloud className="w-12 h-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {fileName ? `File: ${fileName}` : 'Drag & drop or click to upload'}
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".txt,.pdf,.docx,.zip"
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Browse File
                  </Button>
                </div>
                
                <Button onClick={handleDiagnose} disabled={isDiagnosing || !reportContent} className="w-full">
                  {isDiagnosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start AI Diagnosis
                </Button>
              </CardContent>
            </Card>
             {reportContent && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Uploaded Report Content</CardTitle>
                        <CardDescription>{fileName}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-96 w-full rounded-md border p-4 text-sm">
                            <pre className="whitespace-pre-wrap">{reportContent}</pre>
                        </ScrollArea>
                    </CardContent>
                 </Card>
             )}
          </div>

          <div className="lg:col-span-4">
            <IntelligencePanel diagnosis={diagnosis} isDiagnosing={isDiagnosing} reportContent={reportContent} patientId={patientId} />
          </div>
       </div>
    </div>
  );
}
