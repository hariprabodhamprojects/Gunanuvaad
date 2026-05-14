import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MananChintan",
  description: "Daily appreciation with your crew — points, streaks, private notes.",
  manifest: "/manifest.webmanifest",
  applicationName: "MananChintan",
  appleWebApp: {
    capable: true,
    title: "MananChintan",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

// Critical for mobile / PWA: without an explicit viewport, iOS Safari adds a
// 300 ms tap delay and shifts content under the notch. `viewportFit: "cover"`
// + the `env(safe-area-inset-*)` paddings in the shell handle the home bar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} h-full min-w-0 w-full antialiased`}
    >
      <body className="app-body flex min-h-full w-full min-w-0 flex-col font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
