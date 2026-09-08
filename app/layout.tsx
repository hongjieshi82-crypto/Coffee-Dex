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
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" }],
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
        <footer className="flex flex-col items-center gap-1 px-4 py-4 text-center text-[10px] text-white/35 sm:flex-row sm:justify-center sm:gap-2">
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" className="transition hover:text-white/60">
            京ICP备2026046201号-1
          </a>
          <span className="hidden text-white/20 sm:inline" aria-hidden="true">|</span>
          <a
            href="https://beian.mps.gov.cn/#/query/webSearch?code=11011502040709"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition hover:text-white/60"
          >
            <img src="/gongan-beian.png" alt="" width="13" height="13" />
            京公网安备11011502040709号
          </a>
        </footer>
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
