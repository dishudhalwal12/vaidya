
'use client';

import { useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppShell from './AppShell';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Define route accessibility for each role
const DOCTOR_ROUTES = ['/', '/medications', '/notes', '/tasks', '/patients', '/billing', '/telehealth', '/reception', '/reports', '/settings'];
const ADMIN_ROUTES = ['/admin', '/reports', '/tasks', '/patients', '/settings'];
const STAFF_ROUTES = ['/staff-tasks', '/settings'];
const PUBLIC_ROUTES = ['/login'];


export default function AppShellController({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until user auth state and profile are fully loaded
    }

    const isPublicRoute = PUBLIC_ROUTES.some(p => pathname.startsWith(p));

    // Case 1: User is logged in and has a profile
    if (user && profile) {
      let authorizedRoute = false;
      let defaultPath = '/login'; // Fallback

      switch (profile.role) {
        case 'doctor':
          authorizedRoute = DOCTOR_ROUTES.some(p => pathname.startsWith(p) || pathname === '/');
          defaultPath = '/';
          break;
        case 'admin':
          authorizedRoute = ADMIN_ROUTES.some(p => pathname.startsWith(p));
          defaultPath = '/admin';
          break;
        case 'staff':
          authorizedRoute = STAFF_ROUTES.some(p => pathname.startsWith(p));
          defaultPath = '/staff-tasks';
          break;
      }
      
      // If user is on a public page (like login), redirect them to their dashboard
      if (isPublicRoute) {
        router.replace(defaultPath);
        return;
      }

      // If user is on a page they are not authorized for, redirect them
      if (!authorizedRoute) {
         toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You don’t have permission for this page. Redirecting you.",
        });
        router.replace(defaultPath);
        return;
      }
    }
    // Case 2: User is NOT logged in
    else if (!user) {
      // If they are on a protected route, redirect to login
      if (!isPublicRoute) {
        router.replace('/login');
        return;
      }
    }
    
    // Case 3 (Edge case): User is logged in but profile is still being created (right after signup)
    // On the login page, we just wait for the profile to load. The loading screen will handle UI.
    // On other pages, they'll be redirected to /login by the !user check above.

  }, [user, profile, isUserLoading, pathname, router, toast]);


  // Show a full-page loader for protected routes while we check the auth state.
  const isProtectedRoute = !PUBLIC_ROUTES.some(p => pathname.startsWith(p));
  if (isUserLoading && isProtectedRoute) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2 text-muted-foreground">Loading Vaidya...</p>
      </div>
    );
  }

  // Determine if the main AppShell (with sidebar and header) should be rendered.
  const showShell = user && profile && isProtectedRoute;
  
  if (showShell) {
    return <AppShell>{children}</AppShell>;
  }

  // For public routes (like /login) or during the brief moment of redirection, 
  // render the children directly without the shell.
  return <>{children}</>;
}
