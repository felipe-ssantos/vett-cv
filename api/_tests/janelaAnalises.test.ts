// @vitest-environment node
// O módulo é puro (Date), sem DOM — o ambiente node evita o jsdom desnecessário.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  JANELA_ANALISES_HORAS,
  inicioJanelaUtc,
  janelaAtualUtc,
  proximaLimiteJanelaUtc,
} from "../janelaAnalises.js";

afterEach(() => {
  vi.useRealTimers();
});

// Fixa o relógio do ambiente em um instante UTC exato (fake timers do vitest —
// as funções usam `new Date()` internamente).
function congelarEm(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe("janelaAtualUtc — bordas da janela de 3h", () => {
  it("usa o início da janela como chave (15h–17h59 → T15)", () => {
    congelarEm("2026-08-09T15:00:00.000Z");
    expect(janelaAtualUtc()).toBe("2026-08-09T15");

    congelarEm("2026-08-09T17:59:59.999Z");
    expect(janelaAtualUtc()).toBe("2026-08-09T15");
  });

  it("troca de janela exatamente às 18:00 UTC", () => {
    congelarEm("2026-08-09T17:59:59.999Z");
    expect(janelaAtualUtc()).toBe("2026-08-09T15");

    congelarEm("2026-08-09T18:00:00.000Z");
    expect(janelaAtualUtc()).toBe("2026-08-09T18");
  });

  it("cobre a virada do dia UTC (23:59 → T21, 00:00 → T00)", () => {
    congelarEm("2026-08-09T23:59:59.999Z");
    expect(janelaAtualUtc()).toBe("2026-08-09T21");

    congelarEm("2026-08-10T00:00:00.000Z");
    expect(janelaAtualUtc()).toBe("2026-08-10T00");
  });

  it(`gera as ${24 / JANELA_ANALISES_HORAS} janelas esperadas do dia`, () => {
    for (const hora of [0, 3, 6, 9, 12, 15, 18, 21]) {
      congelarEm(new Date(Date.UTC(2026, 7, 9, hora)).toISOString());
      expect(janelaAtualUtc()).toBe(
        `2026-08-09T${String(hora).padStart(2, "0")}`,
      );
    }
  });
});

describe("proximaLimiteJanelaUtc — quando a cota renova", () => {
  it("retorna o fim da janela atual dentro do mesmo dia", () => {
    congelarEm("2026-08-09T17:59:59.999Z");
    expect(proximaLimiteJanelaUtc()).toBe("2026-08-09T18:00:00.000Z");
  });

  it("cruza a meia-noite quando a janela é a última do dia", () => {
    congelarEm("2026-08-09T23:59:59.999Z");
    expect(proximaLimiteJanelaUtc()).toBe("2026-08-10T00:00:00.000Z");
  });

  it("é sempre estritamente maior que o momento atual", () => {
    const agora = new Date("2026-08-09T12:30:00.000Z");
    congelarEm(agora.toISOString());

    const proxima = new Date(proximaLimiteJanelaUtc());

    expect(proxima.getTime()).toBeGreaterThan(agora.getTime());
    expect(proxima.toISOString()).toBe("2026-08-09T15:00:00.000Z");
  });
});

describe("inicioJanelaUtc — alinhado com a chave gerada", () => {
  it("retorna a hora do início da janela (14:59 → 12h, 15:00 → 15h)", () => {
    expect(inicioJanelaUtc(new Date("2026-08-09T14:59:59.999Z"))).toBe(12);
    expect(inicioJanelaUtc(new Date("2026-08-09T15:00:00.000Z"))).toBe(15);
    expect(inicioJanelaUtc(new Date("2026-08-09T23:59:59.999Z"))).toBe(21);
    expect(inicioJanelaUtc(new Date("2026-08-10T00:00:00.000Z"))).toBe(0);
  });
});
