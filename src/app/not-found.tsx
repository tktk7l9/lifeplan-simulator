import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "ページが見つかりません",
};

/**
 * 404 page for unmatched URLs.
 * Replaces Next's default English page, which has no <main> landmark (axe: landmark-one-main, region)
 * and no way back. Plain wording and two exits back into the app (SHIG 11, 59, 60).
 */
export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16 bg-gradient-to-br from-orange-50 via-amber-50/50 to-yellow-50/30">
      <div className="max-w-md w-full text-center">
        <p className="text-sm font-semibold text-amber-800">404</p>
        <h1 className="mt-2 text-2xl font-black text-stone-900">ページが見つかりません</h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-700">
          URL が変わったか、ページが削除された可能性があります。
          入力した内容はこのブラウザに保存されているので、シミュレーターを開けば続きから再開できます。
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/simulator"
            className="inline-flex items-center justify-center min-h-11 px-5 rounded-xl bg-amber-700 text-white font-bold hover:bg-amber-800 transition-colors"
          >
            シミュレーターを開く
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-11 px-5 rounded-xl border-2 border-amber-200 bg-white text-amber-900 font-bold hover:bg-amber-50 transition-colors"
          >
            トップページへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
