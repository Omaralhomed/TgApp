import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Telexa by EMT | المنصة السحابية المتقدمة للتسويق وأتمتة تيليجرام',
  description: 'منظومة تيليكسا (Telexa) من شركة EMT - إدارة حملات تيليجرام السحابية، أتمتة البوتات، وسحب وإدارة الجماهير بدقة فائقة.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#007AFF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-app-bg text-app-text selection:bg-brand-primary selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
