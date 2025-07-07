
'use client';
import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth as firebaseAuth, db } from '@/lib/firebase';
import { Lightbulb, Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { onSnapshot, doc } from "firebase/firestore";
import { 
    type AppSettings,
    saveSettings,
    getSettingsFromCache,
    saveSettingsToCache,
    defaultSettings
} from '@/lib/storage';

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
        const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setLoading(false);
                setSettings(null);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return; // Don't run if there is no user.

        const getInitialSettings = (): AppSettings => ({
            ...defaultSettings,
            monthlyCreditsLastUpdated: new Date().toISOString(),
        });

        const docRef = doc(db, "settings", user.uid);
        const unsubscribe = onSnapshot(docRef, async (docSnap) => {
            let currentSettings: AppSettings;

            if (docSnap.exists()) {
                currentSettings = { ...getInitialSettings(), ...docSnap.data() };
            } else {
                currentSettings = getSettingsFromCache(user.uid) || getInitialSettings();
                await saveSettings(currentSettings, user.uid); // Create the doc in Firestore
            }
            
            let settingsModified = false;

            // Check for subscription expiration
            if (currentSettings.isPro && currentSettings.subscriptionEndsAt) {
                if (new Date() > new Date(currentSettings.subscriptionEndsAt)) {
                    currentSettings.isPro = false;
                    currentSettings.cloudSyncEnabled = false;
                    currentSettings.autoCloudSync = false;
                    settingsModified = true;
                }
            }

            // Monthly credit refresh logic for Free users
            if (!currentSettings.isPro && currentSettings.planSelected) {
                const lastUpdate = new Date(currentSettings.monthlyCreditsLastUpdated);
                const now = new Date();
                if (now.getFullYear() > lastUpdate.getFullYear() || now.getMonth() > lastUpdate.getMonth()) {
                    currentSettings.aiCredits = (currentSettings.aiCredits || 0) + 2;
                    currentSettings.monthlyCreditsLastUpdated = now.toISOString();
                    settingsModified = true;
                }
            }

            if (settingsModified) {
                // Save the modified settings back to Firestore.
                // This will trigger another snapshot, but the logic is idempotent so it's safe.
                await saveSettings(currentSettings, user.uid);
            }

            setSettings(currentSettings);
            saveSettingsToCache(currentSettings, user.uid); // Keep local cache in sync
            setLoading(false);

        }, (error) => {
            console.error("Firebase listener error, falling back to cached settings:", error);
            const cachedSettings = getSettingsFromCache(user.uid) || getInitialSettings();
            setSettings(cachedSettings);
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup on unmount or user change
    }, [user]);

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
                    if (isAuthPage) {
                        if (pathname !== '/record') router.push('/record');
                    }
                } else {
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
