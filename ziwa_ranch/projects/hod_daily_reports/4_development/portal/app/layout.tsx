import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ziwa Rhino And Wildlife Ranch — Daily Reports',
  description: 'HOD daily report submission portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}
