'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Copy, MoreHorizontal, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { createInvite } from '@/firebase/user-actions';
import { collection, query, where, type DocumentData } from 'firebase/firestore';

// Define the type for the invite document
interface Invite extends DocumentData {
    id: string;
    code: string;
    roleAllowed: 'doctor' | 'staff';
    usesCount: number;
    maxUses: number;
    expiresAt: number | null;
}

const members = [
    { id: 'user-1', name: 'Dr. Evelyn Reed', role: 'doctor', status: 'Active' },
    { id: 'user-2', name: 'Dr. Marcus Chen', role: 'doctor', status: 'Active' },
    { id: 'user-3', name: 'Alice Johnson', role: 'staff', status: 'Active' },
    { id: 'user-4', name: 'pending.invite@email.com', role: 'staff', status: 'Pending Invite' },
];

export default function AdminPage() {
    const { toast } = useToast();
    const { user, profile } = useUser();
    const firestore = useFirestore();
    const [isCreatingInvite, setIsCreatingInvite] = React.useState(false);

    const invitesQuery = useMemoFirebase(() => {
        if (!firestore || !profile?.orgId) return null;
        return query(collection(firestore, 'invites'), where('orgId', '==', profile.orgId));
    }, [firestore, profile?.orgId]);

    const { data: inviteCodes, isLoading: invitesLoading } = useCollection<Invite>(invitesQuery);


    const handleCreateInvite = async () => {
        if (!user || !profile?.orgId || !firestore) return;
        setIsCreatingInvite(true);
        try {
            const newCode = await createInvite(firestore, {
                orgId: profile.orgId,
                createdBy: user.uid,
                roleAllowed: 'doctor', // For now, only allowing doctors to be invited
            });
            toast({
                title: "Invite Code Created",
                description: `New code: ${newCode}. It is now active.`,
            });
        } catch (error) {
            console.error("Error creating invite:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not create invite code.',
            });
        } finally {
            setIsCreatingInvite(false);
        }
    };

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({
            title: "Copied to Clipboard",
            description: `Invite code "${code}" has been copied.`,
        });
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Admin Panel</CardTitle>
                    <CardDescription>Manage your organization, members, and invites.</CardDescription>
                </CardHeader>
                <CardContent>
                    <h3 className="font-semibold text-lg mb-2">Welcome, {user?.displayName || 'Admin'}!</h3>
                    <p className="text-muted-foreground">This is your central hub for managing {profile?.orgName || 'your organization'}.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Invite Codes</CardTitle>
                        <CardDescription>Manage invite codes for new members.</CardDescription>
                    </div>
                    <Button onClick={handleCreateInvite} disabled={isCreatingInvite || !firestore}>
                        {isCreatingInvite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        Create Invite Code
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Allowed Role</TableHead>
                                <TableHead>Uses</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invitesLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            )}
                            {inviteCodes && inviteCodes.length === 0 && !invitesLoading && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No invite codes created yet.
                                    </TableCell>
                                </TableRow>
                            )}
                            {inviteCodes && inviteCodes.map(invite => (
                                <TableRow key={invite.id}>
                                    <TableCell className="font-mono">{invite.code}</TableCell>
                                    <TableCell><Badge variant="secondary">{invite.roleAllowed}</Badge></TableCell>
                                    <TableCell>{invite.usesCount}/{invite.maxUses === -1 ? 'Unlimited' : invite.maxUses}</TableCell>
                                    <TableCell>{invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'Never'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" onClick={() => handleCopyCode(invite.code)}>
                                            <Copy className="mr-2 h-3 w-3" />
                                            Copy
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Members</CardTitle>
                    <CardDescription>View and manage the members of your organization.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map(member => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">{member.name}</TableCell>
                                    <TableCell><Badge variant={member.role === 'doctor' ? 'default' : 'secondary'}>{member.role}</Badge></TableCell>
                                    <TableCell><Badge variant={member.status === 'Active' ? 'secondary' : 'outline'}>{member.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                         <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button aria-haspopup="true" size="icon" variant="ghost">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Toggle menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>View Profile</DropdownMenuItem>
                                                <DropdownMenuItem>Change Role</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">Remove Member</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}