'use client';

import * as React from 'react';
import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Loader2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc, query, where } from 'firebase/firestore';

export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'To Do' | 'In Progress' | 'Completed';

export type Task = {
  id: string;
  title: string;
  patientName: string;
  assignee: string; // Should be a user ID
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  orgId: string;
  assignedBy: string;
  createdAt: any;
};

function TaskCard({ task, onEdit }: { task: Task; onEdit: () => void; }) {
  return (
    <Card 
      className="cursor-pointer hover:bg-accent/50"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id);
        e.currentTarget.style.opacity = '0.5';
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      onClick={onEdit}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
            <p className="font-semibold pr-2">{task.title}</p>
            <Badge variant={task.priority === 'High' ? 'destructive' : 'secondary'}>{task.priority}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Patient: {task.patientName}</p>
        <p className="text-sm text-muted-foreground">Assignee: {task.assignee}</p>
        <p className="text-sm text-muted-foreground mt-2">Due: {task.dueDate}</p>
      </CardContent>
    </Card>
  )
}

function TaskColumn({ 
  title, 
  tasks, 
  columnKey,
  onDrop,
  onDragOver,
  onDragLeave,
  isDraggingOver,
  onEditTask,
  onAddTask,
  isLoading
}: { 
  title: string; 
  tasks: Task[]; 
  columnKey: TaskStatus;
  onDrop: (e: React.DragEvent<HTMLDivElement>, column: TaskStatus) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  isDraggingOver: boolean;
  onEditTask: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  isLoading: boolean;
}) {
  return (
    <div 
      className={cn(
        "flex flex-col gap-4 bg-muted/50 rounded-lg p-4 transition-colors duration-200",
        isDraggingOver && "bg-primary/10 border-primary border-dashed border-2"
      )}
      onDrop={(e) => onDrop(e, columnKey)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="font-bold">{title}</h2>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onAddTask(columnKey)}>
          <PlusCircle className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-4 min-h-[100px]">
        {isLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin" />}
        {!isLoading && tasks.map(task => (
          <TaskCard key={task.id} task={task} onEdit={() => onEditTask(task)} />
        ))}
         {!isLoading && tasks.length === 0 && (
            <div className="text-center text-sm text-muted-foreground pt-4">No tasks</div>
        )}
      </div>
    </div>
  )
}

function EditTaskDialog({ 
    task, 
    open, 
    onOpenChange,
    onSave,
    user,
    profile
}: { 
    task: Partial<Task> | null, 
    open: boolean, 
    onOpenChange: (open: boolean) => void,
    onSave: (updatedTask: Partial<Task>) => void
    user: any,
    profile: any
}) {
    const [editedTask, setEditedTask] = useState<Partial<Task> | null>(task);

    React.useEffect(() => {
        setEditedTask(task);
    }, [task]);

    const handleChange = (field: keyof Task, value: string) => {
        if (editedTask) {
            setEditedTask({ ...editedTask, [field]: value });
        }
    };
    
    const handlePriorityChange = (value: string) => {
        if (editedTask) {
            setEditedTask({ ...editedTask, priority: value as TaskPriority });
        }
    };
    
    const handleStatusChange = (value: string) => {
        if (editedTask) {
            setEditedTask({ ...editedTask, status: value as TaskStatus });
        }
    };

    const handleSaveChanges = () => {
        if (editedTask && user && profile) {
            onSave({
                ...editedTask,
                orgId: profile.orgId,
                assignedBy: user.uid,
            });
            onOpenChange(false);
        }
    };

    if (!editedTask) return null;

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editedTask.id ? 'Edit Task' : 'Create Task'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title</Label>
                        <Input id="title" value={editedTask.title || ''} onChange={(e) => handleChange('title', e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="patient" className="text-right">Patient</Label>
                        <Input id="patient" value={editedTask.patientName || ''} onChange={(e) => handleChange('patientName', e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="assignee" className="text-right">Assignee</Label>
                        <Input id="assignee" value={editedTask.assignee || ''} onChange={(e) => handleChange('assignee', e.target.value)} className="col-span-3" placeholder="Staff Member Name"/>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="dueDate" className="text-right">Due Date</Label>
                        <Input id="dueDate" type="date" value={editedTask.dueDate || ''} onChange={(e) => handleChange('dueDate', e.target.value)} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="priority" className="text-right">Priority</Label>
                        <Select onValueChange={handlePriorityChange} defaultValue={editedTask.priority}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">Status</Label>
                        <Select onValueChange={handleStatusChange} defaultValue={editedTask.status}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="To Do">To Do</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSaveChanges}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function TasksPage() {
  const { user, profile } = useUser();
  const firestore = useFirestore();
  
  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.orgId) return null;
    return query(collection(firestore, 'tasks'), where('orgId', '==', profile.orgId));
  }, [firestore, profile?.orgId]);
  
  const { data: tasks, isLoading: tasksLoading } = useCollection<Task>(tasksQuery);

  const [draggingOver, setDraggingOver] = useState<TaskStatus | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toColumn: TaskStatus) => {
    e.preventDefault();
    setDraggingOver(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId || !firestore) return;
    
    const task = tasks?.find(t => t.id === taskId);
    if (task && task.status !== toColumn) {
        const taskRef = doc(firestore, 'tasks', taskId);
        updateDoc(taskRef, { status: toColumn });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  }
  
  const handleAddTask = (status: TaskStatus) => {
      setEditingTask({ status, priority: 'Medium', dueDate: new Date().toISOString().split('T')[0] });
      setIsEditDialogOpen(true);
  }

  const handleSaveTask = async (updatedTask: Partial<Task>) => {
    if (!firestore) return;

    if (updatedTask.id) { // Editing existing task
        const taskRef = doc(firestore, 'tasks', updatedTask.id);
        await updateDoc(taskRef, updatedTask);
    } else { // Creating new task
        const tasksCol = collection(firestore, 'tasks');
        await addDoc(tasksCol, {
            ...updatedTask,
            createdAt: serverTimestamp(),
        });
    }
  };

  const columns: TaskStatus[] = ['To Do', 'In Progress', 'Completed'];

  return (
    <>
      <Card>
          <CardHeader>
              <CardTitle>Manage & Assign Tasks</CardTitle>
              <CardDescription>
                As a doctor or admin, you can create new tasks for your staff and track their progress here.
              </CardDescription>
          </CardHeader>
      </Card>
      <div className="grid md:grid-cols-3 gap-6 items-start mt-6">
        {columns.map((columnKey) => (
          <TaskColumn 
            key={columnKey}
            title={columnKey}
            tasks={tasks?.filter(t => t.status === columnKey) || []}
            columnKey={columnKey}
            onDrop={handleDrop}
            onDragOver={(e) => { handleDragOver(e); setDraggingOver(columnKey); }}
            onDragLeave={() => setDraggingOver(null)}
            isDraggingOver={draggingOver === columnKey}
            onEditTask={handleEditTask}
            onAddTask={handleAddTask}
            isLoading={tasksLoading}
          />
        ))}
      </div>
      <EditTaskDialog
        task={editingTask}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveTask}
        user={user}
        profile={profile}
      />
    </>
  );
}
