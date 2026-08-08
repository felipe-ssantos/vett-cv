/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// CSP aplicada SOMENTE no build de produção, via <meta>. Motivo: o `vercel dev`
// aplica os headers do vercel.json inclusive em desenvolvimento — um header CSP
// bloquearia o script inline do preamble do @vitejs/plugin-react (Fast Refresh)
// e o app não montaria na porta 3000. Em produção o build gera apenas scripts
// externos, então a CSP via <meta> é suficiente.
// Nota: `frame-ancestors` não funciona em <meta> — a proteção anti-clickjacking
// fica com o header `X-Frame-Options: DENY` (definido no vercel.json, que não
// interfere no dev).
const CSP_PRODUCAO = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function cspMeta(): Plugin {
  return {
    name: "vett-csp-meta",
    apply: "build",
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: CSP_PRODUCAO,
            },
            injectTo: "head-prepend",
          },
        ],
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), cspMeta()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
