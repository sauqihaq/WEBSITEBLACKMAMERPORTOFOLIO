import type { Metadata } from "next";
import { Navbar, Footer } from "@/components/site";
import { settings } from "@/lib/content";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/barlow-condensed/900.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/nothing-you-could-do/400.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: {
    default: "BLACKMAMERSTUDIO — Independent 3D Artist",
    template: "%s | BLACKMAMERSTUDIO",
  },
  description:
    "Independent 3D art, game assets, environments and digital experiences. Imagination, made real.",
  openGraph: {
    title: "BLACKMAMERSTUDIO",
    description: "Imagination, made real. Independent 3D art & digital assets.",
    images: ["/concept-helmet.png"],
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg" },
};
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await settings();
  return (
    <html
      lang="id"
      data-theme={site.theme}
      data-scroll-behavior="smooth"
      data-motion={site.motion}
    >
      <body
        id="top"
        style={
          {
            "--accent": site.accent,
            "--radius": site.radius + "px",
          } as React.CSSProperties
        }
      >
        <a className="skip-link" href="#main">
          Lewati ke konten
        </a>
        <Navbar brand={site.brand} />
        <main id="main">{children}</main>
        <Footer site={site} />
        {process.env.VERCEL && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
