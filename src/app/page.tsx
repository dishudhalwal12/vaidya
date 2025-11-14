'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Activity,
  CreditCard,
  Users,
  Loader2,
} from "lucide-react"

import Overview from "@/components/dashboard/overview"
import { RecentAppointments } from "@/components/dashboard/recent-appointments"
import { IndianRupee } from "lucide-react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { collection, query, where } from "firebase/firestore";
import type { Patient } from "./patients/page";

export default function DashboardPage() {
  const { user, isUserLoading, profile } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.orgId) return null;
    return query(collection(firestore, 'patients'), where('orgId', '==', profile.orgId));
  }, [firestore, profile?.orgId]);

  const { data: patients, isLoading: patientsLoading } = useCollection<Patient>(patientsQuery);

  const dashboardStats = useMemo(() => {
    if (!patients) {
      return {
        totalRevenue: 0,
        patientsSeen: 0,
        avgConsultationFee: 0,
        noShowRate: 0,
        revenueByMonth: new Array(12).fill(0),
      };
    }

    const totalRevenue = patients.reduce((acc, patient) => acc + (patient.consultationFee || 0), 0);
    const patientsSeen = patients.length;
    const avgConsultationFee = patientsSeen > 0 ? totalRevenue / patientsSeen : 0;

    const revenueByMonth = new Array(12).fill(0);
    patients.forEach(patient => {
        if (patient.createdAt?.toDate) { // Check if createdAt is a Firestore Timestamp
            const month = patient.createdAt.toDate().getMonth();
            revenueByMonth[month] += patient.consultationFee || 0;
        }
    });

    return {
      totalRevenue,
      patientsSeen,
      avgConsultationFee,
      noShowRate: 0, // Placeholder
      revenueByMonth,
    };
  }, [patients]);
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const overviewData = dashboardStats.revenueByMonth.map((total, index) => ({
      name: monthNames[index],
      total,
  }));


  if (isUserLoading || !user || !profile || patientsLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboardStats.totalRevenue.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">
              Based on {dashboardStats.patientsSeen} consultations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Patients Seen
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{dashboardStats.patientsSeen}</div>
            <p className="text-xs text-muted-foreground">
              Total patients this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Consultation Fee</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dashboardStats.avgConsultationFee.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across all visit types
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.noShowRate}%</div>
            <p className="text-xs text-muted-foreground">
              No appointments yet.
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview data={overviewData} />
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
            <CardDescription>
              You have no appointments today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentAppointments />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
