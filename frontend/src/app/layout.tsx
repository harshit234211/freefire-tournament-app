import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron, Rajdhani } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const orbitron = Orbitron({ 
  subsets: ['latin'],
  variable: '--font-orbitron',
});

const rajdhani = Rajdhani({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rajdhani',
});

export const metadata: Metadata = {
  title: 'FragArena - Play. Fight. Conquer.',
  description: 'Professional Free Fire Esports Tournament Platform',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FragArena',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${orbitron.variable} ${rajdhani.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-darkBg text-slate-100 antialiased selection:bg-neonRed selection:text-white">
        {children}
      </body>
    </html>
  );
}
