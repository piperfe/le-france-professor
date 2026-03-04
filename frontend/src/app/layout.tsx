import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Le France Professor',
  description: 'Apprenez le français avec votre tuteur personnel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  )
}
