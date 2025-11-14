
'use client';

import * as React from 'react';
import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stethoscope, Loader2, Eye, EyeOff, Building, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { processNewUser, type SignupFormData } from '@/firebase/user-actions';


const GoogleIcon = () => (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        <path fill="none" d="M1 1h22v22H1z" />
    </svg>
);

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const baseSignupSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  phoneNumber: z.string().min(10, 'Invalid phone number'),
});

const privateClinicSchema = baseSignupSchema.extend({
  onboardingType: z.literal('private'),
  orgName: z.string().min(1, 'Clinic name is required'),
  orgAddress: z.string().min(1, 'Address is required'),
});

const hospitalSchema = baseSignupSchema.extend({
    onboardingType: z.literal('hospital'),
    orgName: z.string().min(1, 'Hospital name is required'),
    orgAddress: z.string().min(1, 'Address is required'),
});

const inviteSchema = baseSignupSchema.extend({
  onboardingType: z.literal('invite'),
  inviteCode: z.string().min(6, 'Invite code is required'),
});

const signupSchema = z.discriminatedUnion("onboardingType", [privateClinicSchema, hospitalSchema, inviteSchema]);

type LoginFormData = z.infer<typeof loginSchema>;


export default function LoginPage() {
  const [formType, setFormType] = useState<'login' | 'signup'>('login');
  const [onboardingType, setOnboardingType] = useState<'private' | 'hospital' | 'invite'>('private');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleUserForOnboarding, setGoogleUserForOnboarding] = useState<User | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  
  const currentFormSchema = formType === 'login' ? loginSchema : signupSchema;

  const { register, handleSubmit, formState: { errors }, control, watch, setValue, reset } = useForm<any>({
    resolver: zodResolver(currentFormSchema),
    defaultValues: {
      onboardingType: 'private',
    }
  });

  const watchedOnboardingType = watch('onboardingType');

  React.useEffect(() => {
    setOnboardingType(watchedOnboardingType);
    setValue('onboardingType', watchedOnboardingType);
  }, [watchedOnboardingType, setValue]);

  const handleAuthError = (error: any) => {
    let title = 'An Error Occurred';
    let description = 'Please check your credentials and try again.';

    switch (error.code) {
        case 'auth/popup-closed-by-user':
            // Don't show a toast for this, as it's user-initiated.
            return;
        case 'auth/operation-not-allowed':
            title = 'Sign-in Method Disabled';
            description = "This sign-in method is not enabled. Please enable it in your Firebase project's Authentication settings.";
            break;
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            title = 'Invalid Credentials';
            description = 'Please check your email and password and try again.';
            break;
        case 'auth/email-already-in-use':
            title = 'Email Already in Use';
            description = 'This email is already registered. Please log in or use a different email.';
            break;
        default:
            if (error.message) {
                title = 'Registration Failed';
                description = error.message;
            }
            break;
    }
    
    toast({
        variant: 'destructive',
        title,
        description,
    });
  };

  const onSubmit: SubmitHandler<LoginFormData | SignupFormData> = async (data) => {
    setIsLoading(true);
    toast({
        title: formType === 'login' ? "Signing In..." : "Creating Account...",
        description: "Please wait while we get things ready for you.",
    });
    try {
      if (formType === 'login') {
        const { email, password } = data as LoginFormData;
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const signupData = data as SignupFormData;
        
        let user: User;

        if (googleUserForOnboarding) {
            user = googleUserForOnboarding;
            // After submitting the form, clear the onboarding state.
            // The AppShellController will then handle the redirect.
            setGoogleUserForOnboarding(null); 
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, signupData.email!, signupData.password!);
            user = userCredential.user;
        }
        
        // Fire-and-forget the processing
        processNewUser(firestore, auth, { ...signupData, userId: user.uid, email: user.email! });
      }
    } catch (error) {
      console.error("Authentication/Signup Error:", error);
      handleAuthError(error);
      setIsLoading(false); // Only reset loading on error
    } 
    // On success, the loading state persists and the AppShellController handles the redirect.
  };
  
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;

        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            // This is a new user, show them the onboarding form
            setGoogleUserForOnboarding(user);
            setFormType('signup');
            reset({ // Pre-fill form with Google data
                fullName: user.displayName || '',
                email: user.email || '',
                phoneNumber: user.phoneNumber || '',
                onboardingType: 'private'
            });
            toast({
                title: `Welcome, ${user.displayName || 'New User'}!`,
                description: "Please complete your registration.",
            });
        } else {
            // Existing user, just log them in
            toast({
                title: "Welcome Back!",
                description: "You have been successfully signed in.",
            });
            // The AppShellController will handle the redirect.
        }
    } catch (error: any) {
        console.error("Google sign-in error:", error);
        handleAuthError(error);
    } finally {
        setIsGoogleLoading(false);
    }
};

  const currentTitle = googleUserForOnboarding ? `Complete your registration, ${googleUserForOnboarding.displayName?.split(' ')[0]}`
                       : formType === 'login' ? 'Sign in to Vaidya'
                       : 'Create your Vaidya Account';

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-3">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="flex justify-center text-primary">
                <Stethoscope className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              {currentTitle}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {!googleUserForOnboarding && (<>Or{' '}
              <button
                onClick={() => setFormType(formType === 'login' ? 'signup' : 'login')}
                className="font-medium text-primary hover:text-primary/90"
                disabled={isLoading || isGoogleLoading}
              >
                {formType === 'login' ? 'create an account' : 'sign in to your account'}
              </button></>)}
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4 rounded-md">
              {formType === 'signup' && (
                <>
                  <RadioGroup 
                    defaultValue="private" 
                    className="grid grid-cols-3 gap-4" 
                    onValueChange={(value: 'private' | 'hospital' | 'invite') => setValue('onboardingType', value)}
                  >
                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground", onboardingType === 'private' && "border-primary")}>
                      <RadioGroupItem value="private" className="sr-only" />
                      <Building className="mb-3 h-6 w-6" />
                      Private Clinic
                    </Label>
                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground", onboardingType === 'hospital' && "border-primary")}>
                      <RadioGroupItem value="hospital" className="sr-only" />
                      <Building className="mb-3 h-6 w-6" />
                      Hospital
                    </Label>
                    <Label className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground", onboardingType === 'invite' && "border-primary")}>
                      <RadioGroupItem value="invite" className="sr-only" />
                      <UserPlus className="mb-3 h-6 w-6" />
                      Join by Invite
                    </Label>
                  </RadioGroup>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" {...register("fullName")} placeholder="Dr. John Doe" />
                        {errors.fullName && <p className="text-destructive text-xs">{`${errors.fullName.message}`}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input id="phoneNumber" {...register("phoneNumber")} type="tel" placeholder="9876543210" />
                         {errors.phoneNumber && <p className="text-destructive text-xs">{`${errors.phoneNumber.message}`}</p>}
                    </div>
                  </div>
                  {onboardingType === 'invite' ? (
                     <div className="space-y-2 !mt-4">
                        <Label htmlFor="inviteCode">Invite Code</Label>
                        <Input id="inviteCode" {...register("inviteCode")} placeholder="Enter code to join an organization" />
                        {errors.inviteCode && <p className="text-destructive text-xs">{`${errors.inviteCode.message}`}</p>}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="orgName">Clinic/Hospital Name</Label>
                        <Input id="orgName" {...register("orgName")} placeholder="Sunrise Wellness Clinic" />
                        {errors.orgName && <p className="text-destructive text-xs">{`${errors.orgName.message}`}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="orgAddress">Clinic/Hospital Address</Label>
                        <Input id="orgAddress" {...register("orgAddress")} placeholder="123 Health St, Wellness City" />
                         {errors.orgAddress && <p className="text-destructive text-xs">{`${errors.orgAddress.message}`}</p>}
                      </div>
                       <div className="space-y-2">
                            <Label>Your Role</Label>
                            <p className="text-sm text-muted-foreground">
                                {onboardingType === 'hospital' 
                                    ? "As the creator of a hospital, you will be an Admin."
                                    : "As the creator of a private clinic, you will be a Doctor."
                                }
                            </p>
                        </div>
                    </>
                  )}
                </>
              )}
              { (formType === 'login' || !googleUserForOnboarding) && (
                <>
                <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" autoComplete="email" {...register("email")} placeholder="john.doe@example.com" disabled={!!googleUserForOnboarding}/>
                    {errors.email && <p className="text-destructive text-xs">{`${errors.email.message}`}</p>}
                </div>
                <div className="relative space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={formType === 'login' ? 'current-password' : 'new-password'}
                    {...register("password")}
                    placeholder="••••••••"
                    />
                    <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-muted-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    {errors.password && <p className="text-destructive text-xs">{`${errors.password.message}`}</p>}
                </div>
                </>
              )}
            </div>

            {formType === 'login' && (
                <div className="flex items-center justify-between">
                <div className="text-sm">
                    <a href="#" className="font-medium text-primary hover:text-primary/90">
                    Forgot your password?
                    </a>
                </div>
                </div>
            )}

            <div>
              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                {(isLoading && !isGoogleLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {formType === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </div>
            {formType === 'login' && !googleUserForOnboarding && (
            <>
             <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
            </div>
            <div>
                 <Button variant="outline" className="w-full" type="button" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                    {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <GoogleIcon />
                    {formType === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
                </Button>
            </div>
            </>
            )}
          </form>
        </div>
      </div>
      <div className="hidden bg-muted lg:block lg:col-span-2">
        <video
          className="h-full w-full object-cover"
          src="/onboarding_video.mp4"
          autoPlay
          loop
          muted
          playsInline
          poster="/onboarding_poster.jpg"
        />
      </div>
    </div>
  );
}
