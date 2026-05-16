import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'COD Command Center',
  description: 'Private cash-on-delivery e-commerce command center — manage orders, products, and landing pages.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
