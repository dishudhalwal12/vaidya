
'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, X, Pill, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

// Type definitions
type ReminderTime = { id: string; time: string };
type Medication = {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  times: ReminderTime[];
  startDate: string;
  endDate: string;
  notes: string;
};

const MEDS_STORAGE_KEY = 'vaidya-medications';
const NOTIFIED_TODAY_KEY = 'vaidya-notified-today';

export default function MedicationsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isAddMedicationOpen, setIsAddMedicationOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);


  // --- Local Storage Persistence ---
  useEffect(() => {
    if (!user) return;
    try {
      const storedMeds = localStorage.getItem(`${MEDS_STORAGE_KEY}-${user.uid}`);
      if (storedMeds) {
        setMedications(JSON.parse(storedMeds));
      }
    } catch (error) {
      console.error("Failed to load medications from local storage:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load medication data.",
      });
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    try {
        localStorage.setItem(`${MEDS_STORAGE_KEY}-${user.uid}`, JSON.stringify(medications));
    } catch (error) {
        console.error("Failed to save medications to local storage:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not save medication data.",
        });
    }
  }, [medications, user, toast]);

  // --- Reminder Engine ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (!user || !audioRef.current) return;
      
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const notifiedTodayStore = localStorage.getItem(`${NOTIFIED_TODAY_KEY}-${user.uid}`);
      const notifiedToday: Record<string, string> = notifiedTodayStore ? JSON.parse(notifiedTodayStore) : {};

      // Clear old notifications at midnight
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        localStorage.removeItem(`${NOTIFIED_TODAY_KEY}-${user.uid}`);
      }

      medications.forEach(med => {
        med.times.forEach(reminder => {
          if (reminder.time === currentTime) {
            const notificationId = `${med.id}-${reminder.time}`;
            const lastNotifiedDate = notifiedToday[notificationId];

            if (!lastNotifiedDate || lastNotifiedDate !== now.toLocaleDateString()) {
                // Play sound
                audioRef.current?.play().catch(e => console.error("Audio play failed:", e));
                toast({
                    title: `Reminder: ${med.name}`,
                    description: `Time to take your ${med.name} (${med.dose}). ${med.notes || ''}`
                });
                
                // Mark as notified for today
                notifiedToday[notificationId] = now.toLocaleDateString();
                localStorage.setItem(`${NOTIFIED_TODAY_KEY}-${user.uid}`, JSON.stringify(notifiedToday));
            }
          }
        });
      });

    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [medications, user, toast]);

  const addMedication = (newMed: Omit<Medication, 'id' | 'patientId'>) => {
    if (!user) return;
    const medWithId: Medication = { 
        ...newMed, 
        id: crypto.randomUUID(),
        patientId: user.uid,
    };
    setMedications(prev => [...prev, medWithId]);
  };
  
  const deleteMedication = (medId: string) => {
    setMedications(prev => prev.filter(med => med.id !== medId));
    toast({
        title: "Medication Removed",
        description: "The medication has been deleted.",
    });
  }

  return (
    <>
      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" preload="auto"></audio>
      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Medication Tracker</CardTitle>
              <CardDescription>Manage and track patient medication schedules and adherence.</CardDescription>
            </div>
            <Button onClick={() => setIsAddMedicationOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Medication
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No medications added yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  medications.map(med => (
                    <TableRow key={med.id}>
                      <TableCell className="font-medium">{med.name}</TableCell>
                      <TableCell>{med.dose}</TableCell>
                      <TableCell>{med.times.map(t => t.time).join(', ')}</TableCell>
                      <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteMedication(med.id)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                            <span className="sr-only">Delete</span>
                          </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <AddMedicationDialog 
        open={isAddMedicationOpen} 
        onOpenChange={setIsAddMedicationOpen}
        onMedicationAdd={addMedication}
      />
    </>
  );
}

// Dialog component for adding new medication
function AddMedicationDialog({ open, onOpenChange, onMedicationAdd }: { open: boolean, onOpenChange: (open: boolean) => void, onMedicationAdd: (med: Omit<Medication, 'id' | 'patientId'>) => void }) {
    const [name, setName] = useState('');
    const [dose, setDose] = useState('');
    const [notes, setNotes] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [times, setTimes] = useState<ReminderTime[]>([{id: crypto.randomUUID(), time: '09:00'}]);
    const { toast } = useToast();

    const handleAddTime = () => {
        if (times.length < 5) { // Limit number of reminders
            setTimes([...times, {id: crypto.randomUUID(), time: ''}]);
        }
    };
    
    const handleRemoveTime = (id: string) => {
        if (times.length > 1) {
            setTimes(times.filter(t => t.id !== id));
        }
    };

    const handleTimeChange = (id: string, newTime: string) => {
        setTimes(times.map(t => t.id === id ? { ...t, time: newTime } : t));
    };

    const handleSave = () => {
        if (!name || !dose || !startDate) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill in all required fields.' });
            return;
        }
        onMedicationAdd({ name, dose, times, startDate, endDate, notes });
        toast({ title: 'Medication Added', description: `${name} has been added to the schedule.` });
        // Reset form and close
        setName('');
        setDose('');
        setNotes('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setTimes([{id: crypto.randomUUID(), time: '09:00'}]);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Pill /> Add New Medication</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" placeholder="e.g., Paracetamol"/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dose" className="text-right">Dose</Label>
                        <Input id="dose" value={dose} onChange={e => setDose(e.target.value)} className="col-span-3" placeholder="e.g., 500mg"/>
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Times</Label>
                        <div className="col-span-3 space-y-2">
                           {times.map((t, index) => (
                               <div key={t.id} className="flex items-center gap-2">
                                   <Input type="time" value={t.time} onChange={e => handleTimeChange(t.id, e.target.value)} />
                                   {index > 0 && <Button variant="ghost" size="icon" onClick={() => handleRemoveTime(t.id)}><X className="h-4 w-4"/></Button>}
                               </div>
                           ))}
                           <Button variant="outline" size="sm" onClick={handleAddTime}>Add Time</Button>
                        </div>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start-date" className="text-right">Start Date</Label>
                        <Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="end-date" className="text-right">End Date</Label>
                        <Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="col-span-3 min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="e.g., Take with food"></textarea>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave}>Save Medication</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


