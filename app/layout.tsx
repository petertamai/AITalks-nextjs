import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'  // Changed from @next/font
import './globals.css'

const nunito = Nunito({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Conversation System - by Piotr Tamulewicz',
  description: 'A modern AI conversation system built with Next.js and OpenRouter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${nunito.className} bg-custom-bg text-white min-h-screen`}>
        {children}
      </body>
    </html>
  )
}