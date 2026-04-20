import Link from "next/link";
import { MountainHero } from "@/components/illustrations/MountainHero";
import { HeroCanvasWrapper } from "@/components/three/HeroCanvasWrapper";
import { FloatingParticlesWrapper } from "@/components/three/FloatingParticlesWrapper";
import { CursorBirdWrapper } from "@/components/three/CursorBirdWrapper";
import { BirdHoverZone } from "@/components/three/BirdHoverZone";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <CursorBirdWrapper />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section
        className="relative flex flex-col items-center justify-center min-h-screen text-white overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #1a6eaa 0%, #3090ca 13%, #58b4e8 27%, #88d0f4 42%, #b4e2ff 55%, #ceecc0 68%, #ecd870 82%, #daa840 93%, #c88820 100%)",
        }}
      >
        {/* 3D scene */}
        <HeroCanvasWrapper />

        {/* Mountain + cloud SVG */}
        <MountainHero />

        {/* Text contrast overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/8 via-transparent to-black/20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#1e4020]/35 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto" style={{ marginTop: "-70px" }}>
          {/* Badge — short, factual value props */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold mb-8"
            style={{
              background: "rgba(0,0,0,0.22)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255,255,255,0.35)",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            登録不要・完全無料
          </div>

          {/* Heading */}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6 tracking-tight"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.35), 0 1px 6px rgba(0,0,0,0.25)" }}
          >
            あなたの人生の
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">山頂を目指そう</span>
              <svg
                className="absolute -bottom-1 left-0 w-full"
                viewBox="0 0 300 10"
                preserveAspectRatio="none"
                height="10"
              >
                <path
                  d="M 2 7 C 40 2 80 8 120 5 C 160 2 200 8 240 4 C 268 2 288 6 298 7"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeOpacity="0.80"
                />
              </svg>
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl text-white mb-10 max-w-2xl mx-auto leading-relaxed font-medium"
            style={{ textShadow: "0 1px 10px rgba(0,0,0,0.30)" }}
          >
            収入・支出・住宅・ライフイベント・投資を入力するだけで、
            <br className="hidden sm:block" />
            老後の資産がどう推移するか、100歳まで試算できます。
          </p>

          {/* Primary CTA large, secondary subdued — Fitts + Hick */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <BirdHoverZone action="excited">
              <Link
                href="/simulator"
                className="inline-flex items-center justify-center gap-2 bg-white text-amber-700 font-black text-lg rounded-full px-8 py-4 shadow-xl hover:bg-amber-50 transition-all duration-200 hover:scale-105 hover:shadow-2xl"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3L2 21h20L14 3l-3 6-3-6z" />
                </svg>
                無料でシミュレーション
              </Link>
            </BirdHoverZone>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/55 text-white font-semibold text-lg rounded-full px-8 py-4 hover:bg-white/15 transition-all duration-200"
            >
              機能を見る
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <BirdHoverZone action="pointing" className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="flex flex-col items-center gap-1 text-white/65 text-xs">
            <span className="tracking-widest">SCROLL</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-bounce"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </BirdHoverZone>
      </section>

      {/* ── KEY FACTS ─────────────────────────────────────── */}
      <section className="relative bg-amber-800 text-white py-10 overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-10"
          viewBox="0 0 1200 80"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <path
            d="M 0 80 L 150 20 L 300 55 L 450 10 L 600 40 L 750 5 L 900 35 L 1050 15 L 1200 45 L 1200 80 Z"
            fill="white"
          />
        </svg>
        <div className="relative max-w-5xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: "5 ステップ", label: "かんたん入力",           icon: "🗺️" },
            { value: "100 歳",   label: "まで資産シミュレーション", icon: "🏔️" },
            { value: "0 円",     label: "完全無料・登録不要",       icon: "✅" },
            { value: "AI",       label: "FP視点で総合評価",         icon: "🤖" },
          ].map((stat) => (
            <BirdHoverZone key={stat.label} action="surprised">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-3xl font-black text-yellow-300 mb-1">{stat.value}</div>
              <div className="text-white/70 text-sm">{stat.label}</div>
            </BirdHoverZone>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────── */}
      <section id="features" className="py-24 bg-amber-50/70">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-amber-700 font-semibold text-sm mb-3 tracking-wider uppercase">
              <svg width="40" height="12" viewBox="0 0 40 12">
                <path
                  d="M 2 6 L 10 2 L 18 7 L 26 3 L 34 6 L 38 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              特 徴
              <svg width="40" height="12" viewBox="0 0 40 12">
                <path
                  d="M 2 5 L 6 6 L 14 3 L 22 7 L 30 2 L 38 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-amber-900 mb-4 tracking-tight">
              3つの特徴
            </h2>
            <p className="text-amber-700/80 text-lg">精度・かんたん操作・わかりやすい結果表示</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                emoji: "🗺️",
                title: "現実的な試算モデル",
                description:
                  "日本の年金制度・教育費実態・住宅ローンのPMT計算など、実データに基づいた精度の高い試算を提供します。絵空事ではなく、あなたのリアルな将来を可視化。",
                accent: "#d97706",
              },
              {
                emoji: "🏕️",
                title: "かんたん5ステップ入力",
                description:
                  "スライダーで迷わず入力。収入・支出・住宅・ライフイベント・投資の5項目を順番に入力するだけで、複雑な計算が自動で完了します。",
                accent: "#f59e0b",
              },
              {
                emoji: "📡",
                title: "グラフ表示 & AI評価",
                description:
                  "資産推移・年別キャッシュフローをグラフで確認。どの時期に資産が危険水準に近づくかが一目でわかります。AIがFP視点で総合評価も実施。",
                accent: "#fbbf24",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border-2 border-amber-100 p-7 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 relative overflow-hidden"
                style={{ borderRadius: "4px 14px 4px 12px / 12px 4px 14px 4px" }}
              >
                <div
                  className="absolute top-0 left-6 right-6 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${f.accent}60, transparent)`,
                  }}
                />
                <svg
                  className="absolute top-0 right-0 opacity-8"
                  width="60"
                  height="60"
                  viewBox="0 0 60 60"
                >
                  <path d="M 60 0 L 0 60" stroke="#d97706" strokeWidth="1.5" />
                  <path d="M 60 20 L 20 60" stroke="#d97706" strokeWidth="1" />
                </svg>
                <div className="text-3xl mb-4">{f.emoji}</div>
                <h3 className="text-lg font-black text-amber-900 mb-3">{f.title}</h3>
                <p className="text-amber-800/70 leading-relaxed text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section className="py-24 bg-white relative overflow-hidden">
        <svg
          className="absolute bottom-0 left-0 w-full opacity-5"
          viewBox="0 0 1200 200"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden
        >
          <path
            d="M 0 200 L 200 60 L 400 130 L 600 20 L 800 90 L 1000 40 L 1200 100 L 1200 200 Z"
            fill="#d97706"
          />
        </svg>

        <div className="relative max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-amber-700 font-semibold text-sm mb-3 tracking-wider uppercase">
              ⛰️ 使い方
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-amber-900 mb-4 tracking-tight">
              5 ステップで完成
            </h2>
            <p className="text-amber-700/80">各ステップで情報を入力するだけ。AIがあなたの将来を試算します。</p>
          </div>

          <div className="relative">
            <div className="absolute left-8 top-4 bottom-4 w-0.5 border-l-2 border-dashed border-amber-300" />

            <div className="space-y-8">
              {[
                { num: "S",  label: "スタート — 基本情報",          desc: "年齢・家族構成",         icon: "🏕️" },
                { num: "1",  label: "ステップ 1 — 収入",            desc: "年収・上昇率の設定",     icon: "💴" },
                { num: "2",  label: "ステップ 2 — 支出",            desc: "月々の生活費・家賃",     icon: "🛒" },
                { num: "3",  label: "ステップ 3 — 住宅",            desc: "賃貸 or 購入の選択",     icon: "🏠" },
                { num: "4",  label: "ステップ 4 — ライフイベント",  desc: "結婚・車・旅行など",     icon: "🎉" },
                { num: "5",  label: "ステップ 5 — 投資・貯蓄",      desc: "NISA・iDeCo・利回り",   icon: "📈" },
                { num: "🏔", label: "結果 — 資産シミュレーション",   desc: "資産推移グラフ・AI総評", icon: "🏔️" },
              ].map((step, i) => (
                <BirdHoverZone
                  key={step.num}
                  action={i === 6 ? "celebrate" : "surprised"}
                  className="flex items-start gap-5 relative"
                >
                  <div
                    className={`relative z-10 flex-shrink-0 w-16 h-16 rounded-full flex flex-col items-center justify-center text-sm font-black shadow-sm border-2 ${
                      i === 6
                        ? "bg-amber-600 text-white border-amber-500 shadow-amber-300"
                        : "bg-white text-amber-700 border-amber-300"
                    }`}
                  >
                    <div className="text-xl">{step.icon}</div>
                    <div className="text-[10px] font-bold opacity-70">{step.num}</div>
                  </div>
                  <div className="pt-3">
                    <div className="font-black text-amber-900">{step.label}</div>
                    <div className="text-sm text-amber-700/70">{step.desc}</div>
                  </div>
                </BirdHoverZone>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section
        className="relative py-24 text-white overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #92400e 0%, #b45309 35%, #d97706 65%, #f59e0b 100%)",
        }}
      >
        <svg
          className="absolute inset-0 w-full h-full opacity-15"
          viewBox="0 0 1200 300"
          preserveAspectRatio="xMidYMax slice"
          aria-hidden
        >
          <path
            d="M 0 300 C 150 260 300 220 450 200 C 550 188 620 150 700 110 C 780 70 850 50 920 80 C 990 110 1060 150 1200 160 L 1200 300 Z"
            fill="white"
          />
          <path
            d="M 100 300 C 250 270 400 250 520 230 C 620 215 710 190 800 160 C 870 138 930 120 980 135 C 1040 152 1100 180 1200 200 L 1200 300 Z"
            fill="white"
            fillOpacity="0.4"
          />
        </svg>

        <FloatingParticlesWrapper count={25} opacity={0.12} />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="text-5xl mb-6">🏔️</div>
          <h2
            className="text-3xl sm:text-4xl font-black mb-6 tracking-tight"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
          >
            老後の資産、一緒に確認しよう
          </h2>
          <p
            className="text-white text-lg mb-10 leading-relaxed font-medium"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.20)" }}
          >
            登録不要・完全無料。
            <br />
            あなたの将来の資産がどうなるか、今すぐ試算できます。
          </p>
          {/* Same label as hero CTA — 一貫性 */}
          <BirdHoverZone action="excited">
            <Link
              href="/simulator"
              className="inline-flex items-center justify-center gap-3 bg-white text-amber-700 font-black text-xl rounded-full px-10 py-5 shadow-2xl hover:bg-amber-50 transition-all duration-200 hover:scale-105"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 3L2 21h20L14 3l-3 6-3-6z" />
              </svg>
              無料でシミュレーション
            </Link>
          </BirdHoverZone>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-amber-950 text-amber-300/70 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div>
              <div className="flex items-center gap-2 text-white font-black text-lg mb-1">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber-400"
                >
                  <path d="M8 3L2 21h20L14 3l-3 6-3-6z" />
                </svg>
                ライフプランシミュレーター
              </div>
              <div className="text-sm">人生の山頂を、一緒に目指そう</div>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a>
              <a href="#" className="hover:text-white transition-colors">利用規約</a>
              <a href="#" className="hover:text-white transition-colors">お問い合わせ</a>
            </div>
          </div>
          <div className="border-t border-amber-900 mt-8 pt-8 text-center text-sm">
            &copy; {new Date().getFullYear()} ライフプランシミュレーター. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
