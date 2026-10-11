// Cloudflare Web Analytics. Client-side module: keep it free of node: imports.
// The CSP allows this script origin and the POST target (src/lib/csp.ts);
// src/lib/__tests__/analytics.test.ts keeps them in sync.
export const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

/**
 * Site token. It is embedded in every page and visible to every visitor, so it is not a secret.
 * gitleaks flags 32-hex-digit strings as generic-api-key, so gitleaks:allow is placed on the
 * flagged line (a config file would also hide other, real secrets).
 */
export const BEACON_TOKEN = "cd156fbf0fd24da0a12e58fdb4e63828"; // gitleaks:allow
