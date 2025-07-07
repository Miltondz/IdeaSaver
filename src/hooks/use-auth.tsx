
'use client';
import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth as firebaseAuth, db } from '@/lib/firebase';
import { Lightbulb, Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { onSnapshot, doc, getDoc } from "firebase/firestore";
import { 
    type AppSettings,
    saveSettings,
    getSettingsFromCache,
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
        if (user && db) {
            try {
                const docRef = doc(db, "settings", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings({ ...defaultSettings, monthlyCreditsLastUpdated: new Date().toISOString(), ...docSnap.data() } as AppSettings);
                }
            } catch (e) {
                console.error("Failed to refresh settings", e);
            }
        }
    }, [user]);

    // Effect for handling Firebase authentication state
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setSettings(null);
                setLoading(false);
            } else {
                // When user logs in, set loading to true until settings are fetched
                setLoading(true);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // Effect for listening to settings changes from Firestore
    useEffect(() => {
        if (!user) {
            return;
        }

        if (!db) {
            console.error("Firestore DB is not available. Falling back to cache.");
            const cachedSettings = getSettingsFromCache(user.uid) || { ...defaultSettings, monthlyCreditsLastUpdated: new Date().toISOString() };
            setSettings(cachedSettings);
            setLoading(false);
            return;
        }

        const docRef = doc(db, "settings", user.uid);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            const getInitialSettings = (): AppSettings => ({
                ...defaultSettings,
                monthlyCreditsLastUpdated: new Date().toISOString(),
            });

            if (docSnap.exists()) {
                setSettings({ ...getInitialSettings(), ...docSnap.data() });
            } else {
                saveSettings(getInitialSettings(), user.uid);
                // Listener will re-fire with the new document.
            }
            setLoading(false);
        }, (error) => {
            console.error("Firebase listener error, falling back to cache:", error);
            const cachedSettings = getSettingsFromCache(user.uid) || { ...defaultSettings, monthlyCreditsLastUpdated: new Date().toISOString() };
            setSettings(cachedSettings);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Effect for handling subscription business logic based on settings
    useEffect(() => {
        if (!user || !settings) return;

        let settingsModified = false;
        const newSettings = { ...settings };

        if (newSettings.isPro && newSettings.subscriptionEndsAt && new Date() > new Date(newSettings.subscriptionEndsAt)) {
            console.log(`User ${user.uid}'s Pro plan expired. Downgrading.`);
            newSettings.isPro = false;
            newSettings.cloudSyncEnabled = false;
            newSettings.autoCloudSync = false;
            settingsModified = true;
        }

        if (!newSettings.isPro && newSettings.planSelected) {
            const lastUpdate = new Date(newSettings.monthlyCreditsLastUpdated);
            const now = new Date();
            if (now.getFullYear() > lastUpdate.getFullYear() || now.getMonth() > lastUpdate.getMonth()) {
                console.log(`Refreshing monthly credits for user ${user.uid}.`);
                newSettings.aiCredits = (newSettings.aiCredits || 0) + 2;
                newSettings.monthlyCreditsLastUpdated = now.toISOString();
                settingsModified = true;
            }
        }

        if (settingsModified) {
            saveSettings(newSettings, user.uid);
        }
    }, [settings, user]);

    // Effect for routing users based on their auth state and settings
    useEffect(() => {
        if (loading) return;

        const publicPages = ['/', '/pricing', '/forgot-password', '/terms', '/privacy', '/about'];

        if (!user) {
            if (!publicPages.includes(pathname)) {
                router.push('/');
            }
            return;
        }
        
        // At this point, user is logged in.
        if (settings) {
            if (settings.planSelected) {
                // User has a plan, if they are on the login page, send them to record.
                if (pathname === '/') {
                    router.push('/record');
                }
            } else {
                // User does not have a plan selected. Force them to pricing page,
                // allowing access to a few other essential pages.
                const allowedNoPlanPages = ['/pricing', '/terms', '/privacy', '/about'];
                if (!allowedNoPlanPages.includes(pathname)) {
                    router.push('/pricing');
                }
            }
        }
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
}

export const useAuth = () => useContext(AuthContext);
