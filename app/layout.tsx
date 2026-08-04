import type { Metadata, Viewport } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { PwaInstallBanner } from "@/components/pwa/pwa-install-banner";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";

const sans = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
});

const display = Source_Serif_4({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "RideShare — Попутчики и грузоперевозки",
  description: "Сервис совместных поездок и попутных грузоперевозок",
  applicationName: "RideShare",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RideShare",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b6bcb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b3d6b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${sans.className} ${sans.variable} ${display.variable}`}>
        <Providers>
          <div className="page-shell relative flex min-h-screen flex-col">
            <Header />
            <main className="relative z-[1] w-full flex-1">{children}</main>
            <SiteFooter />
          </div>
          <PwaRegister />
          <PwaInstallBanner />
        </Providers>
      </body>
    </html>
  );
}
