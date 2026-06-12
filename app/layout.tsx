import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import { withBase } from "@/lib/base-path";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "World Cup 2026 · Resultados",
  description:
    "Sigue el Mundial 2026: tablas de grupos, eliminatorias y calendario en tiempo casi real.",
  applicationName: "World Cup 2026",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WC 2026",
  },
  icons: {
    icon: withBase("/icons/icon-192.png"),
    apple: withBase("/icons/icon-192.png"),
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SerwistProvider
          swUrl={withBase("/sw.js")}
          disable={process.env.NODE_ENV === "development"}
        >
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
