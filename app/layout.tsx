import type { Metadata } from "next";
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
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
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
      <body className="flex min-h-full w-full min-w-0 flex-col font-sans selection:bg-primary/30 selection:text-primary">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
