import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeScript, ThemeSync } from "@/components/layout/theme";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Malone",
    template: "%s · Malone",
  },
  description: "Malone : tableau de bord analytique d'agence, branché sur l'API MyFeed.",
  // Outil interne : pas d'indexation par les moteurs de recherche.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Le contenu s'étend sous l'encoche ; les marges « safe-area » font le reste.
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Sombre par défaut. Le script ci-dessous retire la classe avant le premier
    // affichage si l'utilisateur a choisi le thème clair, d'où suppressHydrationWarning.
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeScript />
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
