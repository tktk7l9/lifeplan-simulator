/**
 * サイトの正規 URL の既定値。
 *
 * metadataBase / OGP がここを参照する。NEXT_PUBLIC_SITE_URL が設定されていれば
 * そちらが優先される（ビルド時にインライン化される点に注意）。
 *
 * 2026-08-16 に Vercel (lifeplan-simulator.vercel.app) から Cloudflare Workers
 * へ移行。Vercel 側は Fair Use 超過でアカウントごと 402 になっており、旧 URL を
 * canonical に残すと死んだページを正規扱いさせてしまう。
 */
export const SITE_URL = "https://lifeplan-simulator.saitotakuya0719.workers.dev";
