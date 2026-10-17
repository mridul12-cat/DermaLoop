import type { Metadata } from "next";
import "./globals.css";
import { MusicProvider } from "@/components/music-player";
import MotionPreferences from "@/components/motion-preferences";
export const metadata: Metadata = {
  title: "DermaLoop — Change less, choose better.",
  description:
    "A private skincare decision notebook. Understand your skin, question the noise, and learn what works.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement;d.dataset.motion=matchMedia("(prefers-reduced-motion: reduce)").matches||localStorage.getItem("dermaloop-motion")==="reduced"?"reduced":"full";d.dataset.contrast=localStorage.getItem("dermaloop-contrast")==="high"?"high":"default"}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <MotionPreferences />
        <MusicProvider>{children}</MusicProvider>
      </body>
    </html>
  );
}
