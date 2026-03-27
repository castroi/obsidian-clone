import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PwaInit } from '@/components/PwaInit'

export const metadata: Metadata = {
  title: 'Obsidian Clone',
  description: 'A local-first markdown note-taking PWA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Obsidian Clone',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e1e1e',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <PwaInit />
        {children}
      </body>
    </html>
  )
}
