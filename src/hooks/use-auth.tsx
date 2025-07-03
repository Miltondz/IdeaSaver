
'use client';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getSettings } from '@/lib/storage';

export const AuthContext = createContext<{ user: User | null }>({ user: null });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!firebaseAuth) {
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

        const settings = getSettings(user?.uid);
        const isAuthPage = pathname === '/';
        const isPricingPage = pathname === '/pricing';

        // --- Logged out user routing ---
        if (!user) {
            const isPublicPage = isAuthPage || isPricingPage || pathname.startsWith('/about');
            if (!isPublicPage) {
                router.push('/');
            }
            return;
        }

        // --- Logged in user routing ---
        if (settings.planSelected) {
            // User has completed onboarding, redirect them to the app if they land on auth/pricing pages.
            if (isAuthPage || isPricingPage) {
                router.push('/record');
            }
        } else {
            // User has NOT completed onboarding. They must select a plan.
            // This happens right after signup.
            if (!isPricingPage && !isAuthPage) {
                // If they try to navigate anywhere else (e.g. /history), force them to /pricing.
                // We allow isAuthPage to prevent a redirect loop immediately after signup.
                router.push('/pricing');
            }
        }
    }, [user, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // If we're still loading the user object on a protected page, don't render children yet.
    const isProtectedPage = !['/', '/pricing', '/about'].includes(pathname);
    if (loading && isProtectedPage) {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    // On initial load, if there's no user and we're on a protected page,
    // the redirect will be triggered by the useEffect, so we can return null to avoid flicker.
    if (!user && isProtectedPage) {
        return null;
    }


    return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
