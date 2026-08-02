import type { Metadata } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
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
        </Providers>
      </body>
    </html>
  );
}
