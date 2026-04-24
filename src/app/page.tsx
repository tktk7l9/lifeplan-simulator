import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero3D } from "@/components/landing/Hero3D";
import { LandingReveal } from "@/components/landing/LandingReveal";

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
          <div className="lp-noise" style={{ opacity: 0.08 }} />

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

                <Link href="/simulator" className="lp-cta-btn">
                  無料でシミュレーション
                  <span className="lp-arr">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────── */}
      <section
        className="py-10 md:py-14 overflow-hidden"
        style={{ background: "var(--ink)", color: "var(--lp-cream)", borderTop: "1px solid rgba(253,248,239,.08)", borderBottom: "1px solid rgba(253,248,239,.08)" }}
      >
        <div className="lp-ticker flex gap-10 md:gap-16 whitespace-nowrap" aria-hidden>
          {[...Array(2)].map((_, di) => (
            <div key={di} className="flex gap-10 md:gap-16 items-center">
              {["100歳までの資産推移","たった5ステップ","完全無料","登録不要","AIがFP視点で総評","モンテカルロ10,000回"].map((t, i) => (
                <span key={i} className="flex items-center gap-10 md:gap-16">
                  <span className="font-black tracking-tight" style={{ fontSize: "clamp(22px,3vw,40px)" }}>{t}</span>
                  <span className="lp-mono" style={{ color: "var(--amber-400)" }}>✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── CONCERN ──────────────────────────────────────────── */}
      <section id="lp-concern" className="relative py-24 md:py-32 lp-topo">
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 relative">
          <div className="flex items-center gap-3 mb-6">
            <span className="lp-pill lp-mono" style={{ color: "var(--amber-800)" }}>01 / EMPATHY</span>
            <div className="h-px flex-1" style={{ background: "rgba(146,64,14,.2)" }} />
            <span className="lp-mono text-[11px]" style={{ color: "var(--ink-2)" }}>こんな不安、ありませんか？</span>
          </div>

          <h2 className="lp-display lp-display-lg mb-16 max-w-[20ch]" style={{ color: "var(--ink)", lineHeight: 1.3 }}>
            足元の霧が晴れないまま、<span style={{ color: "var(--amber-700)" }}>30年先</span>を歩いていく。
          </h2>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            <LandingReveal className="lp-paper-card p-7 md:p-8 relative lp-tilt-l">
              <span className="lp-tape" style={{ top: -10, left: 24, transform: "rotate(-6deg)" }} />
              <div className="lp-mono text-[11px] mb-3" style={{ color: "var(--amber-700)" }}>CONCERN · 01</div>
              <div className="font-black text-[22px] md:text-[26px] mb-4" style={{ lineHeight: 1.55 }}>
                「老後2000万円」、自分の場合はいくら要る？
              </div>
              <p className="text-[14px]" style={{ lineHeight: 2.05, color: "var(--ink-2)" }}>
                ニュースの数字は平均値。家族構成も住宅も違う自分の場合、当てはまるのか分からない。
              </p>
            </LandingReveal>

            <LandingReveal className="lp-paper-card p-7 md:p-8 relative">
              <span className="lp-tape" style={{ top: -10, right: 24, transform: "rotate(5deg)" }} />
              <div className="lp-mono text-[11px] mb-3" style={{ color: "var(--amber-700)" }}>CONCERN · 02</div>
              <div className="font-black text-[22px] md:text-[26px] mb-4" style={{ lineHeight: 1.55 }}>
                年金はもらえるのか、インフレで目減りしないか。
              </div>
              <p className="text-[14px]" style={{ lineHeight: 2.05, color: "var(--ink-2)" }}>
                制度も物価も動いていく。「今の暮らしを30年後に続けられるか」の手応えがほしい。
              </p>
            </LandingReveal>

            <LandingReveal className="lp-paper-card p-7 md:p-8 relative lp-tilt-r">
              <span className="lp-tape" style={{ top: -10, left: 40, transform: "rotate(3deg)" }} />
              <div className="lp-mono text-[11px] mb-3" style={{ color: "var(--amber-700)" }}>CONCERN · 03</div>
              <div className="font-black text-[22px] md:text-[26px] mb-4" style={{ lineHeight: 1.55 }}>
                住宅ローン・教育費・NISAを、全部つなげて考えられない。
              </div>
              <p className="text-[14px]" style={{ lineHeight: 2.05, color: "var(--ink-2)" }}>
                単品の計算アプリはあっても、人生全体の資金の流れを一枚絵で見られるツールが無い。
              </p>
            </LandingReveal>
          </div>

          <div className="mt-20 md:mt-28 flex flex-col md:flex-row items-start md:items-end gap-8">
            <div className="lp-display lp-display-md flex-1 max-w-[24ch]" style={{ lineHeight: 1.4, color: "var(--ink)" }}>
              見えないから、<span style={{ color: "var(--amber-700)" }}>備え</span>がずっと先送りになる。
            </div>
            <div className="lp-mono text-[12px] max-w-[30ch]" style={{ lineHeight: 2.0, color: "var(--ink-2)" }}>
              ※ 金融庁ワーキンググループ報告・総務省家計調査・<br />
              厚労省将来推計人口などを参考に、現実に即した試算モデルを実装しています。
            </div>
          </div>
        </div>
      </section>

      {/* ── SOLUTION ─────────────────────────────────────────── */}
      <section id="lp-solution" className="relative py-24 md:py-32 lp-stitch overflow-hidden" style={{ background: "var(--lp-cream)" }}>
        <div className="lp-noise" />
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 relative">
          <div className="flex items-center gap-3 mb-6">
            <span className="lp-pill lp-mono" style={{ color: "var(--amber-800)" }}>02 / SOLUTION</span>
            <div className="h-px flex-1" style={{ background: "rgba(146,64,14,.2)" }} />
            <span className="lp-mono text-[11px]" style={{ color: "var(--ink-2)" }}>このツールでできること</span>
          </div>

          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-start">
            <div className="md:col-span-7">
              <h2 className="lp-display lp-display-lg" style={{ color: "var(--ink)", lineHeight: 1.25 }}>
                人生まるごと、<span className="lp-underline-amber">1枚の地図</span>に。
              </h2>
              <p className="mt-8 text-[16px] md:text-[18px] max-w-[44ch]" style={{ lineHeight: 2.1, color: "var(--ink-2)" }}>
                収入・支出・住宅・ライフイベント・投資。<br />
                散らばっていた数字をひとつにまとめ、100歳までの資産残高を<b>1本の折れ線</b>で示します。
                ブレ幅も、売り切れそうな年齢も、全部一目で。
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <span className="lp-stamp">DATA-DRIVEN</span>
                <span className="lp-stamp" style={{ transform: "rotate(3deg)" }}>NO SIGN-UP</span>
                <span className="lp-stamp" style={{ transform: "rotate(-2deg)" }}>FREE FOREVER</span>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="lp-paper-card p-5 md:p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="lp-mono text-[11px]" style={{ color: "var(--amber-700)" }}>ASSET FORECAST / PREVIEW</div>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: "var(--amber-400)" }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: "var(--amber-600)" }} />
                    <span className="w-2 h-2 rounded-full" style={{ background: "var(--ink)" }} />
                  </div>
                </div>
                <svg viewBox="0 0 400 220" className="w-full">
                  <g stroke="rgba(146,64,14,.12)" strokeWidth="1">
                    <line x1="0" y1="40" x2="400" y2="40"/><line x1="0" y1="90" x2="400" y2="90"/>
                    <line x1="0" y1="140" x2="400" y2="140"/><line x1="0" y1="190" x2="400" y2="190"/>
                  </g>
                  <path d="M0,130 C60,90 120,70 180,55 S 280,40 360,70 L400,120 L400,200 L0,200 Z" fill="rgba(245,158,11,.15)"/>
                  <path d="M0,160 C60,140 120,125 180,110 S 280,110 360,140 L400,170 L400,200 L0,200 Z" fill="rgba(245,158,11,.25)"/>
                  <path d="M0,150 C60,115 120,95 180,80 S 280,75 360,100 L400,140" fill="none" stroke="#d97706" strokeWidth="3"/>
                  <line x1="0" y1="175" x2="400" y2="175" stroke="#78350f" strokeDasharray="3 5" strokeWidth="1"/>
                  <g fontFamily="JetBrains Mono,monospace" fontSize="9" fill="#78350f">
                    <text x="4" y="212">30</text><text x="100" y="212">50</text>
                    <text x="200" y="212">70</text><text x="300" y="212">85</text>
                    <text x="374" y="212">100</text>
                  </g>
                  <g transform="translate(210,77)">
                    <circle r="5" fill="#d97706" stroke="#fff" strokeWidth="2"/>
                    <path d="M0,-8 L0,-22" stroke="#1c1410" strokeWidth="1.5"/>
                    <path d="M0,-22 L14,-18 L10,-14 L14,-10 L0,-14 Z" fill="#d97706"/>
                  </g>
                </svg>
                <div className="grid grid-cols-3 gap-4 mt-5 pt-5" style={{ borderTop: "1px solid rgba(146,64,14,.15)" }}>
                  <div>
                    <div className="lp-mono text-[10px]" style={{ color: "var(--ink-2)" }}>PEAK</div>
                    <div className="font-black text-[20px]">¥84.2M</div>
                  </div>
                  <div>
                    <div className="lp-mono text-[10px]" style={{ color: "var(--ink-2)" }}>AT 90</div>
                    <div className="font-black text-[20px]">¥22.0M</div>
                  </div>
                  <div>
                    <div className="lp-mono text-[10px]" style={{ color: "var(--ink-2)" }}>SURVIVE</div>
                    <div className="font-black text-[20px]" style={{ color: "var(--amber-700)" }}>96%</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 lp-mono text-[11px] opacity-70" style={{ color: "var(--ink-2)" }}>※ ダミー数値。実際の画面は入力に応じて描画されます。</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="lp-features" className="relative py-24 md:py-32 overflow-hidden" style={{ background: "var(--ink)", color: "var(--lp-cream)" }}>
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.12 }} preserveAspectRatio="none" viewBox="0 0 1600 900">
          <g stroke="#fbbf24" fill="none" strokeWidth="1">
            {[700,650,600,550,500,450,400,350].map((y, i) => (
              <path key={i} d={`M0,${y} Q400,${y-100} 800,${y-50} T 1600,${y-80}`}/>
            ))}
          </g>
        </svg>

        <div className="max-w-[1400px] mx-auto px-5 md:px-10 relative">
          <div className="flex items-center gap-3 mb-6">
            <span className="lp-pill lp-mono" style={{ color: "var(--amber-300)" }}>03 / FEATURES</span>
            <div className="h-px flex-1" style={{ background: "rgba(253,211,77,.25)" }} />
            <span className="lp-mono text-[11px]" style={{ color: "var(--amber-300)" }}>他のツールと違うところ</span>
          </div>

          <h2 className="lp-display lp-display-lg max-w-[18ch]" style={{ lineHeight: 1.3 }}>
            地図だけじゃない。<span style={{ color: "var(--amber-400)" }}>天気予報</span>までついてくる。
          </h2>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mt-16">
            <div className="rounded-2xl p-7 relative overflow-hidden" style={{ border: "1px solid rgba(253,211,77,.25)" }}>
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="lp-mono text-[11px]" style={{ color: "var(--amber-300)" }}>FEATURE · 01</div>
                <span className="lp-mono text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap" style={{ border: "1px solid var(--amber-400)", color: "var(--amber-300)" }}>モンテカルロ</span>
              </div>
              <div className="font-black text-[26px] md:text-[30px] mb-6" style={{ lineHeight: 1.45 }}>1万通りの未来を試算</div>
              <svg viewBox="0 0 300 120" className="w-full mb-6">
                <g stroke="rgba(251,191,36,.15)" fill="none">
                  <path d="M0,80 C60,60 120,50 180,70 S 240,100 300,90"/>
                  <path d="M0,80 C60,70 120,40 180,55 S 240,60 300,70"/>
                  <path d="M0,80 C60,50 120,60 180,40 S 240,80 300,50"/>
                  <path d="M0,80 C60,80 120,70 180,85 S 240,40 300,30"/>
                  <path d="M0,80 C60,65 120,90 180,65 S 240,55 300,40"/>
                </g>
                <path d="M0,80 C60,65 120,55 180,55 S 240,55 300,55" stroke="#fbbf24" strokeWidth="2.5" fill="none"/>
              </svg>
              <p className="text-[14px] opacity-80" style={{ lineHeight: 2.05 }}>
                株価や金利の「上下のブレ」を1万回シミュレーション。「だいたい成功する確率」を％で教えてくれます。
              </p>
            </div>

            <div className="rounded-2xl p-7 relative overflow-hidden" style={{ border: "1px solid rgba(253,211,77,.25)" }}>
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="lp-mono text-[11px]" style={{ color: "var(--amber-300)" }}>FEATURE · 02</div>
                <span className="lp-mono text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap" style={{ border: "1px solid var(--amber-400)", color: "var(--amber-300)" }}>感度分析</span>
              </div>
              <div className="font-black text-[26px] md:text-[30px] mb-6" style={{ lineHeight: 1.45 }}>一番効くのは、どの一手？</div>
              <div className="space-y-2 mb-6">
                {[
                  { label: "投資利回り", w: 88, val: "+18%" },
                  { label: "月々の貯蓄", w: 64, val: "+12%" },
                  { label: "退職年齢",   w: 42, val: "+8%"  },
                  { label: "住宅購入",   w: 28, val: "−3%"  },
                ].map(({ label, w, val }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="lp-mono text-[11px] w-20 opacity-70">{label}</span>
                    <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(253,211,77,.1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${w}%`, background: "var(--amber-400)" }} />
                    </div>
                    <span className="lp-mono text-[11px] w-10 text-right">{val}</span>
                  </div>
                ))}
              </div>
              <p className="text-[14px] opacity-80" style={{ lineHeight: 2.05 }}>
                どの項目を変えるのが一番効くか、結果への影響度を自動で順位付け。「まず何を頑張ればいい?」が分かります。
              </p>
            </div>

            <div className="rounded-2xl p-7 relative overflow-hidden" style={{ border: "1px solid rgba(253,211,77,.25)", background: "rgba(253,211,77,.05)" }}>
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="lp-mono text-[11px]" style={{ color: "var(--amber-300)" }}>FEATURE · 03</div>
                <span className="lp-mono text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap" style={{ border: "1px solid var(--amber-400)", color: "var(--amber-300)" }}>AI / FP視点</span>
              </div>
              <div className="font-black text-[26px] md:text-[30px] mb-6" style={{ lineHeight: 1.45 }}>AIが隣で読み解く</div>
              <div className="space-y-2 mb-6 text-[12px]" style={{ lineHeight: 2.1 }}>
                <div className="rounded-xl px-3 py-2" style={{ background: "rgba(253,248,239,.08)" }}>
                  <div className="lp-mono text-[9px] mb-1" style={{ color: "var(--amber-300)" }}>AI ANALYSIS</div>
                  60歳時点で資産が大きく減る局面があります。退職金受取と住宅繰上返済を分散させると<span className="font-bold" style={{ color: "var(--amber-300)" }}>成功率が84%→92%</span>に改善します。
                </div>
                <div className="rounded-xl px-3 py-2 ml-6" style={{ background: "rgba(253,248,239,.08)" }}>
                  <div className="lp-mono text-[9px] mb-1" style={{ color: "var(--amber-300)" }}>ADVICE</div>
                  NISA枠を月2万増やすことが最も費用対効果が高いです。
                </div>
              </div>
              <p className="text-[14px] opacity-80" style={{ lineHeight: 2.05 }}>
                数字の意味、リスクのありか、次に打てる手。ファイナンシャルプランナーに相談するように、AIが総評してくれます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROUTE ────────────────────────────────────────────── */}
      <section id="lp-route" className="relative py-24 md:py-32 overflow-hidden" style={{ background: "var(--lp-cream-2)" }}>
        <div className="absolute inset-0 lp-topo opacity-60" />
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 relative">
          <div className="flex items-center gap-3 mb-6">
            <span className="lp-pill lp-mono" style={{ color: "var(--amber-800)" }}>04 / ROUTE</span>
            <div className="h-px flex-1" style={{ background: "rgba(146,64,14,.2)" }} />
            <span className="lp-mono text-[11px]" style={{ color: "var(--ink-2)" }}>5ステップ登山ルート</span>
          </div>

          <div className="grid md:grid-cols-12 gap-10 items-start">
            <div className="md:col-span-5">
              <h2 className="lp-display lp-display-lg" style={{ color: "var(--ink)", lineHeight: 1.3 }}>
                ベースキャンプから、<span style={{ color: "var(--amber-700)" }}>山頂</span>まで。
              </h2>
              <p className="mt-6 text-[16px] max-w-[36ch]" style={{ lineHeight: 2.1, color: "var(--ink-2)" }}>
                途中でやめても大丈夫。全部で<b>約5分</b>、ゆっくりでも10分。地図を描くだけなので、気負わず試してみてください。
              </p>
              <div className="mt-8 lp-paper-card p-5 flex items-center gap-4">
                <div className="lp-mono text-[10px]" style={{ color: "var(--amber-700)" }}>TOTAL TIME</div>
                <div className="font-black leading-none" style={{ fontSize: 44 }}>5<span className="text-[20px] ml-1">min</span></div>
                <div className="ml-auto lp-mono text-[11px]" style={{ color: "var(--ink-2)" }}>途中保存あり</div>
              </div>
            </div>

            <div className="md:col-span-7 relative">
              <div className="relative pl-16">
                <svg className="absolute left-4 top-0 h-full w-16" viewBox="0 0 60 600" preserveAspectRatio="none">
                  <path d="M30,20 Q 10,120 30,200 T 30,400 Q 50,500 30,580" stroke="#92400e" strokeWidth="3" strokeDasharray="2 8" fill="none"/>
                </svg>

                {[
                  { num: 1, elev: "BASE CAMP / 標高 0m", time: "約30秒", title: "基本情報を入れる", desc: "年齢、家族構成、今ある貯金。荷物チェックから始めます。", tilt: "lp-tilt-l", amber: false },
                  { num: 2, elev: "CAMP 1 / 標高 800m", time: "約1分", title: "収入と支出", desc: "月の手取りと暮らしのコスト。ざっくりでOK、あとで調整できます。", tilt: "lp-tilt-r", amber: false },
                  { num: 3, elev: "CAMP 2 / 標高 1,800m", time: "約1分", title: "住まいの設計", desc: "賃貸 or 購入。ローン残高、修繕費、将来の住み替え。生涯支出の大きな岩です。", tilt: "", amber: false },
                  { num: 4, elev: "CAMP 3 / 標高 2,800m", time: "約1分", title: "ライフイベント", desc: "結婚、出産、教育、介護、車の買替。時系列にプロットします。", tilt: "lp-tilt-l", amber: false },
                  { num: 5, elev: "SUMMIT / 標高 3,776m", time: "約1分", title: "投資方針 → 結果を見る", desc: "NISA・iDeCo・資産配分。ボタンを押すと、100歳までのグラフが山脈のように現れます。", tilt: "lp-tilt-r", amber: true },
                ].map(({ num, elev, time, title, desc, tilt, amber }) => (
                  <div key={num} className="relative mb-8 group">
                    <div
                      className="lp-num-badge absolute"
                      style={{ left: -64, top: 4, ...(amber ? { background: "var(--amber-600)" } : {}) }}
                    >
                      {num}
                    </div>
                    {amber && (
                      <div className="absolute" style={{ left: -64, top: -30 }}>
                        <svg width="28" height="46" viewBox="0 0 28 46">
                          <line x1="4" y1="46" x2="4" y2="6" stroke="#1c1410" strokeWidth="2"/>
                          <path d="M4,6 L26,10 L22,18 L26,26 L4,22 Z" fill="#d97706"/>
                        </svg>
                      </div>
                    )}
                    <div
                      className={`lp-paper-card p-6 transition-transform hover:translate-x-1 ${tilt}`}
                      style={amber ? { background: "var(--amber-50)" } : {}}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="lp-mono text-[11px]" style={{ color: "var(--amber-700)" }}>{elev}</span>
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full font-bold"
                          style={amber
                            ? { background: "var(--amber-600)", color: "var(--lp-cream)" }
                            : { background: "var(--amber-100)", color: "var(--amber-800)" }}
                        >
                          {time}
                        </span>
                      </div>
                      <div className="font-black text-[24px] mb-2" style={{ lineHeight: 1.5 }}>{title}</div>
                      <p className="text-[14px]" style={{ lineHeight: 2.0, color: "var(--ink-2)" }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BIG QUOTE ────────────────────────────────────────── */}
      <section className="py-24 md:py-36 relative overflow-hidden" style={{ background: "var(--lp-cream)" }}>
        <div className="lp-noise" />
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 relative">
          <div className="lp-mono text-[11px] mb-6" style={{ color: "var(--amber-700)" }}>— PHILOSOPHY</div>
          <div className="lp-display lp-display-lg max-w-[26ch]" style={{ color: "var(--ink)", lineHeight: 1.35 }}>
            山に登るのは、<span style={{ color: "var(--amber-700)" }}>見えなかった地形</span>が、はじめて見えるから。
          </div>
          <div className="mt-10 grid md:grid-cols-[1fr_auto] gap-6 items-end">
            <p className="text-[16px] max-w-[50ch]" style={{ lineHeight: 2.1, color: "var(--ink-2)" }}>
              未来のお金も同じです。入力して、地図にして、眺めてみる。それだけで<b>判断の足場</b>が生まれます。不安の正体が「漠然」から「数字」になる瞬間です。
            </p>
            <div className="lp-mono text-[11px] opacity-70 md:text-right" style={{ color: "var(--ink-2)" }}>
              LIFE PLAN SIMULATOR<br />— 2026 / BUILT IN TOKYO
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section id="lp-cta" className="relative py-28 md:py-40 overflow-hidden"
        style={{ background: "linear-gradient(180deg, var(--amber-500) 0%, var(--amber-600) 50%, var(--amber-800) 100%)" }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.3 }} viewBox="0 0 1200 800" preserveAspectRatio="none">
          <defs>
            <radialGradient id="cta-sun" cx="50%" cy="30%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="1"/>
              <stop offset="60%" stopColor="#fef3c7" stopOpacity="0"/>
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-sun)"/>
        </svg>
        <svg className="absolute bottom-0 left-0 w-full pointer-events-none" viewBox="0 0 1600 300" preserveAspectRatio="none" style={{ height: 220 }}>
          <path d="M0,300 L140,140 L260,200 L380,80 L540,200 L660,40 L820,200 L940,120 L1080,220 L1240,100 L1400,200 L1600,80 L1600,300 Z" fill="#3a2a1e" opacity=".55"/>
          <path d="M0,300 L120,200 L240,240 L380,180 L520,240 L660,160 L800,240 L940,200 L1080,260 L1240,200 L1400,260 L1600,200 L1600,300 Z" fill="#1c1410" opacity=".75"/>
        </svg>

        <div className="max-w-[1400px] mx-auto px-5 md:px-10 relative" style={{ color: "var(--lp-cream)" }}>
          <div className="lp-mono text-[11px] mb-6 tracking-widest opacity-80">— START CLIMBING</div>
          <h2 className="lp-display" style={{ fontSize: "clamp(46px,8.5vw,140px)", lineHeight: 1.2, color: "var(--lp-cream)" }}>
            さあ、<span style={{ color: "var(--amber-100)" }}>自分の地図</span>を描きはじめよう。
          </h2>
          <div className="mt-12 md:mt-16 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <Link
              href="/simulator"
              className="lp-cta-btn"
              style={{ background: "var(--lp-cream)", color: "var(--ink)", boxShadow: "0 14px 30px -10px rgba(0,0,0,.4), inset 0 0 0 2px var(--lp-cream)" }}
            >
              無料でシミュレーション
              <span className="lp-arr">→</span>
            </Link>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-bold opacity-90">
              {["完全無料","登録不要","約5分で完了","ブラウザだけでOK"].map(t => (
                <span key={t} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--lp-cream)" }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="lp-faq" className="py-20" style={{ background: "var(--ink)", color: "var(--lp-cream)" }}>
        <div className="max-w-[1400px] mx-auto px-5 md:px-10">
          <div className="lp-mono text-[11px] mb-6" style={{ color: "var(--amber-300)" }}>— FAQ</div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { q: "データはどこに保存されますか?", a: "入力内容はすべてブラウザ内(localStorage)にのみ保存されます。サーバーへの送信・収集はありません。" },
              { q: "試算モデルの根拠は?", a: "総務省家計調査・厚労省将来推計・金融庁報告書などの公開データをもとに、現実的な前提値を用いています。" },
              { q: "途中で止めても大丈夫?", a: "入力は自動保存されます。ブラウザを閉じても続きから再開できます。" },
              { q: "スマホでも使えますか?", a: "はい。モバイルファースト設計で、スマホ・タブレットからも快適に操作できます。" },
            ].map(({ q, a }) => (
              <div key={q}>
                <div className="font-black text-[20px] mb-2">{q}</div>
                <p className="text-[14px] opacity-75" style={{ lineHeight: 2.05 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t" style={{ background: "var(--ink)", color: "var(--lp-cream)", borderColor: "rgba(253,248,239,.08)" }}>
        <div className="max-w-[1400px] mx-auto px-5 md:px-10 py-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg width="24" height="24" viewBox="0 0 28 28" style={{ color: "var(--amber-400)" }}>
                  <path d="M2 22 L10 10 L15 16 L20 8 L26 22 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M2 22 L26 22" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span className="font-black text-[15px]">LifePlan / Summit</span>
              </div>
              <p className="text-[13px] max-w-[40ch]" style={{ opacity: 0.7, lineHeight: 2.05 }}>
                日本向けライフプランシミュレーター。100歳までの資産を、見晴らしのいい場所から確かめるための道具です。
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-[13px]">
              <div>
                <div className="lp-mono text-[10px] mb-3" style={{ color: "var(--amber-300)" }}>PRODUCT</div>
                <ul className="space-y-2 opacity-80">
                  <li><Link href="/simulator">シミュレーター</Link></li>
                  <li><a href="#lp-features">機能</a></li>
                  <li><a href="#lp-route">使い方</a></li>
                </ul>
              </div>
              <div>
                <div className="lp-mono text-[10px] mb-3" style={{ color: "var(--amber-300)" }}>ABOUT</div>
                <ul className="space-y-2 opacity-80">
                  <li><a href="#">試算モデルについて</a></li>
                  <li><a href="#">プライバシー</a></li>
                  <li><a href="#">利用規約</a></li>
                </ul>
              </div>
              <div>
                <div className="lp-mono text-[10px] mb-3" style={{ color: "var(--amber-300)" }}>CONTACT</div>
                <ul className="space-y-2 opacity-80">
                  <li>support@lifeplan.example</li>
                </ul>
              </div>
            </div>
          </div>
          <div
            className="mt-12 pt-6 flex flex-col md:flex-row justify-between gap-3 lp-mono text-[11px] opacity-60"
            style={{ borderTop: "1px solid rgba(253,248,239,.08)" }}
          >
            <div>© 2026 LifePlan / Summit. All rights reserved.</div>
            <div>本ツールは将来の成果を保証するものではありません。</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
