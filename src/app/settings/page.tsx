"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { getApiKey, saveApiKey } from "@/ai/actions/api-keys-actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";


export default function SettingsPage() {
    const { toast } = useToast();
    const [apiKey, setApiKey] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchKey = async () => {
            setIsLoading(true);
            try {
                const key = await getApiKey();
                setApiKey(key);
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Could not load API key.",
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchKey();
    }, [toast]);

    const handleSaveChanges = async () => {
        setIsLoading(true);
        try {
            await saveApiKey(apiKey);
            toast({
                title: "Success",
                description: "API key saved successfully.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not save API key.",
            });
        } finally {
            setIsLoading(false);
        }
    }


    return (
        <div className="mx-auto grid w-full max-w-6xl gap-2">
            <h1 className="text-3xl font-semibold">Settings</h1>

            <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="ai">AI Governance</TabsTrigger>
                </TabsList>
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Clinic Information</CardTitle>
                            <CardDescription>Update your clinic's public details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="clinicName">Clinic Name</Label>
                                <Input id="clinicName" defaultValue="Vaidya Demo Clinic" />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="clinicAddress">Address</Label>
                                <Input id="clinicAddress" defaultValue="123 Health St, Wellness City, 12345" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="roles">
                    <Card>
                        <CardHeader>
                            <CardTitle>Roles & Permissions</CardTitle>
                            <CardDescription>Define what each role can see and do.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="font-medium">Coming soon...</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="templates">
                    <Card>
                        <CardHeader>
                            <CardTitle>Content Templates</CardTitle>
                            <CardDescription>Manage templates for notes, messages, and care plans.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="font-medium">Coming soon...</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="ai">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Bring Your Own API Key</CardTitle>
                                <CardDescription>Provide your Google AI API key for all AI features.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {isLoading ? <div className="flex items-center gap-2"> <Loader2 className="animate-spin" /> Loading key...</div> : (
                                    <>
                                        <div className="space-y-1">
                                            <Label htmlFor="apiKey">Google API Key</Label>
                                            <Input id="apiKey" type="password" placeholder="Enter your API key" value={apiKey} onChange={e => setApiKey(e.target.value)} />
                                        </div>
                                    </>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleSaveChanges} disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>AI Feature Controls</CardTitle>
                                <CardDescription>Manage how AI assistants behave in your clinic.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="ai-drafting" className="text-base">Smart Note AI Drafting</Label>
                                        <p className="text-sm text-muted-foreground">Allow AI to auto-summarize and suggest content for progress notes.</p>
                                    </div>
                                    <Switch id="ai-drafting" defaultChecked />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="ai-coding" className="text-base">Claims & Coding Assistant</Label>
                                        <p className="text-sm text-muted-foreground">Enable AI suggestions for ICD/CPT codes based on visit notes.</p>
                                    </div>
                                    <Switch id="ai-coding" defaultChecked />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="ai-reception" className="text-base">AI Reception Assistant</Label>
                                        <p className="text-sm text-muted-foreground">Activate the patient-facing chatbot for booking and inquiries.</p>
                                    </div>
                                    <Switch id="ai-reception" defaultChecked />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
