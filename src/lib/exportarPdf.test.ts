import { describe, expect, it } from "vitest";
import { analiseFixture } from "../test/fixtures";
import type { Analise } from "../types";
import { montarPdfHistorico } from "./exportarPdf";

describe("montarPdfHistorico", () => {
  it("gera um arquivo PDF válido com o histórico estruturado", async () => {
    const doc = await montarPdfHistorico([analiseFixture]);
    const saida = doc.output("arraybuffer");
    const bytes = new Uint8Array(saida);
    // Assinatura "%PDF-" no início do arquivo.
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("quebra em várias páginas quando o histórico é grande", async () => {
    const muitasAnalises: Analise[] = Array.from({ length: 30 }, (_, i) => ({
      ...analiseFixture,
      id: `id-${i}`,
      titulo_vaga: `Vaga de Teste ${i}`,
    }));

    const doc = await montarPdfHistorico(muitasAnalises);

    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it("não quebra com um histórico vazio", async () => {
    const doc = await montarPdfHistorico([]);
    const saida = doc.output("arraybuffer");
    const bytes = new Uint8Array(saida);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });
});
