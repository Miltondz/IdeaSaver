
'use client';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth as firebaseAuth, firebaseConfigError } from '@/lib/firebase';
import { Loader2, AlertTriangle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export const AuthContext = createContext<{ user: User | null }>({ user: null });

const FirebaseErrorDisplay = ({ message }: { message: string }) => (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="max-w-2xl rounded-lg border border-destructive bg-card p-6 text-card-foreground shadow-lg">
            <div className="flex items-center gap-4">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <div>
                    <h1 className="text-xl font-bold text-destructive">Configuration Error</h1>
                    <p className="mt-2 text-muted-foreground">The application cannot connect to Firebase.</p>
                </div>
            </div>
            <div className="mt-4 rounded-md bg-muted p-4 font-mono text-sm text-destructive-foreground">
                {message}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
                You can find these keys in your Firebase project settings. Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Firebase Console</a>, select your project, click the gear icon for 'Project settings', and under the 'General' tab, scroll down to 'Your apps' to find your web app configuration. Then, add them to the `.env` file in your project.
            </p>
        </div>
    </div>
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // Check for config error first
    if (firebaseConfigError) {
        return <FirebaseErrorDisplay message={firebaseConfigError} />;
    }
    
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!firebaseAuth) { // Guard against null auth object
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (loading) return;

        const isAuthPage = pathname === '/';

        if (!user && !isAuthPage) {
            router.push('/');
        }
        if (user && isAuthPage) {
            router.push('/record');
        }
    }, [user, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
