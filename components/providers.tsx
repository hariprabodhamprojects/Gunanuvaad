"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

/**
 * Client-side providers for the whole app.
 * Theme (light/dark) + toasts. Later phases can add data providers here.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}
