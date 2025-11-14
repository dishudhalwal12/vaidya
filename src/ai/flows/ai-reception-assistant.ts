
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { getSdks } from '@/firebase';

// Schemas for AI Tools
const CreateTaskInputSchema = z.object({
  title: z.string().describe('The title or description of the task.'),
  patientName: z.string().describe("The name of the patient related to the task."),
  assignee: z.string().describe("The name of the staff member the task is assigned to."),
  dueDate: z.string().describe("The due date for the task in YYYY-MM-DD format."),
  priority: z.enum(['High', 'Medium', 'Low']).describe('The priority of the task.'),
  status: z.enum(['To Do', 'In Progress', 'Completed']).default('To Do'),
});

const UpdateTaskStatusInputSchema = z.object({
  taskTitle: z.string().describe("The title of the task to update. Be specific."),
  patientName: z.string().optional().describe("The patient associated with the task, for disambiguation."),
  newStatus: z.enum(['To Do', 'In Progress', 'Completed']),
});

const FindTasksInputSchema = z.object({
    assignee: z.string().optional().describe("Filter tasks by the person they are assigned to."),
    status: z.enum(['To Do', 'In Progress', 'Completed']).optional().describe("Filter tasks by their current status."),
});


// Tool Definitions
const createTask = ai.defineTool(
  {
    name: 'createTask',
    description: 'Creates a new task and assigns it to a staff member.',
    inputSchema: CreateTaskInputSchema,
    outputSchema: z.object({ success: z.boolean(), taskId: z.string().optional() }),
  },
  async (input) => {
    try {
      const { firestore, auth } = getSdks();
      const userDocSnap = await getDoc(doc(firestore, 'users', auth.currentUser!.uid));
      const userDoc = userDocSnap.data();
      if (!userDoc?.orgId) throw new Error('User is not part of an organization.');

      const taskData = {
        ...input,
        orgId: userDoc.orgId,
        assignedBy: auth.currentUser!.uid,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(firestore, 'tasks'), taskData);
      return { success: true, taskId: docRef.id };
    } catch (e) {
      console.error('createTask tool failed:', e);
      return { success: false };
    }
  }
);

const updateTaskStatus = ai.defineTool(
  {
    name: 'updateTaskStatus',
    description: 'Updates the status of an existing task.',
    inputSchema: UpdateTaskStatusInputSchema,
    outputSchema: z.object({ success: z.boolean(), updatedCount: z.number() }),
  },
  async (input) => {
    try {
      const { firestore, auth } = getSdks();
      const userDocSnap = await getDoc(doc(firestore, 'users', auth.currentUser!.uid));
      const userDoc = userDocSnap.data();
      if (!userDoc?.orgId) throw new Error('User is not part of an organization.');

      const q = query(
        collection(firestore, 'tasks'),
        where('orgId', '==', userDoc.orgId),
        where('title', '==', input.taskTitle)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return { success: false, updatedCount: 0 };
      }
      
      let updatedCount = 0;
      for (const docSnap of querySnapshot.docs) {
          // In a real app, you might have more complex logic to find the exact task.
          // For now, we update the first one found.
          await updateDoc(doc(firestore, 'tasks', docSnap.id), { status: input.newStatus });
          updatedCount++;
          break; 
      }

      return { success: true, updatedCount };
    } catch (e) {
      console.error('updateTaskStatus tool failed:', e);
      return { success: false, updatedCount: 0 };
    }
  }
);


const findTasks = ai.defineTool(
    {
      name: 'findTasks',
      description: 'Finds tasks based on assignee or status.',
      inputSchema: FindTasksInputSchema,
      outputSchema: z.array(z.object({
          id: z.string(),
          title: z.string(),
          assignee: z.string(),
          status: z.string(),
          dueDate: z.string(),
      })),
    },
    async (input) => {
      try {
        const { firestore, auth } = getSdks();
        const userDocSnap = await getDoc(doc(firestore, 'users', auth.currentUser!.uid));
        const userDoc = userDocSnap.data();
        if (!userDoc?.orgId) throw new Error('User is not part of an organization.');
        
        const conditions = [where('orgId', '==', userDoc.orgId)];
        if (input.assignee) {
            conditions.push(where('assignee', '==', input.assignee));
        }
        if (input.status) {
            conditions.push(where('status', '==', input.status));
        }
  
        const q = query(collection(firestore, 'tasks'), ...conditions);
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any;

      } catch (e) {
        console.error('findTasks tool failed:', e);
        return [];
      }
    }
);


// The Main AI Flow
const receptionFlow = ai.defineFlow(
  {
    name: 'receptionFlow',
    inputSchema: z.object({
      query: z.string(),
      currentQueue: z.any().describe("JSON string of the current patient queue."),
      currentTasks: z.any().describe("JSON string of the current tasks."),
    }),
    outputSchema: z.object({
      response: z.string(),
      updatedQueue: z.any().optional(),
    }),
    
  },
  async (input) => {
    const result = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview',
      prompt: `You are an AI reception assistant for a medical clinic. Your responsibilities include booking appointments, answering questions, managing the patient queue, and managing staff tasks. Use the provided tools to modify tasks when requested. Be conversational and helpful.

Current Time: ${new Date().toLocaleTimeString()}
Current Patient Queue: ${JSON.stringify(input.currentQueue, null, 2)}
Current Tasks: ${JSON.stringify(input.currentTasks, null, 2)}

User Query: "${input.query}"

First, determine the user's intent. 
- If it's a general question, answer it.
- If it's about the patient queue, formulate a response and, if necessary, an updated queue object.
- If it's about managing tasks (creating, updating, deleting, listing), use the available tools. Ask clarifying questions if required to get all the information needed for a tool. For example, if a user wants to create a task, you need a title, patient, assignee, due date, and priority.
- After a tool is used successfully, formulate a confirmation message to the user.
`,
      tools: [createTask, updateTaskStatus, findTasks],
    });

    const text = result.text;
    const toolCalls = result.toolCalls;

    if (toolCalls.length > 0) {
      const toolResponses = await ai.runTools({
        tools: { createTask, updateTaskStatus, findTasks },
        calls: toolCalls,
      });

      // After running tools, generate a final response to the user
      const finalResponse = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview',
        prompt: `The user's request was to "${input.query}". You used your tools and got the following results: ${JSON.stringify(toolResponses)}. Formulate a clear, concise, and friendly response to the user confirming what you have done.`,
        tools: [], // No further tool use needed
      });
      return { response: finalResponse.text };
    }
    
    // If no tool was called, try to parse for queue updates (legacy functionality)
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[2];
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.response) {
          return parsed;
        }
      } catch (e) {
        // Not valid JSON, so just return the text
        return { response: text };
      }
    }

    return { response: text };
  }
);


export async function aiReceptionAssistant(input: z.infer<typeof receptionFlow.inputSchema>) {
    return receptionFlow(input);
}

    