import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
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
  authors: [{ name: "ライフプランシミュレーター" }],
  creator: "ライフプランシミュレーター",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://lifeplan-simulator.vercel.app"
  ),
  openGraph: {
    type: "website",
    locale: "ja_JP",
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
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
