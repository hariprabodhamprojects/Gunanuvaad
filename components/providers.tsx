"use client";

import * as React from "react";
import { PwaShellRefresh } from "@/components/pwa-shell-refresh";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

/**
 * Client-side providers for the whole app.
 * Theme (light/dark) + toasts. Later phases can add data providers here.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <PwaShellRefresh />
      {children}
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  );
}
