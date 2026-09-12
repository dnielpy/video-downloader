import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppLayoutContainer } from "@/src/modules/layout/containers/app-layout-container";
import "./globals.css";

export const metadata: Metadata = {
  title: "Download Manager",
  description: "A durable personal download manager powered by aria2.",
  icons: {
    icon: [{ url: "/download-manager-logo.svg", type: "image/svg+xml" }],
  },
  other: {
    "darkreader-lock": "true",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <AppLayoutContainer>{children}</AppLayoutContainer>
      </body>
    </html>
  );
}
