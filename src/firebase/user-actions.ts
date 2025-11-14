'use client';

import { 
    getFirestore, 
    Timestamp, 
    collection,
    doc,
    writeBatch,
    query,
    where,
    getDocs,
    limit,
    increment,
    addDoc,
    getDoc,
    type Firestore
} from 'firebase/firestore';
import { getAuth, updateProfile, type Auth } from 'firebase/auth';
import { customAlphabet } from 'nanoid';

export type SignupFormData = {
    userId: string;
    onboardingType: 'private' | 'hospital' | 'invite';
    fullName: string;
    email: string;
    phoneNumber: string;
    role?: 'doctor' | 'admin' | 'staff';
    orgName?: string;
    orgAddress?: string;
    inviteCode?: string;
};

export type Invite = {
    id: string;
    orgId: string;
    code: string;
    createdBy: string;
    roleAllowed: 'doctor' | 'staff';
    expiresAt: number | null;
    maxUses: number;
    usesCount: number;

    createdAt: any;
}

async function validateInviteCode(firestore: Firestore, code: string): Promise<{ valid: boolean; invite?: Invite, error?: string; }> {
    const invitesRef = collection(firestore, 'invites');
    const q = query(invitesRef, where('code', '==', code), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return { valid: false, error: 'Invite code not found.' };
    }

    const inviteDoc = snapshot.docs[0];
    const inviteData = inviteDoc.data() as Omit<Invite, 'id'>;

    if (inviteData.expiresAt && Date.now() > inviteData.expiresAt) {
        return { valid: false, error: 'Invite code has expired.' };
    }

    if (inviteData.maxUses !== -1 && inviteData.usesCount >= inviteData.maxUses) {
        return { valid: false, error: 'Invite code has reached its maximum uses.' };
    }

    return { valid: true, invite: { ...inviteData, id: inviteDoc.id } };
}

export function processNewUser(
    firestore: Firestore,
    auth: Auth,
    signupData: SignupFormData
): void {
    const process = async () => {
        const { userId } = signupData;
        if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
            throw new Error("User must be authenticated to process registration.");
        }

        const batch = writeBatch(firestore);
        const userDocRef = doc(firestore, 'users', userId);
        
        let orgId = '';
        let orgType: 'private' | 'hospital' = 'private';
        let userRole: 'doctor' | 'admin' | 'staff' = 'doctor';

        if (signupData.onboardingType === 'private' || signupData.onboardingType === 'hospital') {
            const orgDocRef = doc(collection(firestore, 'orgs'));
            orgId = orgDocRef.id;
            orgType = signupData.onboardingType;
            userRole = signupData.onboardingType === 'hospital' ? 'admin' : 'doctor';

            batch.set(orgDocRef, {
                id: orgId,
                name: signupData.orgName,
                address: signupData.orgAddress,
                type: signupData.onboardingType,
                ownerId: userId,
                status: 'active',
                createdAt: Timestamp.now(),
            });

        } else if (signupData.onboardingType === 'invite') {
            if (!signupData.inviteCode) {
                throw new Error("Invite code is required.");
            }
            const validation = await validateInviteCode(firestore, signupData.inviteCode);
            if (!validation.valid || !validation.invite) {
                throw new Error(validation.error || "Invalid invite code.");
            }

            const invite = validation.invite;
            orgId = invite.orgId;
            userRole = invite.roleAllowed;
            
            const orgDoc = await getDoc(doc(firestore, 'orgs', orgId));
            if(!orgDoc.exists()) throw new Error("Organization associated with invite not found.");
            orgType = orgDoc.data()?.type as 'private' | 'hospital';

            const inviteRef = doc(firestore, 'invites', invite.id);
            batch.update(inviteRef, { usesCount: increment(1) });
        } else {
            throw new Error("Invalid onboarding type.");
        }

        // Update the user's display name in Firebase Auth
        await updateProfile(auth.currentUser, { displayName: signupData.fullName });

        // Set the user document with role and org info
        batch.set(userDocRef, {
            id: userId,
            name: signupData.fullName,
            email: signupData.email,
            phone: `+91${signupData.phoneNumber}`,
            role: userRole,
            orgId: orgId,
            orgType: orgType,
            createdAt: Timestamp.now(),
        });
        
        await batch.commit();

        // Reload the user to ensure onAuthStateChanged picks up the display name change
        await auth.currentUser.reload();
    };

    // Fire-and-forget the async process
    process().catch(error => {
        console.error("Error processing new user in background:", error);
        // In a real app, you might want to add more robust error handling here,
        // like logging to a service or notifying the user if the process fails.
    });
}

export async function createInvite(
    firestore: Firestore,
    { orgId, createdBy, roleAllowed }: { orgId: string, createdBy: string, roleAllowed: 'doctor' | 'staff' }
): Promise<string> {
    
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nanoid = customAlphabet(alphabet, 8);
    const code = `${roleAllowed.toUpperCase().slice(0,3)}-${nanoid()}`;

    const newInvite = {
        orgId,
        code,
        createdBy,
        roleAllowed,
        expiresAt: null, // No expiration by default
        maxUses: -1,     // Unlimited uses by default
        usesCount: 0,
        createdAt: Timestamp.now(),
    };
    
    await addDoc(collection(firestore, 'invites'), newInvite);
    
    return code;
}
