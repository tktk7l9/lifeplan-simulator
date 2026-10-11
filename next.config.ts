import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./src/lib/csp";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // No window.open / cross-origin popups are used, so isolating the browsing context costs nothing.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    // Static baseline (src/lib/csp.ts). In production worker.ts replaces script-src
    // 'unsafe-inline' with a per-request nonce on every HTML response (src/lib/csp-nonce.ts).
    value: contentSecurityPolicy({ dev: isDev }),
  },
];

const nextConfig: NextConfig = {
  compress: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react", "@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-tabs"],
  },
};

export default nextConfig;
