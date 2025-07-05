
'use client';
import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import { Lightbulb, Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getSettings, type AppSettings } from '@/lib/storage';

export const AuthContext = createContext<{ user: User | null; settings: AppSettings | null; loading: boolean; refreshSettings: () => Promise<void>; }>({ user: null, settings: null, loading: true, refreshSettings: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const refreshSettings = useCallback(async () => {
        if (user) {
            const userSettings = await getSettings(user.uid);
            setSettings(userSettings);
        }
    }, [user]);

    useEffect(() => {
        if (!firebaseAuth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const userSettings = await getSettings(currentUser.uid);
                setSettings(userSettings);
            } else {
                setSettings(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const routeUser = () => {
            if (loading) return;

            const publicPages = ['/', '/pricing', '/forgot-password', '/terms', '/privacy', '/about'];

            if (!user) {
                if (!publicPages.includes(pathname)) {
                    if (pathname !== '/') router.push('/');
                }
                return;
            }
            
            if (settings) {
                const isAuthPage = pathname === '/';
                const isPricingPage = pathname === '/pricing';

                if (settings.planSelected) {
                    // If a user has a plan selected, they should be redirected from the
                    // auth page to the main app. They should be allowed to visit the pricing page.
                    if (isAuthPage) {
                        if (pathname !== '/record') router.push('/record');
                    }
                } else {
                    // If a user has NOT selected a plan, they should be forced to the pricing page
                    // if they try to access any non-public, non-auth page.
                    if (!isPricingPage && !isAuthPage) {
                        if (pathname !== '/pricing') router.push('/pricing');
                    }
                }
            }
        };

        routeUser();
    }, [user, settings, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
                <div className="bg-primary/10 border border-primary/20 rounded-full p-4">
                    <Lightbulb className="h-12 w-12 text-primary" />
                </div>
                <div className="flex items-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="ml-3 text-lg">Loading App...</p>
                </div>
            </div>
        );
    }
    
    return <AuthContext.Provider value={{ user, settings, loading, refreshSettings }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
