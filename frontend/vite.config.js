import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api is proxied to production by default.
// Use a local backend with: API_PROXY=http://127.0.0.1:8000 npm start
const apiTarget = process.env.API_PROXY || "https://timestrolls.debtray.com";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // IPv4: `make phone` (adb reverse) reaches the Mac at 127.0.0.1, while
    // Vite's default "localhost" may listen on IPv6 (::1) only
    host: "127.0.0.1",
    // Allow localtunnel hosts for testing on a phone
    allowedHosts: [".loca.lt"],
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
  build: {
    outDir: "build",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
  },
});
