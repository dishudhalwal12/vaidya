# Vaidya: Your AI-Powered Clinical Copilot

## 1. Vision: Supercharging the Modern Clinic

**Vaidya** is a state-of-the-art, AI-powered clinical operations platform designed to act as a **copilot for doctors**. Our vision is to empower private practitioners by automating administrative burdens, amplifying diagnostic capabilities, and streamlining every facet of clinic management. We handle the operational complexities so you can focus on what truly matters: your patients.

---

## 2. App Description & Current Workflow

**Vaidya** is an intelligent, all-in-one platform for medical clinics that integrates a powerful **AI Diagnostic Copilot** and an **AI Reception Assistant** directly into your workflow. The application is designed for role-based access, catering to Doctors, Admins, and Staff.

### a. User Onboarding & Authentication
The journey begins at the login screen, which serves a dual purpose: authentication for existing users and registration for new ones.
*   **Sign-Up:** New users can create an account via email/password or Google Sign-In. They have three onboarding paths:
    1.  **Create a Private Clinic:** Automatically assigns the user a "Doctor" role and creates a new clinic organization.
    2.  **Create a Hospital:** Assigns the user an "Admin" role and creates a new hospital organization.
    3.  **Join with Invite Code:** Allows a new user to join an existing organization. Their role ('doctor' or 'staff') is determined by the invite code.
*   **Login:** Existing users can sign in with their credentials. The system automatically recognizes their role and directs them to the appropriate starting page.

### b. Role-Based Dashboards & Navigation
Once logged in, the user experience is tailored to their role.
*   **Doctor View:** Doctors have access to the full suite of clinical tools, including the main dashboard, smart notes, patient management, billing, telehealth, AI reception, and practice insights.
*   **Admin View:** Admins are directed to the Admin Panel to manage the organization, create invite codes for new staff/doctors, and view high-level practice reports.
*   **Staff View:** Staff members have a focused view, primarily seeing their assigned tasks on a personal task board.

### c. Core Clinical & Administrative Features

**1. Main Dashboard (Doctor's Homepage)**
This is the command center, providing a real-time snapshot of the clinic's health.
*   **Key Metrics:** Displays live-calculated `Total Revenue`, `Patients Seen`, and `Average Consultation Fee` based on patient records in Firestore.
*   **Revenue Overview:** A bar chart visualizes monthly revenue trends.

**2. Patient Management**
A centralized hub for all patient information.
*   **Patient List:** View all patients in the organization with their status and last visit details.
*   **Add New Patient:** A dialog allows for quick registration of new patients. You can select a visit type:
    *   **OPD:** Sets a fixed consultation fee of ₹500.
    *   **Emergency:** Allows for a custom, user-inputted fee.
*   These fees are immediately reflected in the dashboard's financial metrics upon saving.

**3. AI Diagnostic Copilot (Patient Profile Page)**
This is the application's crown jewel.
*   **Upload & Analyze:** Upload a patient's health report (currently parses `.txt` files).
*   **AI Diagnosis:** Trigger an AI analysis that provides a detailed breakdown:
    *   **AI Summary & Key Abnormalities:** Highlights critical findings.
    *   **Potential & Differential Diagnoses:** Lists possibilities with confidence scores and reasoning.
    *   **Pathophysiology & Follow-ups:** Offers deep insights and actionable next steps.
*   **Interactive AI Chat:** Ask follow-up questions about the report. The AI maintains the context of the diagnosis.
*   **AI Prescription Generator:** Based on the final diagnosis, generate a comprehensive, print-ready prescription and management plan.

**4. AI Reception Assistant & Task Management**
A conversational AI to streamline front-desk and internal operations.
*   **Live Patient Queue:** The page displays a live queue of patients, pulled from the Firestore `patients` collection.
*   **Conversational Task Management:** Doctors can chat with the assistant to manage clinic tasks. For example:
    *   *"Create a task to call Mrs. Smith about her results, assign it to Alice, due tomorrow."*
    *   *"What are the pending tasks for today?"*
    *   *"Mark the task 'Review intake forms' as completed."*
*   The AI uses Genkit Tools (`createTask`, `updateTaskStatus`, `findTasks`) to interact directly with the `tasks` collection in your database, making changes in real-time.

**5. Task & Care Plan Manager (Kanban Board)**
A visual, interactive board for managing all clinic tasks.
*   **Drag-and-Drop Interface:** Tasks are displayed in columns: 'To Do', 'In Progress', and 'Completed'. Dragging a task card from one column to another automatically updates its status in the database.
*   **Create & Edit Tasks:** Add new tasks directly from the board or edit existing ones through a dialog.

**6. Other Integrated Features**
*   **Smart Notes:** A dedicated page for drafting clinical SOAP notes with an AI assistant panel to provide suggestions.
*   **AI Billing & Coding:** Paste visit notes to get AI-suggested ICD/CPT codes with confidence scores.
*   **Telehealth:** A page to start and manage secure, one-click video consultations using an integrated Jitsi-based service.
*   **AI Practice Insights:** Generate daily or weekly reports on patient trends, revenue sources, and marketing performance.
*   **Admin & Settings:** Manage organization details, invite codes, and configure your Google AI API key.
