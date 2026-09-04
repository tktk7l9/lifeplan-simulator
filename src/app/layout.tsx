import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SITE_URL } from "@/lib/site";

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "optional",
  preload: false,
});

export const viewport: Viewport = {
  themeColor: "#050c1a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "ライフプランシミュレーター",
    template: "%s | ライフプランシミュレーター",
  },
  description:
    "収入・支出・住宅・ライフイベント・投資を考慮した、100歳まで対応の日本向けライフプランシミュレーター。登録不要・無料。AIが総合評価を実施。",
  keywords: [
    "ライフプラン",
    "資産シミュレーション",
    "老後資金",
    "NISA",
    "iDeCo",
    "ファイナンシャルプランニング",
    "資産形成",
    "FP",
    "老後2000万円",
    "キャッシュフロー",
  ],
  authors: [{ name: "tktk7l9" }],
  creator: "tktk7l9",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL
  ),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL,
    siteName: "ライフプランシミュレーター",
    title: "ライフプランシミュレーター — 人生の山頂を目指そう",
    description:
      "収入・支出・住宅・ライフイベント・投資を考慮した、100歳まで対応の日本向けライフプランシミュレーター。登録不要・完全無料。",
  },
  twitter: {
    card: "summary_large_image",
    title: "ライフプランシミュレーター",
    description:
      "収入・支出・住宅・ライフイベント・投資を考慮した、100歳まで対応の日本向けライフプランシミュレーター。登録不要・完全無料。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  category: "finance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${jetBrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
        {/* Cloudflare Web Analytics（トークンは公開前提の識別子。秘密ではない） */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts --
            type="module" のスクリプトは仕様上 defer されるため、パーサーを止めない */}
        <script
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={'{"token": "cd156fbf0fd24da0a12e58fdb4e63828"}'}
        />
      </body>
    </html>
  );
}
