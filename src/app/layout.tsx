import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "DermaLoop — Change less, choose better.",
  description:
    "A private skincare decision notebook. Understand your skin, question the noise, and learn what works.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
