import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";

const suggestedAssessment = `- Uncontrolled Type 2 Diabetes Mellitus (E11.9)
- Hypertension (I10)`;

const suggestedPlan = `- Increase Metformin to 1000mg BID.
- Start Lisinopril 10mg daily.
- Patient to monitor blood glucose twice daily.
- Follow up in 3 months.`;

export default function NotesPage() {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Progress Note</CardTitle>
            <CardDescription>Patient: Sarah Johnson - DOB: 05/20/1988</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Subjective</h3>
              <Textarea placeholder="Patient reports..." />
            </div>
            <div>
              <h3 className="font-medium mb-2">Objective</h3>
              <Textarea placeholder="Vitals, physical exam findings..." />
            </div>
            <div>
              <h3 className="font-medium mb-2">Assessment</h3>
              <Textarea placeholder="Diagnosis and differential diagnosis..." />
            </div>
            <div>
              <h3 className="font-medium mb-2">Plan</h3>
              <Textarea placeholder="Medications, referrals, follow-up..." />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save Note</Button>
          </CardFooter>
        </Card>
      </div>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>AI Draft Assist</CardTitle>
            <CardDescription>AI-generated suggestions based on patient data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Suggested Assessment</h4>
              <div className="text-sm p-3 bg-muted rounded-md prose prose-sm max-w-none">
                <ReactMarkdown>{suggestedAssessment}</ReactMarkdown>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Suggested Plan</h4>
              <div className="text-sm p-3 bg-muted rounded-md prose prose-sm max-w-none">
                <ReactMarkdown>{suggestedPlan}</ReactMarkdown>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-2">
            <Button variant="secondary">Incorporate Suggestions</Button>
            <Button variant="outline">Regenerate</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

    