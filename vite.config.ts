import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const preset = process.env.NITRO_PRESET ?? "vercel";

// Only use the custom Cloudflare-shaped server entry for the cloudflare preset.
// On Vercel (and other Node-based presets), let Nitro generate its own entry so
// the function is invoked with the runtime's expected request shape.
const tanstackStart =
  preset === "cloudflare-module" || preset === "cloudflare"
    ? { server: { entry: "server" } }
    : undefined;

export default defineConfig({
  ...(tanstackStart ? { tanstackStart } : {}),
  nitro: { preset },
});
