import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SimProvider } from "@/components/SimProvider";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Control Tower Inteligente · Contingencias Logísticas",
  description:
    "MVP de torre de control logística inteligente para gestión de contingencias — operación simulada de transporte terrestre.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <SimProvider>
          <AppShell>{children}</AppShell>
        </SimProvider>
      </body>
    </html>
  );
}
