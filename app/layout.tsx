import type { Metadata, Viewport } from "next"
import { Anton, Oswald } from "next/font/google"
import "./globals.css"
import Navigation from "@/components/Navigation"
import TopBar from "@/components/TopBar"
import { ToastProvider } from "@/components/Toast"
import { OfflineProvider } from "@/components/OfflineProvider"
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister"
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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Train with Dara",
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
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
          <OfflineProvider>
            <ServiceWorkerRegister />
            <Suspense fallback={null}>
              <TopBar />
            </Suspense>
            <main className="pb-24 pt-4">
              {children}
            </main>
            <Suspense fallback={null}>
              <Navigation />
            </Suspense>
          </OfflineProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
