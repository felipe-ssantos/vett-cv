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
  build: {
    rolldownOptions: {
      output: {
        // Chunks de vendor separados: react/react-dom e supabase ficam em
        // bundles próprios com hash estável, permitindo cache de longo prazo
        // no CDN enquanto o código da aplicação muda a cada deploy.
        manualChunks(id) {
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          if (id.includes("/node_modules/@supabase/")) {
            return "vendor-supabase";
          }
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // api/** cobre os testes dos módulos puros do back-end (ex.: bordas das
    // janelas de cota em api/janelaAnalises.test.ts).
    // scripts/** cobre as ferramentas de validação (ex.: verificar-segredos).
    include: [
      "src/**/*.test.{ts,tsx}",
      "api/**/*.test.{ts,tsx}",
      "scripts/**/*.test.mjs",
    ],
    // Cobertura de testes (v8). Executada localmente via `npm run test:coverage`
    // e no CI (job `quality`), que falha se os thresholds não forem atingidos.
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}", "api/**/*.ts", "scripts/**/*.mjs"],
      exclude: [
        "src/main.tsx",
        "src/test/**",
        "**/*.test.{ts,tsx,mjs}",
        "**/*.d.ts",
      ],
      // Pisos mínimos da suíte atual (medidos em 2026-08): o CI falha se a
      // cobertura cair abaixo destes valores (proteção contra regressões).
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
    },
  },
});
