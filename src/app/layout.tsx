import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

/** Origen público: las imágenes Open Graph (WhatsApp, etc.) exigen URL absolutas. */
function metadataBase(): URL | undefined {
  const configured = process.env.APP_BASE_URL?.trim();
  if (!configured) return undefined;
  try {
    return new URL(configured);
  } catch {
    return undefined; // APP_BASE_URL inválida: se omite en lugar de romper todas las páginas.
  }
}

export const metadata: Metadata = {
  metadataBase: metadataBase(),
  title: "Katheryn & Edwin",
  description: "Invitación de matrimonio de Katheryn y Edwin",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${playfair.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
