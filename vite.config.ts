import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { portfolioDevApi } from "./server/dev-api";

export default defineConfig(({ mode }) => ({
  // Server credentials stay in this Node configuration; only VITE_ values reach browser code.
  plugins: [react(), portfolioDevApi({ ...loadEnv(mode, process.cwd(), ""), ...process.env })],
  base: process.env.VITE_BASE || "/",
  build: { chunkSizeWarningLimit: 1200 },
}));
