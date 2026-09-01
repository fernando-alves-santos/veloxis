import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'VELOXIS',
  description: 'Controle de consignado de veículos',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VELOXIS',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0d12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preload" as="image" href="/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
