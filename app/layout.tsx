import type { Metadata, Viewport } from "next";
import { PwaInstallPrompt } from "@/app/PwaInstallPrompt";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Coffee-Dex",
  title: "Coffee-Dex | 职场咖啡图鉴",
  description: "你的职场续命咖啡百科，每一杯都是打工人的勋章",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Coffee-Dex",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#1a1612",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen">
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
