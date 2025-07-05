
'use client';
import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { en } from '@/lib/locales/en';
import { es } from '@/lib/locales/es';

type Language = 'en' | 'es';

const translations = { en, es };

interface LanguageContextType {
  language: Language;
  t: (key: keyof typeof en, replacements?: Record<string, string | number>) => string;
  toggleLanguage: () => void;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState<Language>('en'); // Default to English, will be updated by effect

    useEffect(() => {
        const storedLang = localStorage.getItem('idea-saver-lang') as Language | null;
        if (storedLang) {
            setLanguage(storedLang);
        } else if (typeof window !== 'undefined') {
            // If no preference stored, detect browser language
            const browserLang = navigator.language.split(/[-_]/)[0];
            const newLang = browserLang === 'es' ? 'es' : 'en';
            setLanguage(newLang);
            localStorage.setItem('idea-saver-lang', newLang);
        }
    }, []);

    const toggleLanguage = () => {
        setLanguage(prevLang => {
            const newLang = prevLang === 'en' ? 'es' : 'en';
            localStorage.setItem('idea-saver-lang', newLang);
            return newLang;
        });
    };

    const t = useCallback((key: keyof typeof en, replacements?: Record<string, string | number>): string => {
        let translation = translations[language][key] || translations['en'][key];
        if (replacements) {
            Object.keys(replacements).forEach(placeholder => {
                const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
                translation = translation.replace(regex, String(replacements[placeholder]));
            });
        }
        return translation;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, t, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
