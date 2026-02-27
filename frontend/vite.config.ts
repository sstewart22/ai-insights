import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { "@": resolve(__dirname, "src") } },
  server: {
    port: 8080, // change if 8080 is busy
    proxy: {
      "^/uiapi/": {
        target: process.env.API_BASE_URL || "http://localhost:3007",
        changeOrigin: true,
      },
      "^/health": {
        target: process.env.API_BASE_URL || "http://localhost:3007",
        changeOrigin: true,
      },
    },
  },
});
