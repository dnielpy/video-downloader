"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AppBar } from "@/src/modules/layout/components/app-bar";

export function AppLayoutView({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      enableSystem={false}
      storageKey="download-manager-theme"
    >
      <div className="min-h-screen bg-background">
        <AppBar />
        <main className="px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12">{children}</main>
      </div>
    </ThemeProvider>
  );
}
