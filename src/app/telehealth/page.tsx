
"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { FileUp, Link as LinkIcon, PhoneOff, Video as VideoIcon, Copy, Bot, Loader2, Mic, StopCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { transcribeAndSummarize } from "./actions";
import { getApiKey } from "@/ai/actions/api-keys-actions";


function AINoteTaker() {
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [noteContent, setNoteContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const { toast } = useToast();
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        const fetchKey = async () => {
            try {
                const key = await getApiKey();
                setApiKey(key);
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Could not load API key for AI Note Taker.",
                });
            }
        };
        fetchKey();
    }, [toast]);

    const handleStartTranscription = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                audioChunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };

                mediaRecorderRef.current.onstop = async () => {
                    setIsLoading(true);
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        const base64Audio = reader.result?.toString().split(',')[1];
                        if (base64Audio) {
                            if (!apiKey) {
                                toast({
                                    variant: "destructive",
                                    title: "API Key Missing",
                                    description: "Google API key is not set. Please configure it in settings.",
                                });
                                setIsLoading(false);
                                return;
                            }
                            try {
                                const result = await transcribeAndSummarize(base64Audio, audioBlob.type, apiKey);
                                if (result.error) {
                                    throw new Error(result.error);
                                }
                                setNoteContent(result.note);
                                toast({
                                    title: "Note Generated",
                                    description: "The AI has drafted a SOAP note from the recording.",
                                });
                            } catch (error) {
                                console.error("Transcription failed:", error);
                                toast({
                                    variant: "destructive",
                                    title: "AI Error",
                                    description: `Could not generate notes. ${error instanceof Error ? error.message : ''}`,
                                });
                            } finally {
                                setIsLoading(false);
                            }
                        }
                    };
                };

                mediaRecorderRef.current.start();
                setIsRecording(true);
                setNoteContent("");
                toast({ title: "Recording Started", description: "The AI note taker is listening." });
            } catch (err) {
                console.error("Error accessing microphone:", err);
                toast({
                    variant: "destructive",
                    title: "Microphone Error",
                    description: "Could not access the microphone. Please check permissions.",
                });
            }
        } else {
            toast({
                variant: "destructive",
                title: "Unsupported Browser",
                description: "Your browser does not support audio recording.",
            });
        }
    };
    
    const handleStopTranscription = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // The note generation will be triggered by the onstop event handler
        }
    };
    
    const handleApprove = () => {
        setIsSaving(true);
        setTimeout(() => {
            toast({
                title: "Note Approved & Saved",
                description: "The AI-drafted SOAP note has been saved to the patient's chart.",
            });
            setIsSaving(false);
            setNoteContent("");
        }, 1500);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot /> AI Note Taker</CardTitle>
                <CardDescription>Generates SOAP notes from a live audio recording.</CardDescription>
            </CardHeader>
            <CardContent>
                {!isRecording && !isLoading && !noteContent && (
                     <Button 
                        className="w-full" 
                        onClick={handleStartTranscription}
                    >
                        <Mic className="mr-2" />
                        Start Recording
                    </Button>
                )}
                 {isRecording && (
                     <Button 
                        variant="destructive"
                        className="w-full" 
                        onClick={handleStopTranscription}
                    >
                        <StopCircle className="mr-2" />
                        Stop Recording
                    </Button>
                )}

                 {(isLoading || noteContent) && (
                    <div className="rounded-lg border bg-muted p-4 min-h-[200px] prose prose-sm max-w-none">
                         {isLoading && <div className="flex items-center justify-center h-full"><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Transcribing...</div>}
                        {!isLoading && <ReactMarkdown>{noteContent}</ReactMarkdown>}
                    </div>
                )}
            </CardContent>
             {!isRecording && noteContent && (
                <CardFooter className="flex-col gap-2">
                     <Button 
                        className="w-full"
                        onClick={handleApprove}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Approve & Save Note
                    </Button>
                    <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => setNoteContent("")}
                    >
                        Discard
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}


export default function TelehealthPage() {
    const meetingUrl = "https://meet.jit.si/Vaidya-Session-4d087e2b";
    const [callStarted, setCallStarted] = useState(false);
    const { toast } = useToast();


    const handleCopyLink = () => {
        if (meetingUrl) {
            navigator.clipboard.writeText(meetingUrl);
            toast({
                title: "Link Copied",
                description: "The meeting link has been copied to your clipboard.",
            });
        }
    };
    
    const handleStartCall = () => {
        setCallStarted(true);
    }

    return (
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2">
                <Card className="h-full flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Telehealth Session</CardTitle>
                            <CardDescription>Patient: Michael Smith</CardDescription>
                        </div>
                        {callStarted && (
                             <Badge variant="destructive" className="animate-pulse">
                                <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                                LIVE
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center bg-black rounded-md relative overflow-hidden aspect-video">
                        {callStarted ? (
                             <iframe
                                src={meetingUrl}
                                allow="camera; microphone"
                                className="w-full h-full border-0"
                             ></iframe>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
                                <VideoIcon className="w-16 h-16 mb-4" />
                                <p>Click "Start Call" to begin the session.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col sm:flex-row justify-center items-center gap-2 p-4">
                        {!callStarted ? (
                            <Button onClick={handleStartCall} size="lg">
                                <VideoIcon className="w-5 h-5 mr-2"/>
                                Start Call
                            </Button>
                        ): (
                            <Button variant="destructive" size="lg" className="rounded-full px-6" onClick={() => setCallStarted(false)}>
                                <PhoneOff className="w-5 h-5 mr-2"/>
                                End Call
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </div>
            <div className="space-y-8">
                 <AINoteTaker />

                <Card>
                    <CardHeader>
                        <CardTitle>Share Session Link</CardTitle>
                        <CardDescription>Send this link to the patient to join the call.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                             <LinkIcon className="h-4 w-4 text-muted-foreground" />
                             <Input readOnly value={meetingUrl} className="flex-1 bg-muted"/>
                             <Button size="icon" variant="outline" onClick={handleCopyLink} disabled={!meetingUrl}>
                                 <Copy className="h-4 w-4" />
                             </Button>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Pre-visit Checklist</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="consent" checked />
                            <label htmlFor="consent">Consent form signed</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="vitals" checked />
                            <label htmlFor="vitals">Vitals submitted by patient</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="id" />
                            <label htmlFor="id">ID verification pending</label>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Document Sharing</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="text-sm space-y-2">
                            <li className="flex justify-between items-center">Lab_Results_07-2024.pdf <Button variant="ghost" size="sm">View</Button></li>
                            <li className="flex justify-between items-center">MRI_Scan_Spine.dcm <Button variant="ghost" size="sm">View</Button></li>
                        </ul>
                        <Separator className="my-4"/>
                        <Button variant="outline" className="w-full">
                            <FileUp className="w-4 h-4 mr-2"/>
                            Upload Document
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    