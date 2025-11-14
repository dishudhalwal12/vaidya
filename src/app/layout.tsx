import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import AppShellController from '@/components/AppShellController';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Vaidya',
  description: 'An AI-Powered Clinical Operations Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-body antialiased ${inter.variable}`}>
        <FirebaseClientProvider>
          <AppShellController>{children}</AppShellController>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
