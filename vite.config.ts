// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// Cloudflare plugin is disabled here because we deploy to Vercel.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Disable the Cloudflare Workers build plugin — we target Vercel instead.
  cloudflare: false,
  tanstackStart: {
    // Build for Vercel's serverless output (.vercel/output/).
    target: "vercel",
    // Keep our SSR error wrapper as the server entry.
    server: { entry: "server" },
  },
});
