import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(
      process.env.BUILD_VERSION || Math.floor(Date.now() / 1000).toString()
    ),
  },
});