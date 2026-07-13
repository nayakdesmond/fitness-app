import type { Metadata, Viewport } from "next"
import { Anton, Oswald } from "next/font/google"
import "./globals.css"
import Navigation from "@/components/Navigation"
import TopBar from "@/components/TopBar"
import { ToastProvider } from "@/components/Toast"
import { Suspense } from "react"

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
})

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Train with Dara",
  description: "Personal training & nutrition coaching — hustle for the muscle",
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
    <html lang="en" className={`dark ${anton.variable} ${oswald.variable}`}>
      <body className="bg-neutral-950 text-neutral-50 antialiased">
        <ToastProvider>
          <Suspense fallback={null}>
            <TopBar />
          </Suspense>
          <main className="pb-24 pt-4">
            {children}
          </main>
          <Suspense fallback={null}>
            <Navigation />
          </Suspense>
        </ToastProvider>
      </body>
    </html>
  )
}
