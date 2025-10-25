import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import ThemeProvider from "@/components/theme/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "nof0 - AI 模型加密货币交易可视化",
  description: "用真实数据和清晰可视化，回答「哪个模型更会赚」的朴素问题。展示多个 AI 模型的加密货币交易表现对比。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      {/* Earliest possible theme resolution to avoid FOUC/mismatch */}
      <Script id="theme-init" strategy="beforeInteractive">
        {`(function(){
  try {
    var pref = localStorage.getItem('theme') || 'system';
    var sys = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    var resolved = pref === 'system' ? sys : pref;
    document.documentElement.dataset.theme = resolved;
  } catch (_) {}
})();`}
      </Script>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider />
        <div className="min-h-screen">
          <Header />
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
