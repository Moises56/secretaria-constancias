import "./globals.css";

import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme/ThemeProvider";

import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Fraunces — serif contemporáneo con eco institucional. Usada solo en
// títulos para evocar la gravitas del papel membretado oficial.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: {
    default: "Constancias AMDC",
    template: "%s · Constancias AMDC",
  },
  description:
    "Sistema interno de la Secretaría Municipal del Distrito Central para emitir Constancias de Vecindad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-HN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full w-full max-w-[100vw] flex-col overflow-x-hidden">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
