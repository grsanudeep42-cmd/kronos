import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KRONOS OS',
  description: 'God of Time. Master of the Web.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}