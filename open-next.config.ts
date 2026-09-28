import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Cache stays at the defaults. Neither ISR nor on-demand revalidate is used.
// https://opennext.js.org/cloudflare/caching
export default defineCloudflareConfig();
