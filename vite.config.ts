/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * XOR-obfuscate the Gemini key so it doesn't appear as plain text in the
 * bundle.  Must mirror the `deobfuscate` function in src/utils/apiKey.ts.
 */
function obfuscateKey(key: string): string {
  const salt = "TeamShuffleAI";
  const xored = key
    .split("")
    .map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))
    )
    .join("");
  return Buffer.from(xored, "binary").toString("base64");
}

const rawKey = process.env.VITE_GEMINI_KEY || "";
const proxyUrl = process.env.VITE_AI_PROXY_URL || "";

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
    __GEMINI_KEY_OBF__: JSON.stringify(rawKey ? obfuscateKey(rawKey) : ""),
    __AI_PROXY_URL__: JSON.stringify(proxyUrl),
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
