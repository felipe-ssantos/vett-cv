import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "vitest-axe/matchers";
import { afterEach, beforeEach, expect } from "vitest";

expect.extend({ toHaveNoViolations });

// O jsdom não carrega o index.html; garante as precondições das regras
// document-title e html-has-lang do axe.
beforeEach(() => {
  document.documentElement.lang = "pt-BR";
  document.title = "Vett — Análise de compatibilidade profissional";
});

afterEach(() => {
  cleanup();
});
