import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "./_ui/SiteHeader";
export const metadata: Metadata = {
  title: { default: "LiveCast — Discover", template: "%s · LiveCast" },
  description:
    "Explore independent broadcasts in music, design, and technology.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
