import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "Playra - Watch Videos",
  description: "A Playra-like video platform",
  icons: {
    icon: [
      { url: "/icon-512x512.png", type: "image/png", sizes: "512x512" },
      { url: "/icon-192x192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
};


import { getActiveProfile } from "@/app/actions/profile";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeProfile = await getActiveProfile();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
        <meta name="theme-color" content="#0f0f0f" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Playra" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-512x512.png" sizes="512x512" />
        <link rel="icon" type="image/png" href="/icon-192x192.png" sizes="192x192" />
        <link rel="shortcut icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="bg-[#0f0f0f] text-white selection:bg-blue-500/30" suppressHydrationWarning>
        <LayoutShell activeProfile={activeProfile}>{children}</LayoutShell>
      </body>
    </html>
  );
}
