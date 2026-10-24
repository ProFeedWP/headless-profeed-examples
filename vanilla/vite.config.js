import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        layouts: resolve(import.meta.dirname, "layouts/index.html"),
        connected: resolve(import.meta.dirname, "layouts/connected.html"),
      },
    },
  },
});
