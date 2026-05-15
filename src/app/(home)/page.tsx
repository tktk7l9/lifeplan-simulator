import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero3D } from "@/components/landing/Hero3D";
import { BelowFoldLoader } from "@/components/landing/BelowFoldLoader";

export default function Home() {
  return (
    <div className="lp-root">
      {/* ── NAV ──────────────────────────────────────────────── */}
      <LandingNav />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="lp-hero-viewport" id="lp-hero">
        <div className="lp-hero-sticky">
          <Hero3D />
          <div className="lp-hero-scrim" />

          <div
            className="lp-hero-content"
            style={{
              position: "absolute", left: 0, right: 0, top: 0, height: "100vh",
              display: "flex", flexDirection: "column", justifyContent: "center",
              paddingTop: 72, paddingBottom: 32,
            }}
          >
            <div className="max-w-[1400px] mx-auto w-full px-5 md:px-10 relative">
              {/* Altimeter — desktop only */}
              <div className="hidden lg:block absolute right-10 top-0">
                <div className="lp-mono text-[11px] opacity-70 mb-1">ALTITUDE / 現在の到達度</div>
                <div className="font-black leading-none" style={{ fontSize: "clamp(40px,5vw,72px)" }}>
                  <span>0,120</span><span className="lp-amber-accent">m</span>
                </div>
                <div className="mt-3 h-1.5 w-[200px] rounded-full overflow-hidden" style={{ background: "rgba(28,20,16,.12)" }}>
                  <div className="h-full rounded-full" style={{ width: "6%", background: "var(--amber-600)" }} />
                </div>
                <div className="lp-mono text-[10px] mt-2 opacity-60">TARGET 3,776m / AGE 100</div>
              </div>

              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <span className="lp-pill lp-mono" style={{ color: "var(--amber-800)" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--amber-600)" }} />
                  LIFE PLAN SIMULATOR / 2026
                </span>
                <span className="lp-mono text-[11px] opacity-70 hidden md:inline" style={{ color: "var(--ink-2)" }}>完全無料・登録不要</span>
              </div>

              <h1 className="lp-display lp-display-xl" style={{ lineHeight: 1.2 }}>
                <span className="block">老後の資産を、</span>
                <span className="block"><span className="lp-underline-amber">見晴らしのいい場所</span>から</span>
                <span className="block lp-amber-accent">確かめよう。</span>
              </h1>

              <div className="mt-6 md:mt-10 grid md:grid-cols-[auto_1fr_auto] gap-5 md:gap-12 items-end">
                <p className="lp-hero-sub text-[15px] md:text-[17px] max-w-[42ch]" style={{ lineHeight: 2.1, color: "var(--ink-2)" }}>
                  収入・支出・住宅・投資を5ステップ入力するだけ。100歳までの資産推移を、グラフとAIが一緒に読み解きます。
                </p>

                <div className="hidden md:flex items-center gap-4" style={{ color: "var(--ink-2)" }}>
                  <div className="h-px flex-1" style={{ background: "rgba(28,20,16,.2)" }} />
                  <div className="lp-mono text-[11px] tracking-widest">SCROLL TO CLIMB</div>
                  <div className="animate-bounce lp-mono text-[14px]">↓</div>
                </div>

                <Link href="/simulator" prefetch={false} className="lp-cta-btn">
                  無料でシミュレーション
                  <span className="lp-arr">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BelowFoldLoader />

    </div>
  );
}
