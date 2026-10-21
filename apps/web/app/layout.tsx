import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fifa Tenkaichi 3",
  description: "Il gioco nuovo in Next.js, 3D e online (docs/PIANO-3D-ONLINE.md).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
