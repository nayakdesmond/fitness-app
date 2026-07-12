import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Navigation from "@/components/Navigation"
import { ToastProvider } from "@/components/Toast"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Fitness Tracker",
  description: "Track your 8-week cut",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50`}>
        <ToastProvider>
          <Suspense fallback={null}>
            <Navigation />
          </Suspense>
          <main className="pb-24 pt-4">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  )
}