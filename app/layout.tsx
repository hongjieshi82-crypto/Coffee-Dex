import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coffee-Dex | 职场咖啡图鉴",
  description: "你的职场续命咖啡百科，每一杯都是打工人的勋章",
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
      </body>
    </html>
  );
}
