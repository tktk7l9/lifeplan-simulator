"use client";

import { useEffect } from "react";
import { BEACON_SRC, BEACON_TOKEN } from "@/lib/analytics";

/**
 * Appends the Cloudflare Web Analytics beacon after hydration instead of a <script src> in the
 * HTML. An external script in the markup without `integrity` costs the Observatory
 * subresource-integrity test, and SRI cannot be pinned here: Cloudflare swaps the content behind
 * the unversioned beacon.min.js URL, so an `integrity` attribute would silently stop the beacon
 * on its next update. Never add one. The CSP still allows the beacon's origins (src/lib/csp.ts).
 */
export function Analytics() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (document.querySelector(`script[src="${BEACON_SRC}"]`)) return;
    const beacon = document.createElement("script");
    beacon.type = "module";
    beacon.src = BEACON_SRC;
    beacon.dataset.cfBeacon = JSON.stringify({ token: BEACON_TOKEN });
    document.body.appendChild(beacon);
  }, []);
  return null;
}
