"use client";

import type { ReactNode } from "react";
import type { HomeServerIdentity } from "@home-server/contracts";
import { HomeServerShell } from "@home-server/shell";
import { ThemeProvider } from "next-themes";

export function AppLayoutView({ children, identity }: { children: ReactNode; identity: HomeServerIdentity | null }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      enableSystem={false}
      storageKey="download-manager-theme"
    >
      <HomeServerShell currentZone="downloads" identity={identity}>
        <main className="px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pt-12">{children}</main>
      </HomeServerShell>
    </ThemeProvider>
  );
}
