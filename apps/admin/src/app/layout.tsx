import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { AdminShell } from "@/components/admin-shell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Neojapan Panel", template: "%s | Neojapan Panel" },
  description:
    "Panel de gestión de Neojapan — inventario, POS, pedidos y reportes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={[
          inter.variable,
          spaceGrotesk.variable,
          jetBrainsMono.variable,
          "min-h-screen font-sans text-gray-100 antialiased",
        ].join(" ")}
      >
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
