
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from '@/components/AppShell';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { LanguageProvider } from '@/hooks/use-language';
import { NavigationLoaderProvider } from '@/hooks/use-navigation-loader';

export const metadata: Metadata = {
  metadataBase: new URL('https://ideasaver.site'),
  title: 'Idea Saver',
  description: 'Quickly capture and transcribe your ideas.',
  manifest: '/manifest.json',
};

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-pt-sans'
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={ptSans.variable}>
      <head>
        <meta name="theme-color" content="#6f29ef" />
        <link rel="apple-touch-icon" href="/icon.svg"></link>
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
              <NavigationLoaderProvider>
                <AppShell>
                  {children}
                </AppShell>
                <Toaster />
              </NavigationLoaderProvider>
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
