
'use client';
import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal, Loader2, PlusCircle, MessageSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, DocumentData, Timestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';

export type Patient = {
    id: string;
    orgId: string;
    name: string;
    email: string;
    phone: string;
    dob: string;
    status: 'Active' | 'New' | 'Inactive';
    lastVisit: string;
    avatarId: string;
    createdAt: Timestamp;
    visitType: 'OPD' | 'Emergency';
    consultationFee: number;
} & DocumentData;

function AddPatientDialog({ open, onOpenChange, onPatientAdded }: { open: boolean, onOpenChange: (open: boolean) => void, onPatientAdded: () => void }) {
    const { profile, user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [status, setStatus] = useState<'Active' | 'New' | 'Inactive'>('New');
    const [isLoading, setIsLoading] = useState(false);
    const [visitType, setVisitType] = useState<'OPD' | 'Emergency'>('OPD');
    const [emergencyFee, setEmergencyFee] = useState('');

    const handleAddPatient = async () => {
        if (!profile?.orgId || !user || !firestore) {
            toast({ variant: 'destructive', title: 'Error', description: 'User or organization not found.' });
            return;
        }
        if (!name || !email || !phone || !dob) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please fill all required fields.' });
            return;
        }
        
        let fee = 500;
        if (visitType === 'Emergency') {
            const parsedFee = parseFloat(emergencyFee);
            if (isNaN(parsedFee) || parsedFee < 0) {
                toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid emergency consultation fee.' });
                return;
            }
            fee = parsedFee;
        }

        setIsLoading(true);
        try {
            await addDoc(collection(firestore, 'patients'), {
                orgId: profile.orgId,
                name,
                email,
                phone,
                dob,
                status,
                lastVisit: new Date().toISOString(),
                avatarId: `user-${Math.floor(Math.random() * 5) + 1}`,
                createdAt: serverTimestamp(),
                visitType: visitType,
                consultationFee: fee,
            });
            toast({ title: 'Success', description: 'New patient has been added.' });
            onPatientAdded();
            onOpenChange(false);
            // Reset form
            setName('');
            setEmail('');
            setPhone('');
            setDob('');
            setStatus('New');
            setVisitType('OPD');
            setEmergencyFee('');
        } catch (error) {
            console.error("Error adding patient: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add patient.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Patient</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="phone" className="text-right">Phone</Label>
                        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dob" className="text-right">Date of Birth</Label>
                        <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Visit Type</Label>
                         <RadioGroup
                            value={visitType}
                            onValueChange={(value: 'OPD' | 'Emergency') => setVisitType(value)}
                            className="col-span-3 flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="OPD" id="opd" />
                                <Label htmlFor="opd">OPD (₹500)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Emergency" id="emergency" />
                                <Label htmlFor="emergency">Emergency</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {visitType === 'Emergency' && (
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="emergency-fee" className="text-right">Consult. Fee</Label>
                            <Input
                                id="emergency-fee"
                                type="number"
                                value={emergencyFee}
                                onChange={(e) => setEmergencyFee(e.target.value)}
                                placeholder="Enter fee in ₹"
                                className="col-span-3"
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">Status</Label>
                        <Select onValueChange={(value: 'Active' | 'New' | 'Inactive') => setStatus(value)} defaultValue={status}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAddPatient} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Add Patient
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const generateWhatsAppMessage = (patient: Patient, clinicName?: string) => {
    // Check if patient.lastVisit is a valid date string
    if (patient.lastVisit && typeof patient.lastVisit === 'string') {
        const lastVisitDate = parseISO(patient.lastVisit);
        if (isValid(lastVisitDate)) {
            const daysSinceLastVisit = differenceInDays(new Date(), lastVisitDate);
            if (daysSinceLastVisit > 90) {
                return `Hello ${patient.name}, it's been over 3 months since your last visit to ${clinicName || 'our clinic'}. We recommend scheduling a follow-up consultation soon.`;
            }
        }
    }
    
    // Fallback logic
    if (patient.status === 'New') {
        return `Hello ${patient.name}, welcome to ${clinicName || 'our clinic'}! We look forward to seeing you for your first consultation.`;
    }
    
    // Default follow-up message if other conditions are not met
    return `Hello ${patient.name}, this is a friendly follow-up from ${clinicName || 'our clinic'}. Please let us know if you need any assistance.`;
};


export default function PatientsPage() {
    const { profile, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);

    const patientsQuery = useMemoFirebase(() => {
        if (!firestore || !profile?.orgId) return null;
        return query(collection(firestore, 'patients'), where('orgId', '==', profile.orgId));
    }, [firestore, profile?.orgId]);

    const { data: patients, isLoading: patientsLoading, error } = useCollection<Patient>(patientsQuery);
    
    if (error) {
        toast({
            variant: 'destructive',
            title: 'Error loading patients',
            description: error.message,
        })
    }

    const handleWhatsAppFollowUp = (patient: Patient) => {
        const message = generateWhatsAppMessage(patient, profile?.orgName);
        const phoneNumber = patient.phone.replace(/\D/g, ''); // Remove non-digits
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Patients</CardTitle>
                        <CardDescription>Manage your patients and view their details.</CardDescription>
                    </div>
                    <Button onClick={() => setIsAddPatientOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Patient
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="hidden w-[100px] sm:table-cell">
                                    <span className="sr-only">Image</span>
                                </TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Last Visit</TableHead>
                                <TableHead className="hidden md:table-cell">Fee</TableHead>
                                <TableHead>
                                    <span className="sr-only">Actions</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(isUserLoading || patientsLoading) && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isUserLoading && !patientsLoading && patients?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        No patients found. Click "Add Patient" to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                            {patients?.map(patient => {
                                const avatar = PlaceHolderImages.find(p => p.id === patient.avatarId);
                                const lastVisitDate = patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'N/A';
                                return (
                                    <TableRow key={patient.id}>
                                        <TableCell className="hidden sm:table-cell">
                                            <Avatar className="h-9 w-9">
                                                {avatar && <AvatarImage src={avatar?.imageUrl} alt="Avatar" data-ai-hint={avatar?.imageHint} />}
                                                <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="font-medium">{patient.name}</div>
                                            <div className="hidden text-sm text-muted-foreground md:inline">{patient.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={patient.status === 'Active' ? 'secondary' : patient.status === 'New' ? 'default' : 'outline'}>{patient.status}</Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{lastVisitDate}</TableCell>
                                         <TableCell className="hidden md:table-cell">₹{patient.consultationFee}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleWhatsAppFollowUp(patient)}>
                                                <MessageSquare className="h-4 w-4" />
                                                <span className="sr-only">WhatsApp Follow-up</span>
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/patients/${patient.id}`}>View Profile</Link>
                                                    </DropdownMenuItem>
                                                     <DropdownMenuItem onClick={() => handleWhatsAppFollowUp(patient)}>
                                                        WhatsApp Follow-up
                                                     </DropdownMenuItem>
                                                    <DropdownMenuItem>Book Appointment</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <AddPatientDialog open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen} onPatientAdded={() => { /* Can add refresh logic here if needed */ }} />
        </>
    );
}
