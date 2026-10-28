import type { Metadata } from "next";
import "./globals.css";
import { HUB_NAME } from "@/lib/campus";
import { currentTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: HUB_NAME,
  description: "Staff hub for the Maiden Ln and Early Years campuses.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await currentTheme();
  return (
    <html lang="en" data-theme={theme}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Figtree:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
