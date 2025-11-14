'use client';

import * as React from 'react';
import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type TaskPriority = 'High' | 'Medium' | 'Low';
type TaskStatus = 'To Do' | 'In Progress' | 'Completed';

type Task = {
  id: string;
  title: string;
  patient: string;
  assignedBy: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
};

const initialTasks: Task[] = [
  { id: 'task-2', title: "Call patient with lab results", patient: "Emily Davis", assignedBy: "Dr. Evans", dueDate: "2024-08-02", priority: "Medium", status: 'To Do' },
  { id: 'task-4', title: "Review patient intake forms", patient: "Jessica Brown", assignedBy: "Dr. Evans", dueDate: "2024-08-01", priority: "Medium", status: 'In Progress' },
];

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
        <p className="text-sm text-muted-foreground">Patient: {task.patient}</p>
        <p className="text-sm text-muted-foreground">Assigned by: {task.assignedBy}</p>
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
  onEditTask
}: { 
  title: string; 
  tasks: Task[]; 
  columnKey: TaskStatus;
  onDrop: (e: React.DragEvent<HTMLDivElement>, column: TaskStatus) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  isDraggingOver: boolean;
  onEditTask: (task: Task) => void;
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
      </div>
      <div className="flex flex-col gap-4 min-h-[100px]">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onEdit={() => onEditTask(task)} />
        ))}
      </div>
    </div>
  )
}

function ViewTaskDialog({ 
    task, 
    open, 
    onOpenChange,
    onStatusChange
}: { 
    task: Task | null, 
    open: boolean, 
    onOpenChange: (open: boolean) => void,
    onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}) {
    if (!task) return null;

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{task.title}</DialogTitle>
                    <p className="text-sm text-muted-foreground pt-1">Patient: {task.patient}</p>
                </DialogHeader>
                <div className="grid gap-4 py-4 text-sm">
                    <p><strong>Assigned By:</strong> {task.assignedBy}</p>
                    <p><strong>Due Date:</strong> {task.dueDate}</p>
                    <p><strong>Priority:</strong> <Badge variant={task.priority === 'High' ? 'destructive' : 'secondary'}>{task.priority}</Badge></p>
                    <p><strong>Status:</strong> <Badge>{task.status}</Badge></p>
                    <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" placeholder="Add any notes related to the task..." className="mt-2" />
                    </div>
                </div>
                <DialogFooter className="justify-between sm:justify-between">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                    <div className="flex gap-2">
                       {task.status !== 'In Progress' && (
                           <Button onClick={() => onStatusChange(task.id, 'In Progress')}>Start Task</Button>
                       )}
                       {task.status !== 'Completed' && (
                           <Button onClick={() => onStatusChange(task.id, 'Completed')}>Mark as Completed</Button>
                       )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function StaffTasksPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [draggingOver, setDraggingOver] = useState<TaskStatus | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);


  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toColumn: TaskStatus) => {
    e.preventDefault();
    setDraggingOver(null);
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    handleStatusChange(taskId, toColumn);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleViewTask = (task: Task) => {
    setViewingTask(task);
    setIsViewDialogOpen(true);
  }
  
  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? {...t, status: newStatus} : t));
    if (viewingTask?.id === taskId) {
        setViewingTask(prev => prev ? {...prev, status: newStatus} : null);
    }
  };


  const columns: TaskStatus[] = ['To Do', 'In Progress', 'Completed'];

  return (
    <>
      <Card>
          <CardHeader>
              <CardTitle>My Assigned Tasks</CardTitle>
              <CardDescription>
                This is your personal task board. Drag tasks between columns to update their status.
              </CardDescription>
          </CardHeader>
      </Card>
      <div className="grid md:grid-cols-3 gap-6 items-start mt-6">
        {columns.map((columnKey) => (
          <TaskColumn 
            key={columnKey}
            title={columnKey}
            tasks={tasks.filter(t => t.status === columnKey)}
            columnKey={columnKey}
            onDrop={handleDrop}
            onDragOver={(e) => { handleDragOver(e); setDraggingOver(columnKey); }}
            onDragLeave={() => setDraggingOver(null)}
            isDraggingOver={draggingOver === columnKey}
            onEditTask={handleViewTask}
          />
        ))}
      </div>
      <ViewTaskDialog
        task={viewingTask}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}
