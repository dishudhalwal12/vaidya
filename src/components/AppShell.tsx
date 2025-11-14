'use client';
import Link from 'next/link';
import * as React from 'react';
import {
  BarChart3,
  BotMessageSquare,
  IndianRupee,
  FileText,
  LayoutGrid,
  ListChecks,
  PanelLeft,
  Search,
  Settings,
  Stethoscope,
  Users,
  Video,
  LogOut,
  ShieldCheck,
  BriefcaseMedical,
  Pill
} from 'lucide-react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth, useUser } from '@/firebase';

const doctorNavItems = [
  { href: '/', icon: LayoutGrid, label: 'Dashboard' },
  { href: '/medications', icon: Pill, label: 'Medications' },
  { href: '/notes', icon: FileText, label: 'Smart Notes' },
  { href: '/tasks', icon: ListChecks, label: 'Assign Tasks' },
  { href: '/patients', icon: Users, label: 'Patients' },
  { href: '/billing', icon: IndianRupee, label: 'Billing & Coding' },
  { href: '/telehealth', icon: Video, label: 'Telehealth' },
  { href: '/reception', icon: BotMessageSquare, label: 'AI Reception' },
  { href: '/reports', icon: BarChart3, label: 'Practice Insights' },
];

const adminNavItems = [
    { href: '/admin', icon: ShieldCheck, label: 'Admin Panel' },
    { href: '/reports', icon: BarChart3, label: 'Practice Insights' },
    { href: '/tasks', icon: ListChecks, label: 'All Tasks' },
    { href: '/patients', icon: Users, label: 'All Patients' },
];

const staffNavItems = [
    { href: '/staff-tasks', icon: BriefcaseMedical, label: 'My Tasks' },
]

function NavLink({
  href,
  icon: Icon,
  label,
  isMobile = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (isMobile) {
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-4 px-2.5',
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
        {label}
      </Link>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{label}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function UserMenu() {
    const { user, profile } = useUser();
    const auth = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        auth.signOut();
        router.push('/login');
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || "User"} />
              <AvatarFallback>{profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{profile?.name || user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

function capitalize(str: string) {
    if (!str) return '';
    // Handle special case for 'staff-tasks'
    if (str === 'staff-tasks') return 'My Tasks';
    return str.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function generateBreadcrumbs(pathname: string) {
    const paths = pathname.split('/').filter(p => p);
    
    // Default breadcrumb for root
    if (paths.length === 0) {
        return (
            <>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href="/">Home</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
            </>
        );
    }
  
    return (
      <>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {paths.map((path, index) => {
          const href = '/' + paths.slice(0, index + 1).join('/');
          const isLast = index === paths.length - 1;
          const label = capitalize(path);
  
          return (
            <React.Fragment key={href}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </>
    );
  }

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);
  const { profile } = useUser();
  
  let navItems = doctorNavItems; // Default
  if (profile?.role === 'admin') {
      navItems = adminNavItems;
  } else if (profile?.role === 'staff') {
      navItems = staffNavItems;
  } else if (profile?.role === 'doctor') {
      navItems = doctorNavItems;
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Stethoscope className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">Vaidya</span>
          </Link>
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <NavLink href="/settings" icon={Settings} label="Settings" />
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="#"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <Stethoscope className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">Vaidya</span>
                </Link>
                {navItems.map((item) => (
                    <NavLink key={item.href} {...item} isMobile={true} />
                ))}
                <NavLink href="/settings" icon={Settings} label="Settings" isMobile={true} />
              </nav>
            </SheetContent>
          </Sheet>
          <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
                {breadcrumbs}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
            />
          </div>
          <UserMenu />
        </header>
        <main className="p-4 sm:px-6 sm:py-0">{children}</main>
      </div>
    </div>
  );
}
