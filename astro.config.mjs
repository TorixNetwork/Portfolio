import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

const site = process.env.SITE_URL || "https://torixnetwork.com";
const pathFromRoot = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  site,
  output: "static",
  integrations: [sitemap()],
  build: {
    assets: "_assets"
  },
  vite: {
    resolve: {
      alias: {
        "@components": pathFromRoot("./src/components"),
        "@config": pathFromRoot("./src/config"),
        "@data": pathFromRoot("./src/data"),
        "@layouts": pathFromRoot("./src/layouts"),
        "@sections": pathFromRoot("./src/sections"),
        "@styles": pathFromRoot("./src/styles")
      }
    },
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("three")) return "hero-scene";
          }
        }
      }
    }
  }
});
