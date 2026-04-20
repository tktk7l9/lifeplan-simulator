# 🏔️ ライフプランシミュレーター

収入・支出・住宅・ライフイベント・投資を入力するだけで、老後（100歳まで）の資産推移をシミュレーションできる日本向けWebアプリです。完全無料・登録不要。

## 主な機能

- **7ステップ入力**（登山テーマ）: 基本情報・収入・支出・住宅・ライフイベント・投資・保険を順番に入力
- **詳細な税計算**: 所得税・住民税・社会保険料・住宅ローン控除・配偶者控除・扶養控除・青色申告控除を反映した手取り計算
- **投資シミュレーション**: NISA（生涯枠1,800万管理）・iDeCo・企業型DC・課税口座を月次複利で計算
- **年金概算**: 厚生年金＋国民年金を就労年数・平均年収から試算
- **モンテカルロシミュレーション**: 400回の確率的シミュレーションで破産確率を算出
- **感度分析（トルネードチャート）**: 各パラメータが資産に与える影響をランキング表示
- **AI総評**: Claude APIによるFP視点のスコア＆ランク評価（S〜F）
- **シナリオ比較**: 保守・標準・楽観の3ケース比較
- **データインポート**: ねんきんネットCSV・MoneyForward CSVに対応
- **PDF出力**: 印刷用レポート生成
- **シミュレーション保存**: 複数プランをローカルに保存・比較

## 技術スタック

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 + Radix UI |
| 3D演出 | Three.js |
| グラフ | Recharts |
| フォーム | React Hook Form + Zod |
| 状態管理 | Zustand（localStorage永続化） |
| AI | Anthropic SDK（Claude API） |

## セットアップ

```bash
npm install
```

`.env.local` を作成して Anthropic API キーを設定:

```
ANTHROPIC_API_KEY=your_api_key_here
```

開発サーバーを起動:

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開く。

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `ANTHROPIC_API_KEY` | AI総評機能に必要（[Anthropic Console](https://console.anthropic.com/)で取得） |

## ライセンス

MIT
